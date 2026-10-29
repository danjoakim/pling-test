-- Baseline schema for the Supabase project (squashed snapshot, taken 2026-10-29).
--
-- WHY a snapshot and not the 20 original migrations: the first tables were created before migrations
-- were recorded, and several migrations only exist to undo earlier experiments (private presence
-- channels, 2026-10-25). This file describes the schema as it is now, in dependency order, so that an
-- empty Supabase project can be rebuilt from it. History (names only) is listed in supabase/README.md.
--
-- Differences from production, on purpose:
--   * The anon role has NO table privileges here. Production still has the Supabase default grants for
--     `anon` on public.blocks and public.reactions (RLS blocks them, there is no anon policy).
--     Fix pending approval: revoke all on public.blocks, public.reactions from anon.
--   * The pg_cron job that calls the cleanup function uses placeholders for the project ref and the
--     anon key (the production job embeds the public anon key).
--
-- User-facing error messages raised by the functions are Norwegian because the app is Norwegian-only
-- during the test phase (decision 2026-10-27). They are matched by the client in a few places
-- (for example 'finner ikke bruker'), so do not translate them without changing app/main.js.

-- ---------------------------------------------------------------- extensions
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid not null,
  fp text not null,
  name text not null,
  pub jsonb not null,
  created_at timestamptz not null default now(),
  pm text,
  constraint profiles_pkey primary key (id),
  constraint profiles_fp_key unique (fp),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_fp_check check (fp ~ '^[0-9a-f]{32}$'),
  constraint profiles_name_check check (char_length(name) >= 1 and char_length(name) <= 40),
  constraint profiles_pm_check check (pm is null or char_length(pm) <= 60)
);

create table public.avatars (
  id uuid not null,
  data text not null,
  updated_at timestamptz not null default now(),
  constraint avatars_pkey primary key (id),
  constraint avatars_id_fkey foreign key (id) references public.profiles(id) on delete cascade,
  constraint avatars_data_check check (char_length(data) <= 60000)
);

create table public.friend_requests (
  from_id uuid not null,
  to_id uuid not null,
  created_at timestamptz not null default now(),
  constraint friend_requests_pkey primary key (from_id, to_id),
  constraint friend_requests_from_id_fkey foreign key (from_id) references public.profiles(id) on delete cascade,
  constraint friend_requests_to_id_fkey foreign key (to_id) references public.profiles(id) on delete cascade,
  constraint friend_requests_check check (from_id <> to_id)
);

-- A friendship is one row with a < b (see least/greatest in the functions).
create table public.friends (
  a uuid not null,
  b uuid not null,
  created_at timestamptz not null default now(),
  constraint friends_pkey primary key (a, b),
  constraint friends_a_fkey foreign key (a) references public.profiles(id) on delete cascade,
  constraint friends_b_fkey foreign key (b) references public.profiles(id) on delete cascade,
  constraint friends_check check (a < b)
);

create table public.chats (
  id uuid not null default gen_random_uuid(),
  kind text not null default 'dm',
  created_at timestamptz not null default now(),
  exp_days integer not null default 0,
  constraint chats_pkey primary key (id),
  constraint chats_exp_days_check check (exp_days = any (array[0, 1, 7, 30])),
  constraint chats_kind_check check (kind = any (array['dm', 'group']))
);

create table public.chat_members (
  chat_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  constraint chat_members_pkey primary key (chat_id, user_id),
  constraint chat_members_chat_id_fkey foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint chat_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

-- Message text is end-to-end encrypted: the server only stores iv + ct. `file` is a plaintext storage
-- path on purpose (the cleanup job must be able to delete the file when the message expires).
create table public.messages (
  id bigint generated always as identity,
  chat_id uuid not null,
  sender uuid not null,
  iv text not null,
  ct text not null,
  exp timestamptz,
  created_at timestamptz not null default now(),
  file text,
  constraint messages_pkey primary key (id),
  constraint messages_chat_id_fkey foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint messages_sender_fkey foreign key (sender) references public.profiles(id) on delete cascade,
  constraint messages_ct_check check (char_length(ct) <= 100000),
  constraint messages_file_check check (file is null or char_length(file) <= 120),
  constraint messages_iv_check check (char_length(iv) <= 64)
);

create table public.reactions (
  msg_id bigint not null,
  user_id uuid not null default auth.uid(),
  chat_id uuid not null,
  iv text not null,
  ct text not null,
  updated_at timestamptz not null default now(),
  constraint reactions_pkey primary key (msg_id, user_id),
  constraint reactions_chat_id_fkey foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint reactions_msg_id_fkey foreign key (msg_id) references public.messages(id) on delete cascade,
  constraint reactions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint reactions_ct_check check (char_length(ct) <= 2000),
  constraint reactions_iv_check check (char_length(iv) <= 64)
);

-- Per-user read position, so "read" is the same on every device. Only the owner can read it.
create table public.chat_reads (
  chat_id uuid not null,
  user_id uuid not null,
  last_id bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint chat_reads_pkey primary key (chat_id, user_id),
  constraint chat_reads_chat_id_fkey foreign key (chat_id) references public.chats(id) on delete cascade,
  constraint chat_reads_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

-- Encrypted backup of the private key (recovery code) and device-to-device key transfer.
create table public.key_backups (
  user_id uuid not null,
  salt text not null,
  iv text not null,
  ct text not null,
  iter integer not null,
  updated_at timestamptz not null default now(),
  constraint key_backups_pkey primary key (user_id),
  constraint key_backups_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint key_backups_ct_check check (char_length(ct) <= 4000),
  constraint key_backups_iter_check check (iter >= 100000 and iter <= 5000000),
  constraint key_backups_iv_check check (char_length(iv) <= 64),
  constraint key_backups_salt_check check (char_length(salt) <= 64)
);

create table public.key_transfers (
  id uuid not null,
  user_id uuid not null,
  eph_pub jsonb not null,
  status text not null default 'pending',
  sender_pub jsonb,
  iv text,
  ct text,
  created_at timestamptz not null default now(),
  constraint key_transfers_pkey primary key (id),
  constraint key_transfers_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint key_transfers_ct_check check (ct is null or char_length(ct) <= 4000),
  constraint key_transfers_iv_check check (iv is null or char_length(iv) <= 64),
  constraint key_transfers_status_check check (status = any (array['pending', 'approved']))
);

-- Invite links: only the SHA-256 hash of the token is stored.
create table public.invites (
  id uuid not null default gen_random_uuid(),
  token_hash text not null,
  inviter uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid,
  used_at timestamptz,
  constraint invites_pkey primary key (id),
  constraint invites_token_hash_key unique (token_hash),
  constraint invites_inviter_fkey foreign key (inviter) references public.profiles(id) on delete cascade,
  constraint invites_used_by_fkey foreign key (used_by) references public.profiles(id) on delete set null,
  constraint invites_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$')
);

-- Presence is a table that only friends can read (via get_presence()), updated by a heartbeat.
create table public.presence (
  user_id uuid not null,
  st text not null default 'online',
  typ_chat uuid,
  typ_at timestamptz,
  seen_at timestamptz not null default now(),
  constraint presence_pkey primary key (user_id),
  constraint presence_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint presence_typ_chat_fkey foreign key (typ_chat) references public.chats(id) on delete set null,
  constraint presence_st_check check (st = any (array['online', 'away', 'busy', 'off']))
);

-- Private block list. Only the blocker can read it. Written only by block_user()/unblock_user().
create table public.blocks (
  blocker uuid not null default auth.uid(),
  blocked uuid not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  constraint blocks_pkey primary key (blocker, blocked),
  constraint blocks_blocked_fkey foreign key (blocked) references auth.users(id) on delete cascade,
  constraint blocks_blocker_fkey foreign key (blocker) references auth.users(id) on delete cascade,
  constraint blocks_check check (blocker <> blocked),
  constraint blocks_name_check check (char_length(name) <= 60)
);

-- ---------------------------------------------------------------- indexes
create index invites_inviter_idx on public.invites (inviter);
create index friend_requests_to_idx on public.friend_requests (to_id);
create index friends_b_idx on public.friends (b);
create index chat_members_user_idx on public.chat_members (user_id);
create index messages_chat_idx on public.messages (chat_id, id desc);
create index messages_sender_idx on public.messages (sender);
create index messages_exp_file_idx on public.messages (exp) where file is not null and exp is not null;
create index reactions_chat_idx on public.reactions (chat_id);
create index key_transfers_user_idx on public.key_transfers (user_id);

-- ---------------------------------------------------------------- functions
-- Every function uses `set search_path = ''` and fully qualified names. The security definer functions
-- are the API of the app; the helper functions only answer questions about the calling user.

create function public.is_member(c uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.chat_members where chat_id = c and user_id = (select auth.uid()))
$$;

create function public.is_friend(o uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.friends
    where a = least((select auth.uid()), o) and b = greatest((select auth.uid()), o))
$$;

-- WHY: the receiver of a pending request must be able to see the sender's name before accepting.
create function public.has_request_with(o uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friend_requests r
    where (r.from_id = (select auth.uid()) and r.to_id = o)
       or (r.to_id = (select auth.uid()) and r.from_id = o)
  )
$$;

-- In a one-to-one chat you can only post while the other member is still your friend.
create function public.can_post(c uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select public.is_member(c) and (
    not exists (select 1 from public.chats where id = c and kind = 'dm')
    or exists (select 1 from public.chat_members m
               where m.chat_id = c and m.user_id <> (select auth.uid()) and public.is_friend(m.user_id))
  )
$$;

-- Strangers can only be found by exact e-mail address (that is how friends are added).
create function public.find_by_email(p_email text)
  returns table(id uuid, name text, fp text, pub jsonb)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.fp, p.pub
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) and p.id <> (select auth.uid())
  limit 1
$$;

create function public.send_request(p_to uuid) returns text
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if p_to = me then raise exception 'ikke deg selv'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'lag profil først'; end if;
  if not exists (select 1 from public.profiles where id = p_to) then raise exception 'finner ikke bruker'; end if;
  if exists (select 1 from public.blocks where blocker = p_to and blocked = me) then raise exception 'finner ikke bruker'; end if;
  if exists (select 1 from public.blocks where blocker = me and blocked = p_to) then raise exception 'fjern blokkeringen først'; end if;
  if exists (select 1 from public.friends where a = least(me, p_to) and b = greatest(me, p_to)) then
    return 'friends';
  end if;
  if exists (select 1 from public.friend_requests where from_id = p_to and to_id = me) then
    delete from public.friend_requests where (from_id = p_to and to_id = me) or (from_id = me and to_id = p_to);
    insert into public.friends(a, b) values (least(me, p_to), greatest(me, p_to)) on conflict do nothing;
    return 'friends';
  end if;
  insert into public.friend_requests(from_id, to_id) values (me, p_to) on conflict do nothing;
  return 'pending';
end $$;

create function public.accept_request(p_from uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if not exists (select 1 from public.friend_requests where from_id = p_from and to_id = me) then
    raise exception 'ingen forespørsel';
  end if;
  delete from public.friend_requests where (from_id = p_from and to_id = me) or (from_id = me and to_id = p_from);
  insert into public.friends(a, b) values (least(me, p_from), greatest(me, p_from)) on conflict do nothing;
end $$;

create function public.remove_friend(p_other uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  delete from public.friends where a = least(me, p_other) and b = greatest(me, p_other);
  delete from public.friend_requests where (from_id = me and to_id = p_other) or (from_id = p_other and to_id = me);
end $$;

-- Blocking removes the friendship and any requests. The blocked person only ever gets neutral errors.
create function public.block_user(p_other uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); nm text;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if p_other = me then raise exception 'ikke deg selv'; end if;
  select coalesce(p.name,'') into nm from public.profiles p where p.id = p_other;
  if not found then raise exception 'finner ikke bruker'; end if;
  insert into public.blocks(blocker, blocked, name) values (me, p_other, left(nm,60))
    on conflict (blocker, blocked) do nothing;
  delete from public.friends where a = least(me, p_other) and b = greatest(me, p_other);
  delete from public.friend_requests where (from_id = me and to_id = p_other) or (from_id = p_other and to_id = me);
end $$;

create function public.unblock_user(p_other uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  delete from public.blocks where blocker = me and blocked = p_other;
end $$;

create function public.open_dm(p_other uuid) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); cid uuid;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if not exists (select 1 from public.friends where a = least(me, p_other) and b = greatest(me, p_other)) then
    raise exception 'ikke venner';
  end if;
  perform pg_advisory_xact_lock(hashtext(least(me, p_other)::text || greatest(me, p_other)::text));
  select c.id into cid from public.chats c
    where c.kind = 'dm'
      and exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = me)
      and exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = p_other)
      and (select count(*) from public.chat_members m where m.chat_id = c.id) = 2
    limit 1;
  if cid is null then
    insert into public.chats(kind) values ('dm') returning id into cid;
    insert into public.chat_members(chat_id, user_id) values (cid, me), (cid, p_other);
  end if;
  return cid;
end $$;

create function public.set_chat_expiry(p_chat uuid, p_days integer) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_member(p_chat) then raise exception 'ikke medlem'; end if;
  if p_days not in (0,1,7,30) then raise exception 'ugyldig verdi'; end if;
  update public.chats set exp_days = p_days where id = p_chat;
end $$;

create function public.mark_read(p_chat uuid, p_id bigint) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if not public.is_member(p_chat) then raise exception 'ikke medlem'; end if;
  insert into public.chat_reads(chat_id, user_id, last_id) values (p_chat, me, p_id)
  on conflict (chat_id, user_id) do update
    set last_id = greatest(public.chat_reads.last_id, excluded.last_id), updated_at = now();
end $$;

-- Presence heartbeat. typ = the chat the user is typing in (never the text).
create function public.set_presence(p_st text, p_typ uuid default null) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if p_st not in ('online','away','busy','off') then raise exception 'ugyldig status'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'lag profil først'; end if;
  if p_typ is not null and not public.is_member(p_typ) then p_typ := null; end if;
  insert into public.presence as pr (user_id, st, typ_chat, typ_at, seen_at)
  values (me, p_st, p_typ, case when p_typ is null then null else now() end, now())
  on conflict (user_id) do update set st = excluded.st, typ_chat = excluded.typ_chat, typ_at = excluded.typ_at, seen_at = now();
end $$;

create function public.get_presence()
  returns table(user_id uuid, st text, age_s double precision, typ_chat uuid, typ_age_s double precision)
  language sql stable security definer set search_path = ''
as $$
  select pr.user_id, pr.st,
         extract(epoch from (now() - pr.seen_at))::double precision,
         pr.typ_chat,
         case when pr.typ_at is null then null else extract(epoch from (now() - pr.typ_at))::double precision end
  from public.presence pr
  where (select auth.uid()) is not null and public.is_friend(pr.user_id)
$$;

create function public.create_invite(p_hash text) returns timestamptz
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); exp timestamptz;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'lag profil først'; end if;
  delete from public.invites where inviter = me and (expires_at < now() or used_by is not null) and coalesce(used_at, expires_at) < now() - interval '1 day';
  if (select count(*) from public.invites where inviter = me and used_by is null and expires_at > now()) >= 10 then
    raise exception 'for mange aktive invitasjoner';
  end if;
  insert into public.invites(token_hash, inviter) values (p_hash, me) returning expires_at into exp;
  return exp;
end $$;

-- Callable before login (anon) so the invite banner can show who invited you.
create function public.peek_invite(p_token text) returns text
  language sql stable security definer set search_path = ''
as $$
  select p.name from public.invites i join public.profiles p on p.id = i.inviter
  where i.token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and i.used_by is null and i.expires_at > now()
$$;

create function public.redeem_invite(p_token text) returns table(id uuid, name text)
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); inv public.invites%rowtype;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if not exists (select 1 from public.profiles pr where pr.id = me) then raise exception 'lag profil først'; end if;
  select * into inv from public.invites iv where iv.token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') for update;
  if not found or inv.used_by is not null or inv.expires_at <= now() then raise exception 'invitasjonen er utløpt eller brukt'; end if;
  if inv.inviter = me then raise exception 'dette er din egen invitasjon'; end if;
  if exists (select 1 from public.blocks b where b.blocker = inv.inviter and b.blocked = me) then raise exception 'invitasjonen er utløpt eller brukt'; end if;
  if exists (select 1 from public.blocks b where b.blocker = me and b.blocked = inv.inviter) then raise exception 'fjern blokkeringen først'; end if;
  delete from public.friend_requests fr where (fr.from_id = me and fr.to_id = inv.inviter) or (fr.from_id = inv.inviter and fr.to_id = me);
  insert into public.friends(a, b) values (least(me, inv.inviter), greatest(me, inv.inviter)) on conflict do nothing;
  update public.invites iv set used_by = me, used_at = now() where iv.id = inv.id;
  return query select p.id, p.name from public.profiles p where p.id = inv.inviter;
end $$;

create function public.revoke_invites() returns integer
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); n integer;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  delete from public.invites where inviter = me and used_by is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- Used only by RLS-free paths that once served private presence channels (unused since 2026-10-26).
create function public.presence_topic_ok(topic text, owner_only boolean) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select case
    when topic ~ '^pres:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      (substr(topic, 6)::uuid = (select auth.uid()))
      or (not owner_only and public.is_friend(substr(topic, 6)::uuid))
    else false
  end
$$;

-- Trigger functions.
-- WHY the server sets exp: so a client cannot choose its own expiry. Also rejects file paths that do
-- not belong to the chat.
create function public.msg_set_exp() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare d int;
begin
  if new.file is not null and new.file not like new.chat_id::text || '/%' then
    raise exception 'ugyldig filsti';
  end if;
  select exp_days into d from public.chats where id = new.chat_id;
  new.exp := case when coalesce(d,0) > 0 then now() + make_interval(days => d) else null end;
  return new;
end $$;

create function public.react_touch() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger messages_exp before insert on public.messages
  for each row execute function public.msg_set_exp();
create trigger react_touch before update on public.reactions
  for each row execute function public.react_touch();

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.chat_reads enable row level security;
alter table public.key_backups enable row level security;
alter table public.key_transfers enable row level security;
alter table public.invites enable row level security;
alter table public.presence enable row level security;
alter table public.blocks enable row level security;

-- Profiles are visible to the owner, friends and the two sides of a pending request. Never open this up:
-- it used to be `true` and exposed every name, personal message and public key (fixed 2026-10-25).
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_friend(id) or public.has_request_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy avatars_read on public.avatars for select to authenticated
  using (id = (select auth.uid()) or public.is_friend(id));
create policy avatars_insert on public.avatars for insert to authenticated
  with check (id = (select auth.uid()));
create policy avatars_update on public.avatars for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy avatars_delete on public.avatars for delete to authenticated
  using (id = (select auth.uid()));

create policy fr_read on public.friend_requests for select to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
create policy fr_delete on public.friend_requests for delete to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()));

create policy friends_read on public.friends for select to authenticated
  using (a = (select auth.uid()) or b = (select auth.uid()));

create policy chats_read on public.chats for select to authenticated using (public.is_member(id));
create policy members_read on public.chat_members for select to authenticated using (public.is_member(chat_id));

create policy msg_read on public.messages for select to authenticated
  using (public.is_member(chat_id) and (exp is null or exp > now()));
create policy msg_insert on public.messages for insert to authenticated
  with check (sender = (select auth.uid()) and public.can_post(chat_id));
create policy msg_delete on public.messages for delete to authenticated
  using (sender = (select auth.uid()));

create policy react_read on public.reactions for select to authenticated
  using (public.is_member(chat_id) and exists (select 1 from public.messages m where m.id = reactions.msg_id and m.chat_id = reactions.chat_id));
create policy react_insert on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_post(chat_id)
    and exists (select 1 from public.messages m where m.id = reactions.msg_id and m.chat_id = reactions.chat_id));
create policy react_update on public.reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_post(chat_id)
    and exists (select 1 from public.messages m where m.id = reactions.msg_id and m.chat_id = reactions.chat_id));

create policy reads_own on public.chat_reads for select to authenticated using (user_id = (select auth.uid()));

create policy kb_read on public.key_backups for select to authenticated using (user_id = (select auth.uid()));
create policy kb_insert on public.key_backups for insert to authenticated with check (user_id = (select auth.uid()));
create policy kb_update on public.key_backups for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy kb_delete on public.key_backups for delete to authenticated using (user_id = (select auth.uid()));

create policy kt_read on public.key_transfers for select to authenticated using (user_id = (select auth.uid()));
create policy kt_insert on public.key_transfers for insert to authenticated with check (user_id = (select auth.uid()));
create policy kt_update on public.key_transfers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy kt_delete on public.key_transfers for delete to authenticated using (user_id = (select auth.uid()));

create policy invites_select_own on public.invites for select to authenticated
  using ((select auth.uid()) = inviter);

create policy presence_select on public.presence for select to authenticated
  using ((select auth.uid()) = user_id or public.is_friend(user_id));

create policy blocks_read on public.blocks for select to authenticated
  using (blocker = (select auth.uid()));

-- ---------------------------------------------------------------- privileges
-- Supabase grants every privilege on new public tables to anon/authenticated/service_role by default.
-- Tighten to what the app needs (RLS still applies on top). anon gets nothing on tables.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.chat_reads, public.invites, public.presence from authenticated;
-- profiles: the client may update only name and pm (never fp or pub).
revoke update on public.profiles from authenticated;
grant update (name, pm) on public.profiles to authenticated;

-- Functions: no execute for public/anon unless stated; the app calls them as `authenticated`.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public.msg_set_exp(), public.react_touch() from authenticated;
grant execute on function public.peek_invite(text) to anon;

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table
  public.chat_members, public.friend_requests, public.friends, public.messages, public.presence, public.reactions;

-- Rules for private presence channels. Not used by the client since 2026-10-26 (presence is a table now).
-- Kept for the moment; safe to drop together with public.presence_topic_ok().
create policy presence_listen on realtime.messages for select to authenticated
  using (extension = any (array['presence', 'broadcast']) and public.presence_topic_ok((select realtime.topic()), false));
create policy presence_track on realtime.messages for insert to authenticated
  with check (extension = any (array['presence', 'broadcast']) and public.presence_topic_ok((select realtime.topic()), true));

-- ---------------------------------------------------------------- storage
-- Encrypted attachments. The first path segment is the chat id (checked by msg_set_exp and the policies).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-files', 'chat-files', false, 3145728, array['application/octet-stream'])
on conflict (id) do nothing;

create policy chat_files_select on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy chat_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and public.can_post(((storage.foldername(name))[1])::uuid));
create policy chat_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chat-files' and owner = (select auth.uid()));

-- ---------------------------------------------------------------- scheduled jobs (pg_cron)
-- Replace <PROJECT_REF> and <ANON_KEY> before running. Files must be deleted through the Storage API
-- (edge function `cleanup`), never with SQL, otherwise the file stays behind and keeps using space.
select cron.schedule('pling-cleanup-db', '7 * * * *', $job$
  delete from public.messages where exp is not null and exp < now() and file is null;
  delete from public.key_transfers where created_at < now() - interval '1 hour';
  delete from cron.job_run_details where end_time < now() - interval '3 days';
$job$);

select cron.schedule('pling-cleanup-files', '17 * * * *', $job$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
    body := '{}'::jsonb);
$job$);
