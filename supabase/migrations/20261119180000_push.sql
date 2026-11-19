-- Push notifications (APNs). The server cannot read messages, so a push only says WHO wrote, never what.
-- Tables: push_tokens (device tokens, own rows only), push_mutes (who I have muted, so the server can skip them),
-- push_sent (one push per message). messages.dp = plain flag "this is a double ping" (the only new thing the server learns).

alter table public.messages add column if not exists dp boolean not null default false;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'ios',
  updated_at timestamptz not null default now(),
  constraint push_tokens_len check (char_length(token) between 20 and 400)
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy pt_all on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_tokens from anon;

create table public.push_mutes (
  user_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  primary key (user_id, muted_id)
);
alter table public.push_mutes enable row level security;
create policy pm_all on public.push_mutes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_mutes from anon;

create table public.push_sent (
  msg_id bigint primary key references public.messages(id) on delete cascade,
  at timestamptz not null default now()
);
alter table public.push_sent enable row level security; -- no policies: only the service role touches it
revoke all on public.push_sent from anon, authenticated;

create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://frvnbcltyvcnyympmjua.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydm5iY2x0eXZjbnl5bXBtanVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTQ0MjEsImV4cCI6MjEwODI3MDQyMX0.eh5mH2kCPXXgbQ8wH-vzU2wDAmCJ43Oj-Y8mu6jNaiA'),
    body := jsonb_build_object('id', new.id));
  return null;
exception when others then
  return null; -- a failed push must never stop a message from being saved
end $$;
revoke all on function public.notify_push() from public, anon, authenticated;

create trigger messages_push after insert on public.messages
  for each row execute function public.notify_push();
