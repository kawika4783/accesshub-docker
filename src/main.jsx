import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Users,
  UserRound,
  Boxes,
  Settings,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  MapPin,
  ChevronRight,
  Upload,
  Database,
  LogOut,
  Send,
  ShieldCheck,
  Phone,
  Mail,
  Pencil,
  Trash2,
  FileText,
  Download,
  Link2,
  ExternalLink,
  ChevronDown,
  ClipboardList,
  Type,
  AlignLeft,
  CalendarDays,
  Clock,
  Hash,
  CheckSquare,
  List,
  LocateFixed,
  GripVertical,
  Eye,
  Bell,
  Megaphone,
  Columns3,
  Camera,
  ImagePlus,
  Calculator,
} from "lucide-react";
import { api } from "./api.js";
import SignalCalculators from "./calculators/SignalCalculators.jsx";
import "./styles.css";

const seedGates = [
  {
    id: 1,
    property: "Harbor Pointe Apartments",
    address: "1250 Ala Moana Blvd, Honolulu",
    code: "1428#",
    contact: "Security · (808) 555-0142",
    notes: "Use makai entrance after 8 PM",
    type: "code",
  },
  {
    id: 2,
    property: "Koa Ridge Residences",
    address: "94-1200 Ka Uka Blvd, Waipahu",
    code: "",
    contact: "Gatehouse · (808) 555-0189",
    notes: "Contact security at gate for access",
    type: "manual",
  },
  {
    id: 3,
    property: "Palm Court Villas",
    address: "91-1039 Puamaeole St, Ewa Beach",
    code: "8066",
    contact: "Manager · (808) 555-0170",
    notes: "Code changes quarterly",
    type: "code",
  },
];
const seedLocks = [
  {
    id: 1,
    property: "Waikiki Trade Center",
    address: "2255 Kuhio Ave, Honolulu",
    access: "Tech Master Key",
    location: "Level P2, north stairwell",
    lat: "21.2795",
    lng: "-157.8272",
  },
  {
    id: 2,
    property: "Pearlridge Offices",
    address: "98-1005 Moanalua Rd, Aiea",
    access: "Box code 3149",
    location: "Loading dock, behind fire riser",
    lat: "21.3857",
    lng: "-157.9440",
  },
  {
    id: 3,
    property: "Kailua Professional Center",
    address: "40 Aulike St, Kailua",
    access: "Moon Key",
    location: "East entry planter wall",
    lat: "21.3949",
    lng: "-157.7405",
  },
];
const people = [
  {
    name: "Maya Chen",
    role: "Operations Manager",
    phone: "(808) 555-0112",
    email: "maya.chen@accesshub.local",
    supervisor: "David Park",
    group: "Operations",
  },
  {
    name: "Noah Williams",
    role: "Field Technician",
    phone: "(808) 555-0134",
    email: "noah.w@accesshub.local",
    supervisor: "Maya Chen",
    group: "Field Team",
  },
  {
    name: "Leilani Kealoha",
    role: "Security Coordinator",
    phone: "(808) 555-0156",
    email: "leilani.k@accesshub.local",
    supervisor: "David Park",
    group: "Security",
  },
  {
    name: "Ethan Brooks",
    role: "Field Technician",
    phone: "(808) 555-0168",
    email: "ethan.b@accesshub.local",
    supervisor: "Maya Chen",
    group: "Field Team",
  },
];
const nav = [
  ["Dashboard", Home],
  ["Gate Codes", KeyRound],
  ["Lockboxes & Keys", LockKeyhole],
  ["Messages", MessageSquare],
  ["Files", FileText],
  ["Links", Link2],
  ["Forms", ClipboardList],
  ["Signal Calculators", Calculator],
  ["Directory", Users],
  ["Users", UserRound],
  ["Modules", Boxes],
  ["Settings", Settings],
];
const modules = [
  [
    "Gate Codes",
    KeyRound,
    "Search property access codes and contacts.",
    "Gate Codes",
    "blue",
  ],
  [
    "Lockboxes & Keys",
    LockKeyhole,
    "Find keys and pinpoint exact locations.",
    "Lockboxes & Keys",
    "green",
  ],
  [
    "Messages",
    MessageSquare,
    "Message people, groups, or everyone.",
    "Messages",
    "purple",
  ],
  [
    "Directory",
    Users,
    "Find your team and contact details.",
    "Directory",
    "orange",
  ],
  [
    "Files",
    FileText,
    "Upload, search, and download shared files.",
    "Files",
    "blue",
  ],
  ["Links", Link2, "Search and open shared web resources.", "Links", "green"],
  [
    "Forms",
    ClipboardList,
    "Complete and submit team forms.",
    "Forms",
    "purple",
  ],
  [
    "Signal Calculators",
    Calculator,
    "RF, coax, fiber, electrical, and network tools.",
    "Signal Calculators",
    "orange",
  ],
];

function IconButton({ children, ...p }) {
  return (
    <button className="icon-btn" {...p}>
      {children}
    </button>
  );
}
function Empty({ title, body }) {
  return (
    <div className="empty">
      <Search />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <IconButton onClick={onClose}>
            <X />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}

function Login({ onLogin, theme, toggleTheme }) {
  const [u, setU] = useState("Admin"),
    [p, setP] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.login(u, p);
      await onLogin(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <IconButton onClick={toggleTheme} aria-label="Change theme">
        {theme === "dark" ? <Sun /> : <Moon />}
      </IconButton>
      <div className="login-copy">
        <div className="brand large">
          <span>
            <LockKeyhole />
          </span>
          Access<span>Hub</span>
        </div>
        <h1>Property access, without the runaround.</h1>
        <p>
          Find gate codes, keys, contacts, and team messages from one secure
          place.
        </p>
        <div className="trust">
          <ShieldCheck />
          Secure access for authorized teams
        </div>
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">
          <LockKeyhole />
        </div>
        <h2>Welcome back</h2>
        <p>Sign in to continue to AccessHub.</p>
        <label>
          Username
          <input value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} {!busy && <ChevronRight />}
        </button>
        <small>
          Use the administrator password configured for this installation.
        </small>
      </form>
    </div>
  );
}

function Dashboard({ go, setModal, canManage, user }) {
  return (
    <>
      <div className="heading">
        <h1>
          Good morning,{" "}
          {(user?.full_name || user?.username || "there").split(" ")[0]}
        </h1>
        <p>Here’s what’s happening with access operations.</p>
      </div>
      <div className="dash-layout">
        <div>
          <div className="module-grid">
            {modules.map(([n, I, d, target, color]) => (
              <button
                className={"module " + color}
                onClick={() => go(target)}
                key={n}
              >
                <div className="module-icon">
                  <I />
                </div>
                <h2>{n}</h2>
                <p>{d}</p>
                <span>
                  Open <ChevronRight />
                </span>
              </button>
            ))}
          </div>
          <section className="activity">
            <div className="section-title">
              <h2>Recent activity</h2>
              <button>View all</button>
            </div>
            {[
              ["Gate code created", "Harbor Pointe · Main entrance", "8:42 AM"],
              ["Lockbox checked in", "Waikiki Trade Center · P2", "8:15 AM"],
              [
                "New message sent",
                "To: Field Team · Gate access update",
                "Yesterday",
              ],
              ["User added", "Noah Williams · Field Technician", "Yesterday"],
            ].map((r, i) => (
              <div className="activity-row" key={r[0]}>
                <span
                  className={
                    ["dot green", "dot blue", "dot purple", "dot orange"][i]
                  }
                ></span>
                <div>
                  <b>{r[0]}</b>
                  <small>{r[1]}</small>
                </div>
                <time>{r[2]}</time>
              </div>
            ))}
          </section>
        </div>
        <aside className="quick">
          <h2>Quick actions</h2>
          {[
            ["Add gate code", KeyRound, "gate"],
            ["Add lockbox", LockKeyhole, "lock"],
            ["New message", MessageSquare, "message"],
            ["Add user", UserRound, "user"],
          ]
            .filter(([, , type]) => type !== "user" || canManage)
            .map(([n, I, t]) => (
              <button
                key={n}
                onClick={() => (t === "user" ? go("Users") : setModal(t))}
              >
                <I />
                <span>
                  {n}
                  <small>Create a new record</small>
                </span>
                <ChevronRight />
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}

function Records({
  kind,
  items,
  setItems,
  query,
  setModal,
  setMap,
  setEditing,
  canManage,
}) {
  const isGate = kind === "Gate Codes";
  const filtered = items.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
  );
  const remove = async (x) => {
    if (!confirm(`Delete ${x.property}?`)) return;
    isGate ? await api.deleteGate(x.id) : await api.deleteLock(x.id);
    setItems(items.filter((y) => y.id !== x.id));
  };
  const approve = async (x) => {
    const saved = isGate
      ? await api.approveGate(x.id)
      : await api.approveLock(x.id);
    setItems(items.map((item) => (item.id === saved.id ? saved : item)));
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{kind}</h1>
          <p>
            {isGate
              ? "Property entry codes and alternative access instructions."
              : "Lockbox, key, and pinpointed location records."}
          </p>
        </div>
        <button
          className="primary"
          onClick={() => setModal(isGate ? "gate" : "lock")}
        >
          <Plus />
          Add {isGate ? "gate code" : "lockbox"}
        </button>
      </div>
      <div className="record-list">
        {filtered.length ? (
          filtered.map((x) => (
            <article className="record" key={x.id}>
              <div className="record-icon">
                {isGate ? <KeyRound /> : <LockKeyhole />}
              </div>
              <div className="record-main">
                <h3>{x.property}</h3>
                {x.status === "draft" && (
                  <span className="draft-badge">Draft · Awaiting approval</span>
                )}
                <p>
                  <MapPin />
                  {x.address}
                </p>
                <div className="record-meta">
                  {isGate ? (
                    <>
                      <span className={x.type === "manual" ? "amber" : ""}>
                        {x.type === "manual" ? "Alternative access" : x.code}
                      </span>
                      <span>{x.contact}</span>
                    </>
                  ) : (
                    <>
                      <span>{x.access}</span>
                      <span>{x.location}</span>
                    </>
                  )}
                </div>
                {isGate && <small>{x.notes}</small>}
              </div>
              <div className="row-actions">
                {!isGate && (
                  <button onClick={() => setMap(x)}>
                    <MapPin />
                    View map
                  </button>
                )}
                {canManage && x.status === "draft" && (
                  <button className="approve-btn" onClick={() => approve(x)}>
                    <ShieldCheck />
                    Approve
                  </button>
                )}
                {canManage && (
                  <>
                    <IconButton
                      aria-label={`Edit ${x.property}`}
                      onClick={() =>
                        setEditing({
                          type: isGate ? "gate" : "lock",
                          record: x,
                        })
                      }
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${x.property}`}
                      onClick={() => remove(x)}
                    >
                      <Trash2 />
                    </IconButton>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="No matching records"
            body="Try another property, address, contact, or code."
          />
        )}
      </div>
    </>
  );
}

function Directory({ query, entries }) {
  const results = entries.filter((p) =>
    JSON.stringify(p).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="heading">
        <h1>Directory</h1>
        <p>Everyone on your property access team.</p>
      </div>
      <div className="people">
        {results.map((p, i) => (
          <article key={p.name}>
            <div className={"avatar a" + i}>
              {p.name
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <h3>{p.name}</h3>
            <p>{p.role}</p>
            <span>{p.role || "No position title"}</span>
            <a href={"tel:" + p.phone}>
              <Phone />
              {p.phone}
            </a>
            <a href={"mailto:" + p.email}>
              <Mail />
              {p.email}
            </a>
            <small>Reports to {p.supervisor || "Not assigned"}</small>
          </article>
        ))}
      </div>
    </>
  );
}
function UserForm({ initial = null, people, positionTitles, onSave }) {
  const supervisors = people.filter((person) => person.role === "Supervisor");
  const [data, setData] = useState(
    initial
      ? {
          username: initial.username || "",
          fullName: initial.name || "",
          email: initial.email || "",
          phone: initial.phone || "",
          positionTitle: initial.role || "",
          supervisorId: initial.supervisor_id || "",
        }
      : {
          username: "",
          password: "",
          fullName: "",
          email: "",
          phone: "",
          positionTitle: positionTitles[0]?.name || "",
          supervisorId: "",
        },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Full name
        <input
          required
          value={data.fullName}
          onChange={(event) =>
            setData({ ...data, fullName: event.target.value })
          }
        />
      </label>
      <label>
        Username
        <input
          required
          disabled={Boolean(initial)}
          value={data.username}
          onChange={(event) =>
            setData({ ...data, username: event.target.value })
          }
        />
      </label>
      {!initial && (
        <label>
          Temporary password
          <input
            required
            minLength="8"
            type="password"
            value={data.password}
            onChange={(event) =>
              setData({ ...data, password: event.target.value })
            }
          />
        </label>
      )}
      <label>
        Phone
        <input
          value={data.phone}
          onChange={(event) => setData({ ...data, phone: event.target.value })}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={data.email}
          onChange={(event) => setData({ ...data, email: event.target.value })}
        />
      </label>
      <label>
        Position title
        <select
          required
          value={data.positionTitle}
          onChange={(event) =>
            setData({ ...data, positionTitle: event.target.value })
          }
        >
          {positionTitles.map((title) => (
            <option key={title.id} value={title.name}>
              {title.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Supervisor / Group
        <select
          value={data.supervisorId}
          onChange={(event) =>
            setData({ ...data, supervisorId: event.target.value })
          }
        >
          <option value="">No supervisor assigned</option>
          {supervisors
            .filter((supervisor) => supervisor.id !== initial?.id)
            .map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.name}
              </option>
            ))}
        </select>
      </label>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={saving}>
        {saving ? "Saving…" : initial ? "Save changes" : "Add user"}
      </button>
    </form>
  );
}
function UsersPage({ people, setPeople, positionTitles, setPositionTitles }) {
  const [adding, setAdding] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const addTitle = async (event) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const saved = await api.createPositionTitle(newTitle);
    setPositionTitles(
      [...positionTitles, saved].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewTitle("");
  };
  const renameTitle = async (title) => {
    const name = prompt("Position title", title.name);
    if (!name?.trim() || name.trim() === title.name) return;
    const saved = await api.updatePositionTitle(title.id, name);
    setPositionTitles(
      positionTitles
        .map((item) => (item.id === saved.id ? saved : item))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setPeople(
      people.map((person) =>
        person.role === title.name ? { ...person, role: saved.name } : person,
      ),
    );
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Create users, assign supervisors, and manage position titles.</p>
        </div>
        <button className="primary" onClick={() => setAdding(true)}>
          <Plus /> Add user
        </button>
      </div>
      <div className="people">
        {people.map((person, index) => (
          <article key={person.id}>
            <div className={"avatar a" + (index % 4)}>
              {person.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </div>
            <h3>{person.name}</h3>
            <p>{person.role || "No position title"}</p>
            <span>{person.access_role}</span>
            <small>
              Reports to{" "}
              {people.find((item) => item.id === person.supervisor_id)?.name ||
                "Not assigned"}
            </small>
            <button
              className="outline user-edit"
              onClick={() => setEditingUser(person)}
            >
              <Pencil /> Edit user
            </button>
          </article>
        ))}
      </div>
      <section className="title-manager">
        <h2>Position titles</h2>
        <div className="title-list">
          {positionTitles.map((title) => (
            <button key={title.id} onClick={() => renameTitle(title)}>
              {title.name} <Pencil />
            </button>
          ))}
        </div>
        <form onSubmit={addTitle}>
          <input
            placeholder="Add a position title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />
          <button className="primary">
            <Plus /> Add title
          </button>
        </form>
      </section>
      {adding && (
        <Modal title="Add user" onClose={() => setAdding(false)}>
          <UserForm
            people={people}
            positionTitles={positionTitles}
            onSave={async (data) => {
              const saved = await api.createUser(data);
              setPeople([...people, saved]);
              setAdding(false);
            }}
          />
        </Modal>
      )}
      {editingUser && (
        <Modal title="Edit user" onClose={() => setEditingUser(null)}>
          <UserForm
            initial={editingUser}
            people={people}
            positionTitles={positionTitles}
            onSave={async (data) => {
              const saved = await api.updateUser(editingUser.id, data);
              setPeople(
                people.map((person) =>
                  person.id === saved.id ? saved : person,
                ),
              );
              setEditingUser(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Messages() {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState([
    {
      from: "Maya Chen",
      body: "Gate code at Harbor Pointe was updated this morning.",
      time: "9:14 AM",
    },
    {
      from: "You",
      body: "Thanks — I’ll let the field team know.",
      time: "9:16 AM",
    },
  ]);
  return (
    <>
      <div className="heading">
        <h1>Messages</h1>
        <p>Direct, group, and site-wide communication.</p>
      </div>
      <div className="messages">
        <aside>
          <button className="primary">
            <Plus />
            New message
          </button>
          {["Field Team", "Maya Chen", "Security", "All users"].map((x, i) => (
            <button className={i === 0 ? "active" : ""} key={x}>
              <div className="mini-avatar">{x[0]}</div>
              <span>
                {x}
                <small>{i === 0 ? "4 members" : "Tap to open"}</small>
              </span>
            </button>
          ))}
        </aside>
        <section>
          <header>
            <div>
              <h3>Field Team</h3>
              <p>4 members</p>
            </div>
            <Users />
          </header>
          <div className="thread">
            {msgs.map((m, i) => (
              <div
                className={m.from === "You" ? "bubble mine" : "bubble"}
                key={i}
              >
                <b>{m.from}</b>
                <p>{m.body}</p>
                <small>{m.time}</small>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) {
                setMsgs([...msgs, { from: "You", body: text, time: "Now" }]);
                setText("");
              }
            }}
          >
            <input
              placeholder="Write a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="primary" aria-label="Send">
              <Send />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function Modules({ onConfigure }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Modules</h1>
          <p>Install and manage AccessHub capabilities.</p>
        </div>
        <label className="primary upload">
          <Upload />
          Upload module
          <input
            type="file"
            accept=".zip"
            onChange={(e) =>
              e.target.files[0] &&
              alert(`${e.target.files[0].name} is ready for validation.`)
            }
          />
        </label>
      </div>
      <div className="module-table">
        {modules.map(([n, I, d], i) => (
          <div key={n}>
            <I />
            <span>
              <b>{n}</b>
              <small>{d}</small>
            </span>
            <em>Active</em>
            <button type="button" onClick={() => onConfigure(n)}>
              Configure
            </button>
          </div>
        ))}
      </div>
      <div className="drop">
        <Upload />
        <h3>Install a new module</h3>
        <p>
          Upload a signed .zip package containing the module manifest and web
          assets.
        </p>
      </div>
    </>
  );
}
function SettingsPage({ theme, toggleTheme }) {
  return (
    <>
      <div className="heading">
        <h1>Settings</h1>
        <p>Branding, data, appearance, and system preferences.</p>
      </div>
      <div className="settings">
        <section>
          <h2>Appearance</h2>
          <div className="setting-row">
            <div>
              <b>Color theme</b>
              <p>Choose the interface appearance for all users.</p>
            </div>
            <button onClick={toggleTheme}>
              {theme === "dark" ? <Moon /> : <Sun />}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>Brand accent</b>
              <p>Used for buttons, navigation, and highlights.</p>
            </div>
            <input type="color" defaultValue="#0969da" />
          </div>
        </section>
        <section>
          <h2>Database location</h2>
          <div className="setting-row">
            <div>
              <b>Storage mode</b>
              <p>This prototype currently persists records in this browser.</p>
            </div>
            <button>
              <Database />
              Local browser
            </button>
          </div>
        </section>
        <section>
          <h2>Login branding</h2>
          <div className="setting-row">
            <div>
              <b>Login page logo</b>
              <p>Upload a PNG, JPG, or SVG logo.</p>
            </div>
            <label className="outline upload">
              <Upload />
              Choose logo
              <input type="file" accept="image/*" />
            </label>
          </div>
        </section>
      </div>
    </>
  );
}
function MapPreview({ record }) {
  const lat = Number(record.lat),
    lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return (
      <div className="map-unavailable">
        <MapPin />
        <p>No coordinates have been saved for this lockbox.</p>
      </div>
    );
  const bbox = [lng - 0.003, lat - 0.002, lng + 0.003, lat + 0.002].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
  return (
    <div className="map">
      <iframe
        title={`Map showing ${record.property}`}
        src={src}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
function WorkingMessages({ people, currentUser, canManage }) {
  const [items, setItems] = useState([]),
    [open, setOpen] = useState(false),
    [broadcastOpen, setBroadcastOpen] = useState(false),
    [broadcasts, setBroadcasts] = useState([]),
    [recipientId, setRecipientId] = useState(""),
    [body, setBody] = useState(""),
    [selectedPhotos, setSelectedPhotos] = useState([]),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const latestId = useRef(0);
  const endOfMessages = useRef(null);
  const loadBroadcasts = () =>
    api.broadcasts().then(setBroadcasts).catch(() => setBroadcasts([]));
  useEffect(() => {
    loadBroadcasts();
  }, []);
  useEffect(() => {
    let active = true;
    const loadNew = async () => {
      try {
        const next = await api.messages(latestId.current);
        if (!active || !next.length) return;
        latestId.current = Math.max(
          latestId.current,
          ...next.map((item) => Number(item.id)),
        );
        setItems((current) => {
          const known = new Set(current.map((item) => String(item.id)));
          return [
            ...current,
            ...next.filter((item) => !known.has(String(item.id))),
          ];
        });
        setError("");
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    loadNew();
    const timer = window.setInterval(loadNew, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);
  const send = async (event) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const saved = await api.sendMessage({
        recipientId: recipientId || null,
        body,
      });
      saved.attachments = [];
      for (const selected of selectedPhotos) {
        const attachment = await api.uploadMessagePhoto(saved.id, selected.file);
        saved.attachments.push(attachment);
      }
      latestId.current = Math.max(latestId.current, Number(saved.id));
      setItems((current) => [...current, saved]);
      setBody("");
      setRecipientId("");
      selectedPhotos.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setSelectedPhotos([]);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };
  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []);
    setError("");
    setSelectedPhotos((current) => {
      const available = Math.max(0, 5 - current.length);
      const accepted = files.slice(0, available).filter((file) => {
        if (!file.type.startsWith("image/")) {
          setError("Only photo files can be attached.");
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError("Each photo must be 10 MB or smaller.");
          return false;
        }
        return true;
      });
      if (files.length > available)
        setError("A message can contain up to five photos.");
      return [
        ...current,
        ...accepted.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        })),
      ];
    });
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Messages</h1>
          <p>Direct and site-wide communication · Updates automatically</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="outline" onClick={() => setBroadcastOpen(true)}>
              <Megaphone /> Broadcast
            </button>
          )}
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus />
            New message
          </button>
        </div>
      </div>
      <div className="message-live">
        <i /> Live messages
      </div>
      {error && !open && <div className="error">{error}</div>}
      {broadcasts.length > 0 && (
        <section className="broadcast-feed">
          <h2><Megaphone /> Broadcasts</h2>
          {broadcasts.map((item) => (
            <article key={item.id} className={item.read ? "" : "unread"}>
              <header>
                <div>
                  <b>{item.title}</b>
                  <span>From {item.sender_name}</span>
                </div>
                <time>{new Date(item.created_at).toLocaleString()}</time>
              </header>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
      )}
      <div className="message-list">
        {items.map((item) => (
          <article
            className={`message-bubble ${
              String(item.sender_id) === String(currentUser.id) ? "mine" : ""
            }`}
            key={item.id}
          >
            <header>
              <b>
                {String(item.sender_id) === String(currentUser.id)
                  ? "You"
                  : item.sender_name}
              </b>
              <span>
                {item.recipient_name
                  ? `To ${item.recipient_name}`
                  : "To all users"}
              </span>
            </header>
            <p>{item.body}</p>
            {item.attachments?.length > 0 && (
              <div
                className={`message-photos count-${Math.min(
                  item.attachments.length,
                  4,
                )}`}
              >
                {item.attachments.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src={photo.url} alt={photo.original_name || "Message photo"} />
                  </a>
                ))}
              </div>
            )}
            <time dateTime={item.created_at}>
              <span>
                {new Date(item.created_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>
                {new Date(item.created_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </time>
          </article>
        ))}
        <div ref={endOfMessages} />
      </div>
      {open && (
        <Modal
          title="New message"
          onClose={() => {
            selectedPhotos.forEach(({ preview }) => URL.revokeObjectURL(preview));
            setSelectedPhotos([]);
            setOpen(false);
          }}
        >
          <form className="form" onSubmit={send}>
            <label>
              Recipient
              <select
                required
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              >
                <option value="" disabled>Choose a user</option>
                {people
                  .filter((p) => String(p.id) !== String(currentUser.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                required
                rows="5"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="photo-picker">
              <label className="outline">
                <Camera /> Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              <label className="outline">
                <ImagePlus /> Photo library
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {selectedPhotos.length > 0 && (
              <div className="selected-photos">
                {selectedPhotos.map((selected, index) => (
                  <div key={`${selected.file.name}-${index}`}>
                    <img src={selected.preview} alt="" />
                    <button
                      type="button"
                      aria-label={`Remove ${selected.file.name}`}
                      onClick={() => {
                        URL.revokeObjectURL(selected.preview);
                        setSelectedPhotos((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                      }}
                    >
                      <X />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {error && <div className="error">{error}</div>}
            <button className="primary" disabled={sending}>
              <Send /> {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        </Modal>
      )}
      {broadcastOpen && (
        <Modal title="Broadcast to all users" onClose={() => setBroadcastOpen(false)}>
          <BroadcastForm
            onSave={async (data) => {
              await api.createBroadcast(data);
              setBroadcastOpen(false);
              loadBroadcasts();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function BroadcastForm({ onSave }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
          await onSave({ title, body });
        } catch (failure) {
          setError(failure.message);
          setSaving(false);
        }
      }}
    >
      <div className="broadcast-warning">
        <Megaphone />
        This message and a notification will be sent to every user.
      </div>
      <label>
        Broadcast title
        <input required maxLength="200" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Message
        <textarea required rows="6" value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={saving}>
        <Megaphone /> {saving ? "Broadcasting…" : "Broadcast to all users"}
      </button>
    </form>
  );
}
function FilesPage({ query, canManage }) {
  const [items, setItems] = useState([]),
    [open, setOpen] = useState(false),
    [file, setFile] = useState(null),
    [title, setTitle] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  useEffect(() => {
    api
      .files()
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  const filtered = items.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(query.toLowerCase()),
  );
  const upload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const saved = await api.uploadFile(file, title, notes);
      setItems((current) => [saved, ...current]);
      setOpen(false);
      setFile(null);
      setTitle("");
      setNotes("");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  const edit = async (item) => {
    const nextTitle = prompt("File title", item.title);
    if (!nextTitle) return;
    const nextNotes = prompt("Additional notes", item.notes || "");
    if (nextNotes === null) return;
    const saved = await api.updateFile(item.id, {
      title: nextTitle,
      notes: nextNotes,
    });
    setItems(items.map((x) => (x.id === item.id ? { ...x, ...saved } : x)));
  };
  const remove = async (item) => {
    if (!confirm(`Delete ${item.title}?`)) return;
    await api.deleteFile(item.id);
    setItems(items.filter((x) => x.id !== item.id));
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Files</h1>
          <p>Search and download shared operational files.</p>
        </div>
        {canManage && (
          <button className="primary" onClick={() => setOpen(true)}>
            <Upload />
            Upload file
          </button>
        )}
      </div>
      {error && !open && <div className="error">{error}</div>}
      <div className="file-list">
        {filtered.map((item) => (
          <article className="file-card" key={item.id}>
            <div className="file-card-icon">
              <FileText />
              <span>
                {item.original_name.split(".").pop()?.slice(0, 5) || "FILE"}
              </span>
            </div>
            <div className="file-card-content">
              <h3>{item.title}</h3>
              <p>{item.original_name}</p>
              <small>
                {new Date(item.uploaded_at).toLocaleString()} ·{" "}
                {item.uploader_name}
              </small>
              <div className="file-notes">
                <b>Notes</b>
                <p>{item.notes || "No additional notes were added."}</p>
              </div>
            </div>
            <div className="row-actions file-card-actions">
              <a className="outline" href={`/api/files/${item.id}/download`}>
                <Download />
                Download
              </a>
              {canManage && (
                <>
                  <IconButton aria-label="Edit file" onClick={() => edit(item)}>
                    <Pencil />
                  </IconButton>
                  <IconButton
                    aria-label="Delete file"
                    onClick={() => remove(item)}
                  >
                    <Trash2 />
                  </IconButton>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No files found"
          body={
            query
              ? "Try a different search."
              : "Uploaded files will appear here."
          }
        />
      )}
      {open && (
        <Modal title="Upload file" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={upload}>
            <label>
              File
              <input
                required
                type="file"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setError("");
                }}
              />
            </label>
            <label>
              File title
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Additional notes
              <textarea
                rows="4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="primary" disabled={!file || uploading}>
              {uploading ? "Uploading…" : "Upload file"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function LinksPage({ query, canManage }) {
  const emptyForm = { title: "", url: "", notes: "" };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .links()
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  const filtered = items.filter((item) =>
    [item.title, item.url, item.notes, item.added_by_name]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const openForm = (item = null) => {
    setEditing(item || {});
    setForm(
      item
        ? { title: item.title, url: item.url, notes: item.notes || "" }
        : emptyForm,
    );
    setError("");
  };
  const save = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const saved = editing.id
        ? await api.updateLink(editing.id, form)
        : await api.createLink(form);
      setItems(
        editing.id
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...items],
      );
      setEditing(null);
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (item) => {
    if (!confirm(`Delete ${item.title}?`)) return;
    try {
      await api.deleteLink(item.id);
      setItems(items.filter((link) => link.id !== item.id));
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Links</h1>
          <p>Search and open shared web resources.</p>
        </div>
        {canManage && (
          <button className="primary" onClick={() => openForm()}>
            <Plus />
            Add link
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="record-list">
        {filtered.map((item) => (
          <article className="record" key={item.id}>
            <div className="record-icon">
              <Link2 />
            </div>
            <div className="record-main">
              <h3>{item.title}</h3>
              <p>{item.url}</p>
              {item.notes && <p>{item.notes}</p>}
              <small>
                Added by {item.added_by_name} ·{" "}
                {new Date(item.created_at).toLocaleString()}
                {item.updated_by_name &&
                  item.updated_at !== item.created_at &&
                  ` · Updated by ${item.updated_by_name} ${new Date(item.updated_at).toLocaleString()}`}
              </small>
            </div>
            <div className="row-actions">
              <a
                className="outline"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Open link
              </a>
              {canManage && (
                <>
                  <IconButton
                    aria-label={`Edit ${item.title}`}
                    onClick={() => openForm(item)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    aria-label={`Delete ${item.title}`}
                    onClick={() => remove(item)}
                  >
                    <Trash2 />
                  </IconButton>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No links found"
          body={
            query ? "Try a different search." : "Shared links will appear here."
          }
        />
      )}
      {editing && (
        <Modal
          title={editing.id ? "Edit link" : "Add link"}
          onClose={() => setEditing(null)}
        >
          <form className="form" onSubmit={save}>
            <label>
              Link title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              URL
              <input
                required
                type="url"
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </label>
            <label>
              Additional notes
              <textarea
                rows="4"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="primary">
              {editing.id ? "Save changes" : "Add link"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
const searchIcons = {
  "Gate code": KeyRound,
  Lockbox: LockKeyhole,
  User: UserRound,
  Message: MessageSquare,
  File: FileText,
  Link: Link2,
};
function GlobalSearchResults({ query, onNavigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await api.search(query.trim());
        if (active) {
          setResults(next);
          setError("");
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);
  return (
    <div className="search-results">
      <header>
        <strong>Search results</strong>
        <span>{loading ? "Searching…" : `${results.length} found`}</span>
      </header>
      {query.trim().length < 2 ? (
        <p className="search-hint">Type at least two characters.</p>
      ) : error ? (
        <div className="error">{error}</div>
      ) : !loading && !results.length ? (
        <p className="search-hint">No matching records found.</p>
      ) : (
        <div className="search-result-list">
          {results.map((result) => {
            const ResultIcon = searchIcons[result.kind] || Search;
            return (
              <button
                key={`${result.kind}-${result.id}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onNavigate(result)}
              >
                <span className="search-result-icon">
                  <ResultIcon />
                </span>
                <span>
                  <b>{result.title}</b>
                  <small>{result.subtitle || "No additional details"}</small>
                </span>
                <em>{result.kind}</em>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function ChangePasswordForm({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.changePassword({ currentPassword, newPassword });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Current password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label>
        New password
        <input
          required
          minLength="8"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <label>
        Confirm new password
        <input
          required
          minLength="8"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={saving}>
        {saving ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
const formFieldCatalog = [
  ["text", "Text", Type],
  ["paragraph", "Paragraph", AlignLeft],
  ["email", "Email", Mail],
  ["phone", "Phone", Phone],
  ["number", "Number", Hash],
  ["date", "Date", CalendarDays],
  ["time", "Time", Clock],
  ["checkbox", "Checkbox", CheckSquare],
  ["select", "Dropdown", List],
  ["location", "Exact location", LocateFixed],
];
const newField = (type) => ({
  id: globalThis.crypto?.randomUUID?.() || `${type}-${Date.now()}`,
  type,
  label: formFieldCatalog.find(([name]) => name === type)?.[1] || "Field",
  required: false,
  ...(type === "select" ? { options: ["Option 1", "Option 2"] } : {}),
});
function LocationButton({ value, onChange }) {
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");
  const detect = () => {
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setFinding(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
          accuracy: Math.round(coords.accuracy),
        });
        setFinding(false);
      },
      (failure) => {
        setError(
          failure.code === 1
            ? "Allow location access in your browser, then try again."
            : "Your location could not be detected. Try again outdoors.",
        );
        setFinding(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return (
    <div className="location-button">
      <button type="button" className="outline" onClick={detect} disabled={finding}>
        <LocateFixed /> {finding ? "Detecting…" : "Use my exact location"}
      </button>
      {value?.lat && (
        <span>
          {value.lat}, {value.lng}
          {value.accuracy ? ` · within ${value.accuracy} m` : ""}
        </span>
      )}
      {error && <small className="error-text">{error}</small>}
    </div>
  );
}
function FormMaker({ initial, onSave, onCancel }) {
  const [data, setData] = useState(
    initial || {
      title: "",
      description: "",
      email_to: "",
      columns: 1,
      active: true,
      fields: [],
    },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const draggedField = useRef(null);
  const add = (type) =>
    setData((current) => ({
      ...current,
      fields: [...current.fields, newField(type)],
    }));
  const updateField = (index, update) =>
    setData((current) => ({
      ...current,
      fields: current.fields.map((field, i) =>
        i === index ? { ...field, ...update } : field,
      ),
    }));
  const moveField = (from, to) => {
    if (from === null || from === to || from < 0 || to < 0) return;
    setData((current) => {
      const fields = [...current.fields];
      const [moved] = fields.splice(from, 1);
      fields.splice(to, 0, moved);
      return { ...current, fields };
    });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...data,
        fields: data.fields.map(({ optionsText, ...field }) => ({
          ...field,
          ...(field.type === "select"
            ? {
                options: String(
                  optionsText ?? (field.options || []).join(", "),
                )
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
            : {}),
        })),
      });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="form-builder" onSubmit={save}>
      <div className="builder-details">
        <label>
          Form title
          <input
            required
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </label>
        <label>
          Email submissions to
          <input
            required
            type="email"
            placeholder="team@example.com"
            value={data.email_to}
            onChange={(e) => setData({ ...data, email_to: e.target.value })}
          />
        </label>
        <label>
          Form columns
          <select
            value={data.columns || 1}
            onChange={(e) =>
              setData({ ...data, columns: Number(e.target.value) })
            }
          >
            <option value="1">1 column</option>
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
          </select>
        </label>
        <label className="wide">
          Description
          <textarea
            rows="2"
            value={data.description || ""}
            onChange={(e) => setData({ ...data, description: e.target.value })}
          />
        </label>
      </div>
      <div className="maker-workspace">
        <aside className="field-palette">
          <h3>Available fields</h3>
          <p>Drag a field to the canvas, or tap it on mobile.</p>
          {formFieldCatalog.map(([type, label, Icon]) => (
            <button
              type="button"
              draggable
              key={type}
              onDragStart={(event) =>
                event.dataTransfer.setData("text/form-field", type)
              }
              onClick={() => add(type)}
            >
              <Icon /> {label}
            </button>
          ))}
        </aside>
        <section
          className="form-canvas"
          style={{ "--canvas-columns": data.columns || 1 }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("text/form-field");
            if (type) add(type);
          }}
        >
          <header>
            <div>
              <h3>Form canvas</h3>
              <p>Edit each label after adding a field.</p>
            </div>
            <span>
              {data.fields.length} fields · {data.columns || 1}{" "}
              {(data.columns || 1) === 1 ? "column" : "columns"}
            </span>
          </header>
          {!data.fields.length && (
            <div className="canvas-empty">
              <GripVertical />
              <b>Drop fields here</b>
              <span>You can also tap fields in the list.</span>
            </div>
          )}
          <div className="canvas-fields">
          {data.fields.map((field, index) => (
            <article
              className={`builder-field ${
                ["paragraph", "location"].includes(field.type)
                  ? "full-width"
                  : ""
              }`}
              key={field.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveField(draggedField.current, index);
                draggedField.current = null;
              }}
            >
              <button
                type="button"
                className="field-drag-handle"
                draggable
                aria-label={`Move ${field.label}. Use drag and drop or the arrow keys.`}
                onDragStart={(event) => {
                  draggedField.current = index;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/field-index", String(index));
                }}
                onDragEnd={() => {
                  draggedField.current = null;
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveField(index, Math.max(0, index - 1));
                  }
                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    moveField(
                      index,
                      Math.min(data.fields.length - 1, index + 1),
                    );
                  }
                }}
              >
                <GripVertical />
              </button>
              <div>
                <label>
                  Field label
                  <input
                    required
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                  />
                </label>
                {field.type === "select" && (
                  <label>
                    Dropdown options (comma separated)
                    <input
                      placeholder="Option 1, Option 2, Option 3"
                      value={
                        field.optionsText ?? (field.options || []).join(", ")
                      }
                      onChange={(e) =>
                        updateField(index, {
                          optionsText: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {(field.type === "date" || field.type === "time") && (
                  <small className="field-help">
                    Automatically uses the user’s current local {field.type} and
                    cannot be edited.
                  </small>
                )}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  Required
                </label>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${field.label}`}
                onClick={() =>
                  setData({
                    ...data,
                    fields: data.fields.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 />
              </button>
            </article>
          ))}
          </div>
        </section>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={data.active !== false}
          onChange={(e) => setData({ ...data, active: e.target.checked })}
        />
        Make this form available to users
      </label>
      {error && <div className="error">{error}</div>}
      <div className="builder-actions">
        <button type="button" className="outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={saving}>
          {saving ? "Saving…" : "Save form"}
        </button>
      </div>
    </form>
  );
}
function FillForm({ form, onDone }) {
  const [values, setValues] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString();
    return Object.fromEntries(
      form.fields
        .filter((field) => field.type === "date" || field.type === "time")
        .map((field) => [
          field.id,
          field.type === "date" ? local.slice(0, 10) : local.slice(11, 16),
        ]),
    );
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const input = (field) => {
    const common = {
      required: field.required,
      value: values[field.id] || "",
      onChange: (e) => setValues({ ...values, [field.id]: e.target.value }),
    };
    if (field.type === "paragraph") return <textarea rows="4" {...common} />;
    if (field.type === "select")
      return (
        <select {...common}>
          <option value="">Choose an option</option>
          {(field.options || []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );
    if (field.type === "checkbox")
      return (
        <input
          type="checkbox"
          checked={Boolean(values[field.id])}
          onChange={(e) =>
            setValues({ ...values, [field.id]: e.target.checked })
          }
        />
      );
    if (field.type === "location")
      return (
        <LocationButton
          value={values[field.id]}
          onChange={(value) => setValues({ ...values, [field.id]: value })}
        />
      );
    const type =
      field.type === "phone" ? "tel" : field.type === "text" ? "text" : field.type;
    return (
      <input
        type={type}
        {...common}
        readOnly={field.type === "date" || field.type === "time"}
      />
    );
  };
  return (
    <form
      className="form dynamic-form"
      style={{ "--form-columns": form.columns || 1 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
          await api.submitForm(form.id, values);
          onDone();
        } catch (failure) {
          setError(failure.message);
        } finally {
          setSaving(false);
        }
      }}
    >
      {form.description && <p className="form-description">{form.description}</p>}
      <div className="dynamic-form-grid">
        {form.fields.map((field) => (
          <label
            key={field.id}
            className={`${field.type === "checkbox" ? "check" : ""} ${
              ["paragraph", "location"].includes(field.type) ? "full-width" : ""
            }`}
          >
            {field.type === "checkbox" ? input(field) : null}
            {field.label}
            {field.required && <em>Required</em>}
            {field.type !== "checkbox" ? input(field) : null}
          </label>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={saving}>
        {saving ? "Submitting…" : "Submit form"}
      </button>
    </form>
  );
}
function FormsPage({ canManage }) {
  const [forms, setForms] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [filling, setFilling] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [notice, setNotice] = useState("");
  const load = () => api.forms().then(setForms).catch(() => setForms([]));
  useEffect(() => {
    load();
  }, []);
  if (builder)
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{builder.id ? "Edit form" : "Create a form"}</h1>
            <p>Build a reusable form and choose where submissions are emailed.</p>
          </div>
        </div>
        <FormMaker
          initial={builder.id ? builder : null}
          onCancel={() => setBuilder(null)}
          onSave={async (data) => {
            if (builder.id) await api.updateForm(builder.id, data);
            else await api.createForm(data);
            setBuilder(null);
            load();
          }}
        />
      </>
    );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Forms</h1>
          <p>
            {canManage
              ? "Create forms, review submissions, and manage availability."
              : "Choose a form to fill out and submit."}
          </p>
        </div>
        {canManage && (
          <button className="primary" onClick={() => setBuilder({})}>
            <Plus /> Create form
          </button>
        )}
      </div>
      {notice && <div className="success-notice">{notice}</div>}
      <div className="forms-grid">
        {forms.map((form) => (
          <article className="form-card" key={form.id}>
            <div className="module-icon purple">
              <ClipboardList />
            </div>
            <div>
              <h2>{form.title}</h2>
              <p>{form.description || "No description provided."}</p>
              <small>
                {form.fields.length} fields
                {canManage ? ` · sends to ${form.email_to}` : ""}
              </small>
              {!form.active && <span className="draft-badge">Inactive</span>}
            </div>
            <div className="form-card-actions">
              {form.active && (
                <button className="primary" onClick={() => setFilling(form)}>
                  <ClipboardList /> Fill out
                </button>
              )}
              {canManage && (
                <>
                  <button className="outline" onClick={() => setBuilder(form)}>
                    <Pencil /> Edit
                  </button>
                  <button
                    className="outline"
                    onClick={async () => {
                      setViewing(form);
                      setSubmissions(await api.formSubmissions(form.id));
                    }}
                  >
                    <Eye /> Submissions
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${form.title}`}
                    onClick={async () => {
                      if (confirm(`Delete "${form.title}" and all submissions?`)) {
                        await api.deleteForm(form.id);
                        load();
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!forms.length && (
        <Empty
          title="No forms available"
          body={canManage ? "Create the first form for your team." : "Check back later."}
        />
      )}
      {filling && (
        <Modal title={filling.title} onClose={() => setFilling(null)}>
          <FillForm
            form={filling}
            onDone={() => {
              setFilling(null);
              setNotice("Your form was submitted successfully.");
            }}
          />
        </Modal>
      )}
      {viewing && (
        <Modal
          title={`${viewing.title} submissions`}
          onClose={() => setViewing(null)}
        >
          <div className="submission-list">
            {submissions.map((submission) => (
              <article key={submission.id}>
                <header>
                  <b>{submission.submitted_by_name}</b>
                  <time>{new Date(submission.submitted_at).toLocaleString()}</time>
                </header>
                {viewing.fields.map((field) => {
                  const value = submission.values[field.id];
                  return (
                    <p key={field.id}>
                      <strong>{field.label}</strong>
                      <span>
                        {value && typeof value === "object"
                          ? `${value.lat}, ${value.lng}`
                          : value === true
                            ? "Yes"
                            : value === false
                              ? "No"
                              : String(value ?? "—")}
                      </span>
                    </p>
                  );
                })}
                <small>Email: {submission.email_status}</small>
              </article>
            ))}
            {!submissions.length && (
              <Empty title="No submissions" body="This form has not been submitted yet." />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function NotificationBell({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => api.broadcasts().then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);
  const unread = items.filter((item) => !item.read).length;
  const openMessage = async (item) => {
    if (!item.read) {
      await api.readBroadcast(item.id).catch(() => {});
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, read: true } : entry,
        ),
      );
    }
    setOpen(false);
    onNavigate();
  };
  return (
    <div className="notification-wrap">
      <button
        className="icon-btn notification-button"
        aria-label={`${unread} unread notifications`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell />
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notification-menu">
          <header>
            <b>Notifications</b>
            <span>{unread ? `${unread} unread` : "You're caught up"}</span>
          </header>
          <div>
            {items.slice(0, 8).map((item) => (
              <button
                key={item.id}
                className={item.read ? "" : "unread"}
                onClick={() => openMessage(item)}
              >
                <Megaphone />
                <span>
                  <b>{item.title}</b>
                  <small>{item.body}</small>
                  <time>{new Date(item.created_at).toLocaleString()}</time>
                </span>
              </button>
            ))}
            {!items.length && <p>No broadcast notifications yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
function App() {
  const [logged, setLogged] = useState(false),
    [checking, setChecking] = useState(true),
    [role, setRole] = useState("user"),
    [user, setUser] = useState(null),
    [page, setPage] = useState("Dashboard"),
    [theme, setTheme] = useState(localStorage.theme || "light"),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(null),
    [editing, setEditing] = useState(null),
    [map, setMap] = useState(null),
    [gates, setGates] = useState([]),
    [locks, setLocks] = useState([]),
    [directoryPeople, setDirectoryPeople] = useState([]),
    [positionTitles, setPositionTitles] = useState([]),
    [calculatorInitialTab, setCalculatorInitialTab] = useState("calculators"),
    [accountOpen, setAccountOpen] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false),
    [searchActive, setSearchActive] = useState(false);
  const loginUser = async (nextUser) => {
    setUser(nextUser);
    setRole(nextUser.role);
    setLogged(true);
    const data = await api.bootstrap();
    setGates(data.gates);
    setLocks(data.locks);
    setDirectoryPeople(data.people);
    setPositionTitles(data.positionTitles);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.theme = theme;
  }, [theme]);
  useEffect(() => {
    api
      .me()
      .then(({ user }) => loginUser(user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const navigateToPage = (target) => {
    if (target === "Signal Calculators") setCalculatorInitialTab("calculators");
    setPage(target);
  };
  const signOut = async () => {
    await api.logout();
    setLogged(false);
    setUser(null);
    setAccountOpen(false);
  };
  if (checking) return <div className="loading">Loading AccessHub…</div>;
  if (!logged)
    return (
      <Login theme={theme} toggleTheme={toggleTheme} onLogin={loginUser} />
    );
  const canManage = role === "admin" || user?.position_title === "Supervisor";
  const content =
    page === "Dashboard" ? (
      <Dashboard
        go={navigateToPage}
        setModal={setModal}
        canManage={canManage}
        user={user}
      />
    ) : page === "Gate Codes" ? (
      <Records
        kind={page}
        items={gates}
        setItems={setGates}
        query={query}
        setModal={setModal}
        setMap={setMap}
        setEditing={setEditing}
        canManage={canManage}
      />
    ) : page === "Lockboxes & Keys" ? (
      <Records
        kind={page}
        items={locks}
        setItems={setLocks}
        query={query}
        setModal={setModal}
        setMap={setMap}
        setEditing={setEditing}
        canManage={canManage}
      />
    ) : page === "Directory" ? (
      <Directory query={query} entries={directoryPeople} />
    ) : page === "Users" ? (
      <UsersPage
        people={directoryPeople}
        setPeople={setDirectoryPeople}
        positionTitles={positionTitles}
        setPositionTitles={setPositionTitles}
      />
    ) : page === "Messages" ? (
      <WorkingMessages
        people={directoryPeople}
        currentUser={user}
        canManage={canManage}
      />
    ) : page === "Files" ? (
      <FilesPage query={query} canManage={canManage} />
    ) : page === "Links" ? (
      <LinksPage query={query} canManage={canManage} />
    ) : page === "Forms" ? (
      <FormsPage canManage={canManage} />
    ) : page === "Signal Calculators" ? (
      <SignalCalculators
        isAdmin={role === "admin"}
        currentUserId={user?.id}
        initialTab={calculatorInitialTab}
      />
    ) : page === "Modules" ? (
      <Modules
        onConfigure={(moduleName) => {
          setCalculatorInitialTab(moduleName === "Signal Calculators" ? "admin" : "calculators");
          setPage(moduleName);
        }}
      />
    ) : (
      <SettingsPage theme={theme} toggleTheme={toggleTheme} />
    );
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span>
            <LockKeyhole />
          </span>
          Access<span>Hub</span>
          <IconButton onClick={() => setMenu(false)}>
            <X />
          </IconButton>
        </div>
        <nav>
          {nav
            .filter(
              ([n]) =>
                (n === "Users" && canManage) ||
                (role === "admin" && ["Modules", "Settings"].includes(n)) ||
                !["Users", "Modules", "Settings"].includes(n),
            )
            .map(([n, I]) => (
              <button
                className={page === n ? "active" : ""}
                onClick={() => {
                  navigateToPage(n);
                  setMenu(false);
                }}
                key={n}
              >
                <I />
                {n}
              </button>
            ))}
        </nav>
        <button className="signout" onClick={signOut}>
          <LogOut />
          Sign out
        </button>
      </aside>
      <div className="shell">
        <header className="topbar">
          <IconButton className="mobile-menu" onClick={() => setMenu(true)}>
            <Menu />
          </IconButton>
          <div className="search">
            <Search />
            <input
              placeholder="Search gate codes, lockboxes, users, or messages…"
              value={query}
              onFocus={() => setSearchActive(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchActive(true);
              }}
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setSearchActive(false);
                }}
              >
                <X />
              </button>
            )}
            {searchActive && query && (
              <GlobalSearchResults
                query={query}
                onNavigate={(result) => {
                  navigateToPage(result.page);
                  setQuery("");
                  setSearchActive(false);
                }}
              />
            )}
          </div>
          <span className="live">
            <i />
            Live
          </span>
          <NotificationBell onNavigate={() => setPage("Messages")} />
          <IconButton onClick={toggleTheme}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </IconButton>
          <div className="profile-wrap">
            <button
              className="profile"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen(!accountOpen)}
            >
              <span>{user?.full_name?.[0] || "A"}</span>
              <b>
                {user?.full_name || user?.username}
                <small>
                  {role === "admin"
                    ? "Administrator"
                    : user?.position_title || "User"}
                </small>
              </b>
              <ChevronDown />
            </button>
            {accountOpen && (
              <div className="account-menu">
                <header>
                  <div className="account-avatar">
                    {user?.full_name?.[0] || "A"}
                  </div>
                  <div>
                    <strong>{user?.full_name || user?.username}</strong>
                    <span>{user?.email || "No email address"}</span>
                  </div>
                </header>
                <dl>
                  <div>
                    <dt>Username</dt>
                    <dd>{user?.username}</dd>
                  </div>
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {role === "admin"
                        ? "Administrator"
                        : user?.position_title || "Not assigned"}
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{user?.phone || "Not provided"}</dd>
                  </div>
                </dl>
                <button
                  onClick={() => {
                    setPasswordOpen(true);
                    setAccountOpen(false);
                  }}
                >
                  <KeyRound /> Change password
                </button>
                <button onClick={signOut}>
                  <LogOut /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main>{content}</main>
      </div>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}{" "}
      {modal && (
        <Modal
          title={
            modal === "message"
              ? "New message"
              : modal === "user"
                ? "Add user"
                : modal === "gate"
                  ? "Add gate code"
                  : "Add lockbox"
          }
          onClose={() => setModal(null)}
        >
          <RecordForm
            type={modal}
            onSave={async (data) => {
              if (modal === "gate") {
                const saved = await api.createGate(data);
                setGates([...gates, saved]);
                if (saved.status === "draft")
                  alert("Gate code submitted as a draft for approval.");
              }
              if (modal === "lock") {
                const saved = await api.createLock(data);
                setLocks([...locks, saved]);
                if (saved.status === "draft")
                  alert("Lockbox submitted as a draft for approval.");
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Edit ${editing.type === "gate" ? "gate code" : "lockbox"}`}
          onClose={() => setEditing(null)}
        >
          <RecordForm
            type={editing.type}
            initial={editing.record}
            onSave={async (data) => {
              if (editing.type === "gate") {
                const saved = await api.updateGate(editing.record.id, data);
                setGates(
                  gates.map((item) => (item.id === saved.id ? saved : item)),
                );
              } else {
                const saved = await api.updateLock(editing.record.id, data);
                setLocks(
                  locks.map((item) => (item.id === saved.id ? saved : item)),
                );
              }
              setEditing(null);
            }}
          />
        </Modal>
      )}
      {passwordOpen && (
        <Modal title="Change password" onClose={() => setPasswordOpen(false)}>
          <ChangePasswordForm
            onDone={() => {
              setPasswordOpen(false);
              alert("Your password has been changed.");
            }}
          />
        </Modal>
      )}
      {map && (
        <Modal title={map.property} onClose={() => setMap(null)}>
          <MapPreview record={map} />
          <h3>{map.location}</h3>
          <p>{map.address}</p>
          <a
            className="primary map-link"
            target="_blank"
            rel="noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${map.lat}&mlon=${map.lng}#map=18/${map.lat}/${map.lng}`}
          >
            Open full map <ChevronRight />
          </a>
        </Modal>
      )}
    </div>
  );
}
function LockboxLocationPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null);
  const latitude = Number(lat) || 21.3069;
  const longitude = Number(lng) || -157.8583;
  const selectPoint = (event) => {
    const bounds = mapRef.current.getBoundingClientRect();
    const zoom = 18;
    const world = 256 * 2 ** zoom;
    const centerX = ((longitude + 180) / 360) * world;
    const radians = (latitude * Math.PI) / 180;
    const centerY =
      ((1 -
        Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
        2) *
      world;
    const x = centerX + event.clientX - bounds.left - bounds.width / 2;
    const y = centerY + event.clientY - bounds.top - bounds.height / 2;
    const nextLng = (x / world) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / world;
    const nextLat = (180 / Math.PI) * Math.atan(Math.sinh(n));
    onChange(nextLat.toFixed(6), nextLng.toFixed(6));
  };
  const span = 0.0028;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - span}%2C${latitude - span}%2C${longitude + span}%2C${latitude + span}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  return (
    <div className="lockbox-location">
      <div className="location-heading">
        <div>
          <b>Pinpoint location</b>
          <span>Tap the map or detect your current GPS location.</span>
        </div>
        <LocationButton
          value={lat && lng ? { lat, lng } : null}
          onChange={(value) => onChange(value.lat, value.lng)}
        />
      </div>
      <div
        ref={mapRef}
        className="pin-map"
        onClick={selectPoint}
        role="button"
        tabIndex="0"
        aria-label="Tap to set the lockbox coordinates"
      >
        <iframe title="Lockbox pin location" src={src} />
        <div className="map-click-layer" />
        <MapPin className="pin-center" />
        <span>Tap anywhere to move the pin</span>
      </div>
      <div className="coordinate-grid">
        <label>
          Latitude
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => onChange(e.target.value, lng)}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => onChange(lat, e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
function RecordForm({ type, onSave, initial = null }) {
  const defaults =
    type === "gate"
      ? {
          property: "",
          address: "",
          code: "",
          contact: "",
          notes: "",
          type: "code",
        }
      : type === "lock"
        ? {
            property: "",
            address: "",
            access: "Tech Master Key",
            location: "",
            lat: "21.3069",
            lng: "-157.8583",
          }
        : {};
  const normalized = initial
    ? type === "gate"
      ? {
          property: initial.property || "",
          address: initial.address || "",
          code: initial.code || "",
          contact: initial.contact || "",
          notes: initial.notes || "",
          type: initial.type || "code",
        }
      : {
          property: initial.property || "",
          address: initial.address || "",
          access: initial.access || "",
          location: initial.location || "",
          lat: initial.lat || "",
          lng: initial.lng || "",
        }
    : defaults;
  const [data, setData] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  if (type === "message")
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({});
        }}
      >
        <label>
          Recipients
          <select>
            <option>All users</option>
            <option>Field Team</option>
            <option>Security</option>
          </select>
        </label>
        <label>
          Message
          <textarea required rows="5" />
        </label>
        <button className="primary">Send message</button>
      </form>
    );
  if (type === "user")
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({});
        }}
      >
        <label>
          Full name
          <input required />
        </label>
        <label>
          Email
          <input type="email" required />
        </label>
        <label>
          Position title
          <input required />
        </label>
        <label>
          Group
          <select>
            <option>Field Team</option>
            <option>Security</option>
            <option>Operations</option>
          </select>
        </label>
        <button className="primary">Add user</button>
      </form>
    );
  return (
    <form className="form" onSubmit={submit}>
      {Object.keys(data)
        .filter((k) => k !== "type")
        .filter((k) => type !== "lock" || !["lat", "lng"].includes(k))
        .map((k) => (
          <label key={k}>
            {k[0].toUpperCase() + k.slice(1)}
            <input
              required={["property", "address", "location"].includes(k)}
              value={data[k]}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          </label>
        ))}
      {type === "lock" && (
        <LockboxLocationPicker
          lat={data.lat}
          lng={data.lng}
          onChange={(lat, lng) => setData({ ...data, lat, lng })}
        />
      )}
      {type === "gate" && (
        <label className="check">
          <input
            type="checkbox"
            checked={data.type === "manual"}
            onChange={(e) =>
              setData({
                ...data,
                type: e.target.checked ? "manual" : "code",
                code: e.target.checked ? "" : data.code,
              })
            }
          />
          Alternative access — contact POC instead of using a code
        </label>
      )}
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={saving}>
        {saving ? "Saving…" : initial ? "Save changes" : "Save record"}
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")).render(<App />);
