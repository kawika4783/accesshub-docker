create extension if not exists pg_trgm;
create table if not exists users(
 id bigint generated always as identity primary key,
 username text not null,
 password_hash text not null,
 full_name text not null,
 email text,
 phone text,
 position_title text,
 supervisor_id bigint references users(id) on delete set null,
 role text not null default 'user' check(role in('admin','user')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists users_username_lower_uidx on users(lower(username));
create index if not exists users_supervisor_id_idx on users(supervisor_id);
create table if not exists position_titles(
 id bigint generated always as identity primary key,
 name text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists position_titles_name_lower_uidx on position_titles(lower(name));
insert into position_titles(name) values
 ('Installer'),('Service Tech'),('SMB Tech'),('Enterprise Tech'),('Supervisor')
on conflict do nothing;
create table if not exists groups(id bigint generated always as identity primary key,name text not null unique,created_at timestamptz not null default now());
create table if not exists group_members(group_id bigint not null references groups(id) on delete cascade,user_id bigint not null references users(id) on delete cascade,primary key(group_id,user_id));
create index if not exists group_members_user_id_idx on group_members(user_id);
create table if not exists gate_codes(
 id bigint generated always as identity primary key,property text not null,address text not null,access_type text not null default 'code' check(access_type in('code','manual')),gate_code text,contact text,notes text,created_by bigint references users(id) on delete set null,status text not null default 'approved' check(status in('draft','approved')),approved_by bigint references users(id) on delete set null,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint gate_access_details_check check((access_type='code' and gate_code is not null and length(trim(gate_code))>0) or (access_type='manual' and notes is not null and length(trim(notes))>0))
);
create index if not exists gate_codes_created_by_idx on gate_codes(created_by);
create index if not exists gate_codes_search_idx on gate_codes using gin((property||' '||address||' '||coalesce(contact,'')||' '||coalesce(notes,'')) gin_trgm_ops);
create table if not exists lockboxes(
 id bigint generated always as identity primary key,property text not null,address text not null,access_method text not null,location_notes text not null,latitude numeric(9,6),longitude numeric(9,6),created_by bigint references users(id) on delete set null,status text not null default 'approved' check(status in('draft','approved')),approved_by bigint references users(id) on delete set null,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint lockbox_latitude_check check(latitude is null or latitude between -90 and 90),constraint lockbox_longitude_check check(longitude is null or longitude between -180 and 180)
);
create index if not exists lockboxes_created_by_idx on lockboxes(created_by);
create index if not exists lockboxes_search_idx on lockboxes using gin((property||' '||address||' '||access_method||' '||location_notes) gin_trgm_ops);
create table if not exists sessions(id_hash text primary key,user_id bigint not null references users(id) on delete cascade,expires_at timestamptz not null,created_at timestamptz not null default now());
create index if not exists sessions_user_id_idx on sessions(user_id);create index if not exists sessions_expires_at_idx on sessions(expires_at);
create table if not exists audit_log(id bigint generated always as identity primary key,user_id bigint references users(id) on delete set null,action text not null,entity_type text not null,entity_id bigint,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists audit_log_user_id_created_at_idx on audit_log(user_id,created_at desc);create index if not exists audit_log_entity_idx on audit_log(entity_type,entity_id);
create table if not exists messages(
 id bigint generated always as identity primary key,
 sender_id bigint not null references users(id) on delete cascade,
 recipient_id bigint references users(id) on delete cascade,
 body text not null check(length(trim(body))>0),
 created_at timestamptz not null default now()
);
create index if not exists messages_sender_created_idx on messages(sender_id,created_at desc);
create index if not exists messages_recipient_created_idx on messages(recipient_id,created_at desc);
create table if not exists files(
 id bigint generated always as identity primary key,
 storage_name text not null unique,
 original_name text not null,
 title text not null,
 notes text,
 mime_type text,
 size_bytes bigint not null check(size_bytes>=0),
 uploaded_by bigint not null references users(id) on delete restrict,
 uploaded_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists files_uploaded_by_idx on files(uploaded_by);
create index if not exists files_uploaded_at_idx on files(uploaded_at desc);
create index if not exists files_search_idx on files using gin((title||' '||original_name||' '||coalesce(notes,'')) gin_trgm_ops);
create table if not exists links(
 id bigint generated always as identity primary key,
 title text not null,
 url text not null,
 notes text,
 added_by bigint not null references users(id) on delete restrict,
 updated_by bigint references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists links_added_by_idx on links(added_by);
create index if not exists links_updated_at_idx on links(updated_at desc);
create index if not exists links_search_idx on links using gin((title||' '||url||' '||coalesce(notes,'')) gin_trgm_ops);
alter table gate_codes add column if not exists status text not null default 'approved';
alter table gate_codes add column if not exists approved_by bigint references users(id) on delete set null;
alter table gate_codes add column if not exists approved_at timestamptz;
alter table lockboxes add column if not exists status text not null default 'approved';
alter table lockboxes add column if not exists approved_by bigint references users(id) on delete set null;
alter table lockboxes add column if not exists approved_at timestamptz;
create index if not exists gate_codes_status_idx on gate_codes(status);
create index if not exists lockboxes_status_idx on lockboxes(status);
create table if not exists forms(
 id bigint generated always as identity primary key,
 title text not null,
 description text,
 email_to text not null,
 fields jsonb not null default '[]'::jsonb,
 active boolean not null default true,
 created_by bigint not null references users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists forms_active_updated_idx on forms(active,updated_at desc);
create table if not exists form_submissions(
 id bigint generated always as identity primary key,
 form_id bigint not null references forms(id) on delete cascade,
 submitted_by bigint not null references users(id) on delete restrict,
 values jsonb not null default '{}'::jsonb,
 email_to text not null,
 email_status text not null default 'pending' check(email_status in('pending','sent','failed')),
 submitted_at timestamptz not null default now()
);
create index if not exists form_submissions_form_time_idx on form_submissions(form_id,submitted_at desc);
create index if not exists form_submissions_user_time_idx on form_submissions(submitted_by,submitted_at desc);
alter table forms add column if not exists columns integer not null default 1;
alter table forms drop constraint if exists forms_columns_check;
alter table forms add constraint forms_columns_check check(columns between 1 and 3);
create table if not exists broadcasts(
 id bigint generated always as identity primary key,
 title text not null,
 body text not null,
 sender_id bigint not null references users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index if not exists broadcasts_created_at_idx on broadcasts(created_at desc);
create table if not exists broadcast_reads(
 broadcast_id bigint not null references broadcasts(id) on delete cascade,
 user_id bigint not null references users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(broadcast_id,user_id)
);
create index if not exists broadcast_reads_user_idx on broadcast_reads(user_id,read_at desc);
create table if not exists message_attachments(
 id bigint generated always as identity primary key,
 message_id bigint not null references messages(id) on delete cascade,
 storage_name text not null unique,
 original_name text not null,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 10485760),
 created_at timestamptz not null default now()
);
create index if not exists message_attachments_message_idx on message_attachments(message_id);
create table if not exists calculator_favorites(
 user_id bigint not null references users(id) on delete cascade,
 calculator_type text not null,
 created_at timestamptz not null default now(),
 primary key(user_id,calculator_type)
);
create table if not exists calculator_recent(
 user_id bigint not null references users(id) on delete cascade,
 calculator_type text not null,
 last_opened_at timestamptz not null default now(),
 primary key(user_id,calculator_type)
);
create index if not exists calculator_recent_user_time_idx on calculator_recent(user_id,last_opened_at desc);
create table if not exists saved_calculations(
 id bigint generated always as identity primary key,
 owner_user_id bigint not null references users(id) on delete cascade,
 calculator_type text not null,
 name text not null,
 inputs jsonb not null default '{}'::jsonb,
 outputs jsonb not null default '{}'::jsonb,
 property_reference text,
 address text,
 notes text,
 shared_with_team boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists saved_calculations_owner_time_idx on saved_calculations(owner_user_id,updated_at desc);
create index if not exists saved_calculations_type_idx on saved_calculations(calculator_type);
create table if not exists calculator_config(
 config_key text primary key,
 config_value jsonb not null,
 updated_by bigint references users(id) on delete set null,
 updated_at timestamptz not null default now()
);
