import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import { db, transaction } from "./db.js";
import { migrate } from "./migrate.js";
const app = express(),
  port = Number(process.env.PORT || 8000),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
async function audit(
  client,
  userId,
  action,
  entityType,
  entityId = null,
  metadata = {},
) {
  await client.query(
    "insert into audit_log(user_id,action,entity_type,entity_id,metadata) values($1,$2,$3,$4,$5)",
    [userId, action, entityType, entityId, metadata],
  );
}
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.accesshub_session;
    if (!token)
      return res.status(401).json({ error: "Authentication required" });
    const { rows } = await db.query(
      `select u.id,u.username,u.full_name,u.email,u.phone,u.position_title,u.role from sessions s join users u on u.id=s.user_id where s.id_hash=$1 and s.expires_at>now() and u.active`,
      [hash(token)],
    );
    if (!rows[0]) return res.status(401).json({ error: "Session expired" });
    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}
const admin = (req, res, next) =>
  req.user.role === "admin"
    ? next()
    : res.status(403).json({ error: "Administrator access required" });
const fileManager = (req, res, next) =>
  req.user.role === "admin" || req.user.position_title === "Supervisor"
    ? next()
    : res
        .status(403)
        .json({ error: "Supervisor or administrator access required" });
const uploadsDir = process.env.CLOUDRON
  ? "/app/data/uploads"
  : path.join(root, "work", "uploads");
const mailTransport = process.env.CLOUDRON_MAIL_SMTP_SERVER
  ? nodemailer.createTransport({
      host: process.env.CLOUDRON_MAIL_SMTP_SERVER,
      port: Number(process.env.CLOUDRON_MAIL_SMTP_PORT || 587),
      secure: Number(process.env.CLOUDRON_MAIL_SMTP_PORT) === 465,
      auth: {
        user: process.env.CLOUDRON_MAIL_SMTP_USERNAME,
        pass: process.env.CLOUDRON_MAIL_SMTP_PASSWORD,
      },
    })
  : null;
app.get("/healthz", async (_req, res) => {
  await db.query("select 1");
  res.json({ ok: true });
});
app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  async (req, res) => {
    const username = String(req.body.username || "").trim(),
      password = String(req.body.password || "");
    const { rows } = await db.query(
      "select * from users where lower(username)=lower($1) and active",
      [username],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: "Invalid username or password" });
    const token = crypto.randomBytes(32).toString("base64url");
    await transaction(async (c) => {
      await c.query(
        "insert into sessions(id_hash,user_id,expires_at) values($1,$2,now()+interval '12 hours')",
        [hash(token), user.id],
      );
      await audit(c, user.id, "login", "session");
    });
    res.cookie("accesshub_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 12 * 60 * 60_000,
      path: "/",
    });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        position_title: user.position_title,
      },
    });
  },
);
app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const token = req.cookies.accesshub_session;
  await db.query("delete from sessions where id_hash=$1", [hash(token)]);
  res.clearCookie("accesshub_session", { path: "/" });
  res.status(204).end();
});
app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));
app.post("/api/me/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8)
    return res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
  const { rows } = await db.query(
    "select password_hash from users where id=$1",
    [req.user.id],
  );
  if (
    !rows[0] ||
    !(await bcrypt.compare(currentPassword, rows[0].password_hash))
  )
    return res.status(400).json({ error: "Current password is incorrect" });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await transaction(async (c) => {
    await c.query(
      "update users set password_hash=$1,updated_at=now() where id=$2",
      [passwordHash, req.user.id],
    );
    await audit(c, req.user.id, "change_password", "user", req.user.id);
  });
  res.status(204).end();
});
app.get("/api/bootstrap", requireAuth, async (req, res) => {
  const canManage =
    req.user.role === "admin" || req.user.position_title === "Supervisor";
  const [g, l, u, t] = await Promise.all([
    db.query(
      "select id,property,address,access_type as type,gate_code as code,contact,notes,status,created_by from gate_codes where status='approved' or created_by=$1 or $2::boolean order by property",
      [req.user.id, canManage],
    ),
    db.query(
      "select id,property,address,access_method as access,location_notes as location,latitude as lat,longitude as lng,status,created_by from lockboxes where status='approved' or created_by=$1 or $2::boolean order by property",
      [req.user.id, canManage],
    ),
    db.query(
      "select u.id,u.username,u.full_name as name,u.email,u.phone,u.position_title as role,u.role as access_role,u.supervisor_id,s.full_name as supervisor from users u left join users s on s.id=u.supervisor_id where u.active order by u.full_name",
    ),
    db.query("select id,name from position_titles order by name"),
  ]);
  res.json({
    gates: g.rows,
    locks: l.rows,
    people: u.rows,
    positionTitles: t.rows,
  });
});
app.get("/api/search", requireAuth, async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json([]);
  const pattern = `%${query}%`;
  const canManage =
    req.user.role === "admin" || req.user.position_title === "Supervisor";
  const [gates, locks, users, messages, files, links] = await Promise.all([
    db.query(
      "select id,property as title,address as subtitle from gate_codes where (status='approved' or created_by=$1 or $2::boolean) and concat_ws(' ',property,address,gate_code,contact,notes) ilike $3 order by property limit 8",
      [req.user.id, canManage, pattern],
    ),
    db.query(
      "select id,property as title,concat_ws(' · ',address,location_notes) as subtitle from lockboxes where (status='approved' or created_by=$1 or $2::boolean) and concat_ws(' ',property,address,access_method,location_notes) ilike $3 order by property limit 8",
      [req.user.id, canManage, pattern],
    ),
    db.query(
      "select id,full_name as title,concat_ws(' · ',position_title,email,phone) as subtitle from users where active and concat_ws(' ',full_name,username,position_title,email,phone) ilike $1 order by full_name limit 8",
      [pattern],
    ),
    db.query(
      "select m.id,s.full_name as title,m.body as subtitle from messages m join users s on s.id=m.sender_id where (m.sender_id=$1 or m.recipient_id=$1 or m.recipient_id is null) and concat_ws(' ',s.full_name,m.body) ilike $2 order by m.created_at desc limit 8",
      [req.user.id, pattern],
    ),
    db.query(
      "select id,title,concat_ws(' · ',original_name,notes) as subtitle from files where concat_ws(' ',title,original_name,notes) ilike $1 order by uploaded_at desc limit 8",
      [pattern],
    ),
    db.query(
      "select id,title,concat_ws(' · ',url,notes) as subtitle from links where concat_ws(' ',title,url,notes) ilike $1 order by updated_at desc limit 8",
      [pattern],
    ),
  ]);
  const tagged = (rows, kind, page) =>
    rows.map((row) => ({ ...row, kind, page }));
  res.json([
    ...tagged(gates.rows, "Gate code", "Gate Codes"),
    ...tagged(locks.rows, "Lockbox", "Lockboxes & Keys"),
    ...tagged(users.rows, "User", "Directory"),
    ...tagged(messages.rows, "Message", "Messages"),
    ...tagged(files.rows, "File", "Files"),
    ...tagged(links.rows, "Link", "Links"),
  ]);
});
app.post("/api/users", requireAuth, fileManager, async (req, res) => {
  const {
    username,
    password,
    fullName,
    email,
    phone,
    positionTitle,
    supervisorId,
  } = req.body;
  if (!username || !password || !fullName || !positionTitle)
    return res.status(400).json({ error: "Required user fields are missing" });
  if (String(password).length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  const passwordHash = await bcrypt.hash(String(password), 12);
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "insert into users(username,password_hash,full_name,email,phone,position_title,supervisor_id,role) values($1,$2,$3,$4,$5,$6,$7,'user') returning id,username,full_name as name,email,phone,position_title as role,role as access_role,supervisor_id",
      [
        String(username).trim(),
        passwordHash,
        String(fullName).trim(),
        email || null,
        phone || null,
        positionTitle,
        supervisorId || null,
      ],
    );
    await audit(c, req.user.id, "create", "user", rows[0].id);
    return rows[0];
  });
  res.status(201).json(result);
});
app.put("/api/users/:id", requireAuth, fileManager, async (req, res) => {
  const { fullName, email, phone, positionTitle, supervisorId } = req.body;
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "update users set full_name=$1,email=$2,phone=$3,position_title=$4,supervisor_id=$5,updated_at=now() where id=$6 and active returning id,username,full_name as name,email,phone,position_title as role,role as access_role,supervisor_id",
      [
        fullName,
        email || null,
        phone || null,
        positionTitle,
        supervisorId || null,
        req.params.id,
      ],
    );
    if (!rows[0]) return null;
    await audit(c, req.user.id, "update", "user", req.params.id);
    return rows[0];
  });
  if (!result) return res.status(404).json({ error: "User not found" });
  res.json(result);
});
app.post("/api/position-titles", requireAuth, fileManager, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name)
    return res.status(400).json({ error: "Position title is required" });
  const { rows } = await db.query(
    "insert into position_titles(name) values($1) returning id,name",
    [name],
  );
  res.status(201).json(rows[0]);
});
app.put(
  "/api/position-titles/:id",
  requireAuth,
  fileManager,
  async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name)
      return res.status(400).json({ error: "Position title is required" });
    const result = await transaction(async (c) => {
      const current = await c.query(
        "select name from position_titles where id=$1",
        [req.params.id],
      );
      if (!current.rows[0]) return null;
      const { rows } = await c.query(
        "update position_titles set name=$1,updated_at=now() where id=$2 returning id,name",
        [name, req.params.id],
      );
      await c.query(
        "update users set position_title=$1 where position_title=$2",
        [name, current.rows[0].name],
      );
      await audit(c, req.user.id, "update", "position_title", req.params.id);
      return rows[0];
    });
    if (!result)
      return res.status(404).json({ error: "Position title not found" });
    res.json(result);
  },
);
app.post("/api/gates", requireAuth, async (req, res) => {
  const { property, address, type = "code", code, contact, notes } = req.body;
  const canManage =
    req.user.role === "admin" || req.user.position_title === "Supervisor";
  const status = canManage ? "approved" : "draft";
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "insert into gate_codes(property,address,access_type,gate_code,contact,notes,created_by,status,approved_by,approved_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,case when $8='approved' then now() else null end) returning id,property,address,access_type as type,gate_code as code,contact,notes,status,created_by",
      [
        property,
        address,
        type,
        type === "manual" ? null : code,
        contact,
        notes,
        req.user.id,
        status,
        canManage ? req.user.id : null,
      ],
    );
    await audit(c, req.user.id, "create", "gate_code", rows[0].id);
    return rows[0];
  });
  res.status(201).json(result);
});
app.put("/api/gates/:id", requireAuth, fileManager, async (req, res) => {
  const { property, address, type = "code", code, contact, notes } = req.body;
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "update gate_codes set property=$1,address=$2,access_type=$3,gate_code=$4,contact=$5,notes=$6,updated_at=now() where id=$7 returning id,property,address,access_type as type,gate_code as code,contact,notes,status,created_by",
      [
        property,
        address,
        type,
        type === "manual" ? null : code,
        contact,
        notes,
        req.params.id,
      ],
    );
    if (!rows[0]) return null;
    await audit(c, req.user.id, "update", "gate_code", req.params.id, {
      fields: [
        "property",
        "address",
        "access_type",
        "gate_code",
        "contact",
        "notes",
      ],
    });
    return rows[0];
  });
  if (!result)
    return res.status(404).json({ error: "Gate-code record not found" });
  res.json(result);
});
app.post(
  "/api/gates/:id/approve",
  requireAuth,
  fileManager,
  async (req, res) => {
    const result = await transaction(async (c) => {
      const { rows } = await c.query(
        "update gate_codes set status='approved',approved_by=$1,approved_at=now(),updated_at=now() where id=$2 returning id,property,address,access_type as type,gate_code as code,contact,notes,status,created_by",
        [req.user.id, req.params.id],
      );
      if (rows[0])
        await audit(c, req.user.id, "approve", "gate_code", req.params.id);
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: "Gate code not found" });
    res.json(result);
  },
);
app.delete("/api/gates/:id", requireAuth, fileManager, async (req, res) => {
  await transaction(async (c) => {
    await c.query("delete from gate_codes where id=$1", [req.params.id]);
    await audit(c, req.user.id, "delete", "gate_code", req.params.id);
  });
  res.status(204).end();
});
app.post("/api/locks", requireAuth, async (req, res) => {
  const { property, address, access, location, lat, lng } = req.body;
  const canManage =
    req.user.role === "admin" || req.user.position_title === "Supervisor";
  const status = canManage ? "approved" : "draft";
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "insert into lockboxes(property,address,access_method,location_notes,latitude,longitude,created_by,status,approved_by,approved_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,case when $8='approved' then now() else null end) returning id,property,address,access_method as access,location_notes as location,latitude as lat,longitude as lng,status,created_by",
      [
        property,
        address,
        access,
        location,
        lat || null,
        lng || null,
        req.user.id,
        status,
        canManage ? req.user.id : null,
      ],
    );
    await audit(c, req.user.id, "create", "lockbox", rows[0].id);
    return rows[0];
  });
  res.status(201).json(result);
});
app.put("/api/locks/:id", requireAuth, fileManager, async (req, res) => {
  const { property, address, access, location, lat, lng } = req.body;
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "update lockboxes set property=$1,address=$2,access_method=$3,location_notes=$4,latitude=$5,longitude=$6,updated_at=now() where id=$7 returning id,property,address,access_method as access,location_notes as location,latitude as lat,longitude as lng,status,created_by",
      [
        property,
        address,
        access,
        location,
        lat || null,
        lng || null,
        req.params.id,
      ],
    );
    if (!rows[0]) return null;
    await audit(c, req.user.id, "update", "lockbox", req.params.id, {
      fields: [
        "property",
        "address",
        "access_method",
        "location_notes",
        "latitude",
        "longitude",
      ],
    });
    return rows[0];
  });
  if (!result)
    return res.status(404).json({ error: "Lockbox record not found" });
  res.json(result);
});
app.post(
  "/api/locks/:id/approve",
  requireAuth,
  fileManager,
  async (req, res) => {
    const result = await transaction(async (c) => {
      const { rows } = await c.query(
        "update lockboxes set status='approved',approved_by=$1,approved_at=now(),updated_at=now() where id=$2 returning id,property,address,access_method as access,location_notes as location,latitude as lat,longitude as lng,status,created_by",
        [req.user.id, req.params.id],
      );
      if (rows[0])
        await audit(c, req.user.id, "approve", "lockbox", req.params.id);
      return rows[0];
    });
    if (!result) return res.status(404).json({ error: "Lockbox not found" });
    res.json(result);
  },
);
app.delete("/api/locks/:id", requireAuth, fileManager, async (req, res) => {
  await transaction(async (c) => {
    await c.query("delete from lockboxes where id=$1", [req.params.id]);
    await audit(c, req.user.id, "delete", "lockbox", req.params.id);
  });
  res.status(204).end();
});
app.get("/api/messages", requireAuth, async (req, res) => {
  const after = Math.max(0, Number(req.query.after) || 0);
  const { rows } = await db.query(
    "select m.id,m.sender_id,m.recipient_id,m.body,m.created_at,s.full_name as sender_name,r.full_name as recipient_name,coalesce((select json_agg(json_build_object('id',a.id,'url','/api/message-photos/'||a.id,'mime_type',a.mime_type,'original_name',a.original_name) order by a.id) from message_attachments a where a.message_id=m.id),'[]'::json) as attachments from messages m join users s on s.id=m.sender_id left join users r on r.id=m.recipient_id where (m.sender_id=$1 or m.recipient_id=$1 or m.recipient_id is null) and m.id>$2 order by m.id asc limit 500",
    [req.user.id, after],
  );
  res.json(rows);
});
app.post("/api/messages", requireAuth, async (req, res) => {
  const body = String(req.body.body || "").trim();
  const recipientId = req.body.recipientId || null;
  if (!body) return res.status(400).json({ error: "Message is required" });
  if (!recipientId)
    return res.status(400).json({ error: "Choose a message recipient" });
  const { rows } = await db.query(
    "insert into messages(sender_id,recipient_id,body) values($1,$2,$3) returning id,sender_id,recipient_id,body,created_at",
    [req.user.id, recipientId, body],
  );
  const recipient = recipientId
    ? await db.query("select full_name from users where id=$1 and active", [
        recipientId,
      ])
    : null;
  res.status(201).json({
    ...rows[0],
    sender_name: req.user.full_name,
    recipient_name: recipient?.rows[0]?.full_name || null,
    attachments: [],
  });
});
const messageImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/heic", ".heic"],
  ["image/heif", ".heif"],
]);
app.post(
  "/api/messages/:id/photos",
  requireAuth,
  express.raw({ type: "image/*", limit: "10mb" }),
  async (req, res) => {
    const mimeType = String(req.headers["content-type"] || "")
      .split(";")[0]
      .toLowerCase();
    if (!messageImageTypes.has(mimeType))
      return res.status(400).json({
        error: "Use a JPEG, PNG, WebP, GIF, HEIC, or HEIF photo",
      });
    if (!Buffer.isBuffer(req.body) || !req.body.length)
      return res.status(400).json({ error: "Choose a photo to upload" });
    const message = await db.query(
      "select id from messages where id=$1 and sender_id=$2",
      [req.params.id, req.user.id],
    );
    if (!message.rowCount)
      return res.status(403).json({ error: "You can only attach photos to your own message" });
    const count = await db.query(
      "select count(*)::integer as count from message_attachments where message_id=$1",
      [req.params.id],
    );
    if (count.rows[0].count >= 5)
      return res.status(400).json({ error: "A message can contain up to five photos" });
    const storageName = `${crypto.randomUUID()}${messageImageTypes.get(mimeType)}`;
    const originalName = decodeURIComponent(
      String(req.headers["x-file-name"] || `photo${messageImageTypes.get(mimeType)}`),
    ).slice(0, 255);
    await fs.writeFile(path.join(uploadsDir, storageName), req.body);
    const { rows } = await db.query(
      "insert into message_attachments(message_id,storage_name,original_name,mime_type,size_bytes) values($1,$2,$3,$4,$5) returning id,original_name,mime_type",
      [req.params.id, storageName, originalName, mimeType, req.body.length],
    );
    res.status(201).json({
      ...rows[0],
      url: `/api/message-photos/${rows[0].id}`,
    });
  },
);
app.get("/api/message-photos/:id", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    "select a.storage_name,a.original_name,a.mime_type from message_attachments a join messages m on m.id=a.message_id where a.id=$1 and (m.sender_id=$2 or m.recipient_id=$2 or m.recipient_id is null)",
    [req.params.id, req.user.id],
  );
  if (!rows[0]) return res.status(404).end();
  res.setHeader("Content-Type", rows[0].mime_type);
  res.setHeader("Content-Disposition", `inline; filename=\"${rows[0].original_name.replace(/[\"\\r\\n]/g, "")}\"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(path.join(uploadsDir, rows[0].storage_name));
});
const calculatorIdPattern = /^[a-z0-9-]{2,80}$/;
const calculatorPayload = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Object.assign(new Error(`${label} must be an object`), { status: 400 });
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 100000)
    throw Object.assign(new Error(`${label} is too large`), { status: 413 });
  return value;
};
app.get("/api/calculators/state", requireAuth, async (req, res) => {
  const manager = req.user.role === "admin" || req.user.position_title === "Supervisor";
  const [favorites, recent, saved, config] = await Promise.all([
    db.query("select calculator_type from calculator_favorites where user_id=$1 order by calculator_type", [req.user.id]),
    db.query("select calculator_type,last_opened_at from calculator_recent where user_id=$1 order by last_opened_at desc limit 8", [req.user.id]),
    db.query(
      "select s.id,s.owner_user_id,s.calculator_type,s.name,s.inputs,s.outputs,s.property_reference,s.address,s.notes,s.shared_with_team,s.created_at,s.updated_at,u.full_name as owner_name from saved_calculations s join users u on u.id=s.owner_user_id where s.owner_user_id=$1 or ($2::boolean and s.shared_with_team=true) order by s.updated_at desc limit 250",
      [req.user.id, manager],
    ),
    db.query("select config_key,config_value,updated_at from calculator_config order by config_key"),
  ]);
  res.json({
    favorites: favorites.rows.map((row) => row.calculator_type),
    recent: recent.rows,
    saved: saved.rows,
    config: Object.fromEntries(config.rows.map((row) => [row.config_key, row.config_value])),
  });
});
app.post("/api/calculators/favorites/:type", requireAuth, async (req, res) => {
  const type = String(req.params.type);
  if (!calculatorIdPattern.test(type)) return res.status(400).json({ error: "Invalid calculator type" });
  const removed = await db.query(
    "delete from calculator_favorites where user_id=$1 and calculator_type=$2 returning calculator_type",
    [req.user.id, type],
  );
  if (removed.rowCount) return res.json({ favorite: false });
  await db.query("insert into calculator_favorites(user_id,calculator_type) values($1,$2)", [req.user.id, type]);
  res.json({ favorite: true });
});
app.post("/api/calculators/recent/:type", requireAuth, async (req, res) => {
  const type = String(req.params.type);
  if (!calculatorIdPattern.test(type)) return res.status(400).json({ error: "Invalid calculator type" });
  await db.query(
    "insert into calculator_recent(user_id,calculator_type) values($1,$2) on conflict(user_id,calculator_type) do update set last_opened_at=now()",
    [req.user.id, type],
  );
  res.status(204).end();
});
app.post("/api/calculators/saved", requireAuth, async (req, res) => {
  try {
    const type = String(req.body.calculator_type || "");
    const name = String(req.body.name || "").trim();
    if (!calculatorIdPattern.test(type) || !name)
      return res.status(400).json({ error: "Calculator type and name are required" });
    const inputs = calculatorPayload(req.body.inputs, "Inputs");
    const outputs = calculatorPayload(req.body.outputs, "Outputs");
    const { rows } = await db.query(
      "insert into saved_calculations(owner_user_id,calculator_type,name,inputs,outputs,property_reference,address,notes,shared_with_team) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
      [req.user.id, type, name.slice(0,200), inputs, outputs, String(req.body.property_reference || "").slice(0,300) || null, String(req.body.address || "").slice(0,500) || null, String(req.body.notes || "").slice(0,4000) || null, Boolean(req.body.shared_with_team)],
    );
    await audit(db, req.user.id, "create", "saved_calculation", rows[0].id);
    res.status(201).json({ ...rows[0], owner_name: req.user.full_name });
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.put("/api/calculators/saved/:id", requireAuth, async (req, res) => {
  try {
    const inputs = calculatorPayload(req.body.inputs, "Inputs");
    const outputs = calculatorPayload(req.body.outputs, "Outputs");
    const { rows } = await db.query(
      "update saved_calculations set name=$1,inputs=$2,outputs=$3,property_reference=$4,address=$5,notes=$6,shared_with_team=$7,updated_at=now() where id=$8 and owner_user_id=$9 returning *",
      [String(req.body.name || "").trim().slice(0,200), inputs, outputs, String(req.body.property_reference || "").slice(0,300) || null, String(req.body.address || "").slice(0,500) || null, String(req.body.notes || "").slice(0,4000) || null, Boolean(req.body.shared_with_team), req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Saved calculation not found" });
    res.json(rows[0]);
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.delete("/api/calculators/saved/:id", requireAuth, async (req, res) => {
  const { rows } = await db.query("delete from saved_calculations where id=$1 and owner_user_id=$2 returning id", [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: "Saved calculation not found" });
  await audit(db, req.user.id, "delete", "saved_calculation", req.params.id);
  res.status(204).end();
});
app.put("/api/calculators/config/:key", requireAuth, admin, async (req, res) => {
  const key = String(req.params.key);
  if (!/^[a-z0-9_-]{2,80}$/.test(key)) return res.status(400).json({ error: "Invalid configuration key" });
  try {
    const value = calculatorPayload(req.body.value, "Configuration");
    const { rows } = await db.query(
      "insert into calculator_config(config_key,config_value,updated_by) values($1,$2,$3) on conflict(config_key) do update set config_value=excluded.config_value,updated_by=excluded.updated_by,updated_at=now() returning config_key,config_value,updated_at",
      [key, value, req.user.id],
    );
    await audit(db, req.user.id, "update", "calculator_config", null, { key });
    res.json(rows[0]);
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.delete("/api/calculators/config/:key", requireAuth, admin, async (req, res) => {
  await db.query("delete from calculator_config where config_key=$1", [req.params.key]);
  await audit(db, req.user.id, "restore_default", "calculator_config", null, { key: req.params.key });
  res.status(204).end();
});
app.get("/api/broadcasts", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    "select b.id,b.title,b.body,b.sender_id,b.created_at,u.full_name as sender_name,(r.user_id is not null) as read from broadcasts b join users u on u.id=b.sender_id left join broadcast_reads r on r.broadcast_id=b.id and r.user_id=$1 order by b.created_at desc limit 100",
    [req.user.id],
  );
  res.json(rows);
});
app.post("/api/broadcasts", requireAuth, fileManager, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  if (!title || !body)
    return res.status(400).json({ error: "Broadcast title and message are required" });
  const { rows } = await db.query(
    "insert into broadcasts(title,body,sender_id) values($1,$2,$3) returning id,title,body,sender_id,created_at",
    [title.slice(0, 200), body.slice(0, 10000), req.user.id],
  );
  await audit(db, req.user.id, "create", "broadcast", rows[0].id);
  res.status(201).json({
    ...rows[0],
    sender_name: req.user.full_name,
    read: true,
  });
});
app.post("/api/broadcasts/:id/read", requireAuth, async (req, res) => {
  const exists = await db.query("select 1 from broadcasts where id=$1", [
    req.params.id,
  ]);
  if (!exists.rowCount)
    return res.status(404).json({ error: "Broadcast not found" });
  await db.query(
    "insert into broadcast_reads(broadcast_id,user_id) values($1,$2) on conflict(broadcast_id,user_id) do update set read_at=now()",
    [req.params.id, req.user.id],
  );
  res.status(204).end();
});
app.get("/api/files", requireAuth, async (_req, res) => {
  const { rows } = await db.query(
    "select f.id,f.original_name,f.title,f.notes,f.mime_type,f.size_bytes,f.uploaded_at,f.uploaded_by,u.full_name as uploader_name from files f join users u on u.id=f.uploaded_by order by f.uploaded_at desc",
  );
  res.json(rows);
});
app.post(
  "/api/files",
  requireAuth,
  fileManager,
  express.raw({ type: "*/*", limit: "25mb" }),
  async (req, res) => {
    const title = decodeURIComponent(
      String(req.headers["x-file-title"] || ""),
    ).trim();
    const notes = decodeURIComponent(
      String(req.headers["x-file-notes"] || ""),
    ).trim();
    const originalName = decodeURIComponent(
      String(req.headers["x-file-name"] || "upload.bin"),
    );
    if (!title || !Buffer.isBuffer(req.body) || !req.body.length)
      return res.status(400).json({ error: "File and title are required" });
    const extension = path.extname(originalName).slice(0, 12);
    const storageName = `${crypto.randomUUID()}${extension}`;
    await fs.writeFile(path.join(uploadsDir, storageName), req.body);
    const { rows } = await db.query(
      "insert into files(storage_name,original_name,title,notes,mime_type,size_bytes,uploaded_by) values($1,$2,$3,$4,$5,$6,$7) returning id,original_name,title,notes,mime_type,size_bytes,uploaded_at,uploaded_by",
      [
        storageName,
        originalName,
        title,
        notes || null,
        req.headers["x-file-type"] || "application/octet-stream",
        req.body.length,
        req.user.id,
      ],
    );
    res.status(201).json({ ...rows[0], uploader_name: req.user.full_name });
  },
);
app.put("/api/files/:id", requireAuth, fileManager, async (req, res) => {
  const { rows } = await db.query(
    "update files set title=$1,notes=$2,updated_at=now() where id=$3 returning id,original_name,title,notes,mime_type,size_bytes,uploaded_at,uploaded_by",
    [req.body.title, req.body.notes || null, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "File not found" });
  res.json(rows[0]);
});
app.delete("/api/files/:id", requireAuth, fileManager, async (req, res) => {
  const { rows } = await db.query(
    "delete from files where id=$1 returning storage_name",
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "File not found" });
  await fs.unlink(path.join(uploadsDir, rows[0].storage_name)).catch(() => {});
  res.status(204).end();
});
app.get("/api/files/:id/download", requireAuth, async (req, res) => {
  const { rows } = await db.query(
    "select storage_name,original_name from files where id=$1",
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).end();
  res.download(
    path.join(uploadsDir, rows[0].storage_name),
    rows[0].original_name,
  );
});
const linkInput = (body) => {
  const title = String(body.title || "").trim();
  const url = String(body.url || "").trim();
  const notes = String(body.notes || "").trim();
  if (!title || !url) return { error: "Link title and URL are required" };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return { title, url: parsed.toString(), notes: notes || null };
  } catch {
    return { error: "Enter a valid http:// or https:// URL" };
  }
};
const linkSelect =
  "select l.id,l.title,l.url,l.notes,l.added_by,l.updated_by,l.created_at,l.updated_at,a.full_name as added_by_name,u.full_name as updated_by_name from links l join users a on a.id=l.added_by left join users u on u.id=l.updated_by";
app.get("/api/links", requireAuth, async (_req, res) => {
  const { rows } = await db.query(`${linkSelect} order by l.updated_at desc`);
  res.json(rows);
});
app.post("/api/links", requireAuth, fileManager, async (req, res) => {
  const input = linkInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "insert into links(title,url,notes,added_by,updated_by) values($1,$2,$3,$4,$4) returning id",
      [input.title, input.url, input.notes, req.user.id],
    );
    await audit(c, req.user.id, "create", "link", rows[0].id);
    return rows[0];
  });
  const { rows } = await db.query(`${linkSelect} where l.id=$1`, [result.id]);
  res.status(201).json(rows[0]);
});
app.put("/api/links/:id", requireAuth, fileManager, async (req, res) => {
  const input = linkInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "update links set title=$1,url=$2,notes=$3,updated_by=$4,updated_at=now() where id=$5 returning id",
      [input.title, input.url, input.notes, req.user.id, req.params.id],
    );
    if (rows[0]) await audit(c, req.user.id, "update", "link", req.params.id);
    return rows[0];
  });
  if (!result) return res.status(404).json({ error: "Link not found" });
  const { rows } = await db.query(`${linkSelect} where l.id=$1`, [result.id]);
  res.json(rows[0]);
});
app.delete("/api/links/:id", requireAuth, fileManager, async (req, res) => {
  const result = await transaction(async (c) => {
    const { rows } = await c.query(
      "delete from links where id=$1 returning id",
      [req.params.id],
    );
    if (rows[0]) await audit(c, req.user.id, "delete", "link", req.params.id);
    return rows[0];
  });
  if (!result) return res.status(404).json({ error: "Link not found" });
  res.status(204).end();
});
const formFieldTypes = new Set([
  "text",
  "paragraph",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "checkbox",
  "select",
  "location",
]);
const formInput = (body) => {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const emailTo = String(body.email_to || "").trim();
  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (!title || !emailTo || !fields.length)
    return { error: "Title, destination email, and at least one field are required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo))
    return { error: "Enter a valid destination email address" };
  if (fields.length > 100) return { error: "Forms may contain up to 100 fields" };
  const normalized = [];
  for (const field of fields) {
    const type = String(field.type || "");
    const label = String(field.label || "").trim();
    if (!formFieldTypes.has(type) || !label)
      return { error: "Every form field needs a valid type and label" };
    normalized.push({
      id: String(field.id || crypto.randomUUID()).slice(0, 100),
      type,
      label: label.slice(0, 160),
      required: Boolean(field.required),
      options:
        type === "select"
          ? (Array.isArray(field.options) ? field.options : [])
              .map((item) => String(item).trim().slice(0, 100))
              .filter(Boolean)
              .slice(0, 50)
          : undefined,
    });
  }
  return {
    title: title.slice(0, 200),
    description: description.slice(0, 4000) || null,
    emailTo,
    fields: normalized,
    columns: Math.min(3, Math.max(1, Number(body.columns) || 1)),
    active: body.active !== false,
  };
};
const formSelect =
  "select f.id,f.title,f.description,f.email_to,f.fields,f.columns,f.active,f.created_by,f.created_at,f.updated_at,u.full_name as created_by_name from forms f join users u on u.id=f.created_by";
app.get("/api/forms", requireAuth, async (req, res) => {
  const manager =
    req.user.role === "admin" || req.user.position_title === "Supervisor";
  const { rows } = await db.query(
    `${formSelect}${manager ? "" : " where f.active=true"} order by f.updated_at desc`,
  );
  res.json(rows);
});
app.post("/api/forms", requireAuth, fileManager, async (req, res) => {
  const input = formInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const { rows } = await db.query(
    "insert into forms(title,description,email_to,fields,columns,active,created_by) values($1,$2,$3,$4::jsonb,$5,$6,$7) returning id",
    [
      input.title,
      input.description,
      input.emailTo,
      JSON.stringify(input.fields),
      input.columns,
      input.active,
      req.user.id,
    ],
  );
  await audit(db, req.user.id, "create", "form", rows[0].id);
  const created = await db.query(`${formSelect} where f.id=$1`, [rows[0].id]);
  res.status(201).json(created.rows[0]);
});
app.put("/api/forms/:id", requireAuth, fileManager, async (req, res) => {
  const input = formInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const { rows } = await db.query(
    "update forms set title=$1,description=$2,email_to=$3,fields=$4::jsonb,columns=$5,active=$6,updated_at=now() where id=$7 returning id",
    [
      input.title,
      input.description,
      input.emailTo,
      JSON.stringify(input.fields),
      input.columns,
      input.active,
      req.params.id,
    ],
  );
  if (!rows[0]) return res.status(404).json({ error: "Form not found" });
  await audit(db, req.user.id, "update", "form", req.params.id);
  const updated = await db.query(`${formSelect} where f.id=$1`, [req.params.id]);
  res.json(updated.rows[0]);
});
app.delete("/api/forms/:id", requireAuth, fileManager, async (req, res) => {
  const { rows } = await db.query("delete from forms where id=$1 returning id", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "Form not found" });
  await audit(db, req.user.id, "delete", "form", req.params.id);
  res.status(204).end();
});
app.get(
  "/api/forms/:id/submissions",
  requireAuth,
  fileManager,
  async (req, res) => {
    const { rows } = await db.query(
      "select s.id,s.values,s.email_to,s.email_status,s.submitted_at,s.submitted_by,u.full_name as submitted_by_name from form_submissions s join users u on u.id=s.submitted_by where s.form_id=$1 order by s.submitted_at desc",
      [req.params.id],
    );
    res.json(rows);
  },
);
app.post("/api/forms/:id/submissions", requireAuth, async (req, res) => {
  const result = await db.query(
    "select id,title,email_to,fields from forms where id=$1 and active=true",
    [req.params.id],
  );
  const form = result.rows[0];
  if (!form) return res.status(404).json({ error: "Form not found" });
  const supplied = req.body.values && typeof req.body.values === "object"
    ? req.body.values
    : {};
  const values = {};
  for (const field of form.fields) {
    const value = supplied[field.id];
    if (
      field.required &&
      (value === undefined || value === null || value === "" || value === false)
    )
      return res.status(400).json({ error: `${field.label} is required` });
    if (value !== undefined) values[field.id] = value;
  }
  const inserted = await db.query(
    "insert into form_submissions(form_id,submitted_by,values,email_to) values($1,$2,$3::jsonb,$4) returning id,submitted_at,email_status",
    [form.id, req.user.id, JSON.stringify(values), form.email_to],
  );
  let emailStatus = "failed";
  if (mailTransport) {
    const lines = form.fields.map((field) => {
      const raw = values[field.id];
      const value =
        raw && typeof raw === "object"
          ? `${raw.lat || ""}, ${raw.lng || ""}`
          : raw === true
            ? "Yes"
            : raw === false
              ? "No"
              : String(raw ?? "");
      return `${field.label}: ${value}`;
    });
    try {
      await mailTransport.sendMail({
        from:
          process.env.CLOUDRON_MAIL_FROM ||
          process.env.CLOUDRON_MAIL_SMTP_USERNAME,
        to: form.email_to,
        subject: `AccessHub form submission: ${form.title}`,
        text: [
          `Form: ${form.title}`,
          `Submitted by: ${req.user.full_name}`,
          `Submitted: ${inserted.rows[0].submitted_at}`,
          "",
          ...lines,
        ].join("\n"),
      });
      emailStatus = "sent";
    } catch (error) {
      console.error("Unable to email form submission", error);
    }
  }
  await db.query("update form_submissions set email_status=$1 where id=$2", [
    emailStatus,
    inserted.rows[0].id,
  ]);
  await audit(db, req.user.id, "submit", "form", form.id, {
    submission_id: inserted.rows[0].id,
  });
  res.status(201).json({ ...inserted.rows[0], email_status: emailStatus });
});
app.use(
  express.static(path.join(root, "dist"), { index: false, maxAge: "1h" }),
);
app.get("/{*splat}", (req, res) =>
  res.sendFile(path.join(root, "dist", "index.html")),
);
app.use((error, _req, res, _next) => {
  console.error(error);
  const status =
    error.code === "23505"
      ? 409
      : error.code === "23514" || error.code === "23502"
        ? 400
        : 500;
  res.status(status).json({
    error:
      error.code === "23505"
        ? "Record already exists"
        : "Unable to complete request",
  });
});
await migrate();
await fs.mkdir(uploadsDir, { recursive: true });
const adminExists = (
  await db.query("select 1 from users where role='admin' limit 1")
).rowCount;
if (!adminExists) {
  const password = process.env.INITIAL_ADMIN_PASSWORD || "mmg123$";
  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    "insert into users(username,password_hash,full_name,position_title,role) values('Admin',$1,'System Administrator','Administrator','admin')",
    [passwordHash],
  );
  console.warn(
    "Created initial Admin account. Change the initial password immediately after deployment.",
  );
}
await db.query("delete from sessions where expires_at<=now()");
app.listen(port, "0.0.0.0", () =>
  console.log(`AccessHub listening on ${port}`),
);
