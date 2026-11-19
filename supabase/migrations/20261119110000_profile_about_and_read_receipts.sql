-- «Om meg»: kort tekst (maks 200 tegn) som kompisene dine, og de som har bedt om å bli det, ser (samme regel som navn og personlig melding).
alter table public.profiles add column about text;
alter table public.profiles add constraint profiles_about_check check (about is null or char_length(about) <= 200);
grant update (about) on public.profiles to authenticated;

-- Lesebekreftelse: den du snakker med kan se hvor langt du har lest i samtalen deres (bare id-en til siste leste melding).
create policy reads_chat_member on public.chat_reads for select to authenticated
  using (exists (select 1 from public.chat_members cm where cm.chat_id = chat_reads.chat_id and cm.user_id = (select auth.uid())));
