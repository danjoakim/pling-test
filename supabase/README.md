# Supabase setup

Everything the backend needs, as code. Project: Frankfurt region, free plan.

## Contents

- `migrations/20261029000000_baseline.sql` - the whole schema as a snapshot: tables, indexes, functions,
  row level security, privileges, realtime publication, storage bucket, scheduled jobs.
- `functions/cleanup` - hourly job that deletes expired messages that have an encrypted file.
- `functions/linkpreview` - server-side link preview (SSRF-guarded). Needs a signed-in user.

## Rebuilding from scratch

1. Create a Supabase project.
2. Run the baseline migration. Replace `<PROJECT_REF>` and `<ANON_KEY>` in the last statement first.
3. Deploy both functions with `verify_jwt` enabled (`supabase functions deploy cleanup`, then `linkpreview`).

## Migration history (production)

The baseline replaces these, applied one by one between 2026-10-20 and 2026-10-28:
key_backups, key_transfers, profiles_personal_message, chat_expiry_per_chat, chat_files_bucket, chat_reads,
messages_file_column, enable_pg_net, enable_pg_cron, profiles_read_friends_only,
realtime_presence_per_user_private_channels, realtime_presence_policies_include_broadcast,
presence_track_allow_friends_temp_diagnostic, presence_track_back_to_owner_only, invites,
invites_fix_redeem_ambiguity, presence_table_friends_only, reactions, reactions_touch_invoker, blocks.

New changes go in new files named `YYYYMMDDHHMMSS_description.sql`. Never edit the baseline.

## Known differences and open points

- Production still has default table grants for `anon` on `blocks` and `reactions`. RLS stops any use, but
  the baseline revokes them. Fixing production needs an explicit approval.
- `linkpreview` has no rate limit.
- The realtime policies and `presence_topic_ok()` are unused since presence became a table. Can be dropped.
- Error messages from the SQL functions are Norwegian on purpose: the app shows them to the user as they
  are (the client does not parse them), and the app is Norwegian-only for now. For an English version they
  must be translated or replaced by error codes that the client maps to texts.
