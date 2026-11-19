-- Rapportering av én melding (Apple 1.2: brukere må kunne melde fra om støtende innhold).
-- Samtalene er ende-til-ende-krypterte; bare den ene meldingen brukeren velger å rapportere sendes til oss, som klartekst.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reported uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null,
  message_id bigint,
  reason text not null check (reason in ('spam','threat','offensive','other')),
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  constraint reports_diff check (reporter <> reported)
);
alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;

create function public.report_message(p_chat uuid, p_message bigint, p_reason text, p_text text, p_block boolean)
  returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := (select auth.uid()); other uuid;
begin
  if me is null then raise exception 'ikke innlogget'; end if;
  if p_reason not in ('spam','threat','offensive','other') then raise exception 'ugyldig grunn'; end if;
  if not exists (select 1 from public.chat_members where chat_id = p_chat and user_id = me) then raise exception 'ikke i samtalen'; end if;
  select cm.user_id into other from public.chat_members cm where cm.chat_id = p_chat and cm.user_id <> me limit 1;
  if other is null then raise exception 'finner ikke samtalen'; end if;
  insert into public.reports(reporter, reported, chat_id, message_id, reason, body)
    values (me, other, p_chat, p_message, p_reason, left(coalesce(p_text,''), 2000));
  if p_block then perform public.block_user(other); end if;
end $$;
revoke execute on function public.report_message(uuid, bigint, text, text, boolean) from public, anon;
grant execute on function public.report_message(uuid, bigint, text, text, boolean) to authenticated, service_role;
