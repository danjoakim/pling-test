# Decisions

Short records of choices that are not obvious from the code. Newest last.

1. **No own server.** The browser talks to Supabase directly; RLS and SQL functions are the API. Fewer
   moving parts, and nothing of ours sees plaintext.
2. **End-to-end encryption in the browser** (ECDH P-256 + AES-GCM, Web Crypto). Chosen because it needs no
   libraries and works on every modern browser and phone.
3. **Profiles are not public.** Early versions let every user read every profile. Now only self, friends
   and pending-request partners can. Strangers are found by exact e-mail only.
4. **Presence is a table, not a Realtime presence channel.** Private presence channels were tried and
   dropped: the table version lets the database decide who is a friend. The old policies remain unused.
5. **Server-set expiry.** A trigger computes `exp` so a client cannot keep messages longer or shorter than
   the chat setting.
6. **Files are deleted through the Storage API**, never with SQL, so no file is left behind.
7. **Invites store only a hash** of the token, expire after 7 days and are limited to 10 active per user.
8. **Blocking is silent.** The blocked person gets the same errors as for an unknown user.
9. **One baseline migration** (2026-10-29) replaces the 20 incremental ones, many of which only undid
   earlier experiments. New changes are new migration files.
10. **English in the repo, Norwegian in the product.** Code, comments and docs are US English. The UI is
    Norwegian until an English version is added. SQL error messages stay Norwegian because the app shows
    them to the user as they are.
11. **Version 0.x.y until release.**
12. **Name:** the app is called Prek! (domain prek.es). Internal names (repo, storage keys, job names) still
    say "pling"; renaming them touches stored keys and needs a migration plan. Exception (2026-10-29): visible texts and download file names that
    said "Pling" now say "Prek!". The string `pling-safety:` that goes into the safety number hash must
    never change, or every safety number changes.
13. **Skipped for now:** file sharing in the UI, nicknames, custom smileys, GIF search, e-mail sender,
    push notifications, screenshot protection, video.
