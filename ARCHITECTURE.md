# Architecture

## Overview

```
Browser (single index.html)  --supabase-js-->  Supabase (Frankfurt)
  - UI, crypto (Web Crypto)                      - Auth (e-mail/password)
  - private key in localStorage                  - Postgres + row level security + SQL functions
                                                 - Realtime (postgres_changes)
                                                 - Storage bucket `chat-files` (encrypted files)
                                                 - Edge functions: cleanup, linkpreview
```

There is no application server of our own. The browser calls table APIs (guarded by RLS) and SQL
functions (`rpc`) directly.

## Encryption

- Each user has an ECDH P-256 key pair created in the browser. The public key is stored in
  `profiles.pub`; `profiles.fp` is a fingerprint users can compare.
- For a chat, a shared AES-GCM key is derived from the sender's private key and the other member's public
  key. Every message is stored as `iv` + `ct` (base64). Reactions use the same scheme.
- Files are encrypted the same way and uploaded to the private bucket `chat-files`. The message row holds
  the storage path (plaintext on purpose, so the cleanup job can delete the file).
- The private key lives in `localStorage` under `pling_test_key_<user-id>`. Browser storage belongs to an
  origin, so moving the site to another domain loses the keys unless a recovery code or transfer is used.
- Recovery: `key_backups` holds the key encrypted with a key derived (PBKDF2) from a recovery code.
  Device transfer: `key_transfers` holds a short-lived exchange (deleted after one hour).
- Not hidden from the server: who talks to whom, when, message sizes, presence, and the plaintext file path.

## Data and access

Schema, functions and policies are in `supabase/migrations/`. Principles:

- Every table has RLS enabled. Clients get only the privileges they need.
- Writes that must be atomic or must hide information go through `SECURITY DEFINER` functions with
  `search_path = ''`: friend requests, blocking, opening a chat, invites, presence, expiry, read marks.
- Profiles are visible only to yourself, your friends and the two sides of a pending request.
- Strangers can only be found by exact e-mail address (`find_by_email`).
- The server, not the client, sets message expiry (trigger `messages_exp`).
- A blocked user gets the same neutral errors as a non-existing user.

## Features and where they live

- **Friends and invites:** `friend_requests`, `friends` (one row, `a < b`), `invites` (only a hash of the
  token is stored, links expire after 7 days).
- **Chats:** `chats`, `chat_members`, `messages`. One-to-one chats only for now (groups exist in the
  schema, not in the UI). Per-chat expiry of 0, 1, 7 or 30 days.
- **Presence and typing:** table `presence`, updated by a heartbeat (`set_presence`), read through
  `get_presence` (friends only). Changes arrive over Realtime.
- **Read state:** `chat_reads`, per user, so it is the same on every device.
- **Link previews:** edge function `linkpreview`, with SSRF protection. Needs a signed-in user.
- **Cleanup:** pg_cron jobs delete expired messages hourly; the `cleanup` function removes expired files
  through the Storage API.

## Front end

The app is one generated page. Sources (not yet in this repo) are `main.js`, `body.html`, `extra.css`,
`anim.js` and a Python build script that inlines them, plus tests with Node and Playwright against a fake
Supabase client. Moving them here, with CI, is the next cleanup step.
