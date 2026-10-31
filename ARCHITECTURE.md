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

## Front end, build and tests

The app is one generated page. Texts come from the language file `src/i18n/nb-NO.ts` through `tr("key")` (all user-visible text is there). All cryptography is TypeScript in `src/crypto.ts` (messages, files, keys, recovery code, safety number, invite hash; pure functions, no
app state; `main.js` never calls `crypto.subtle` itself), bundled by esbuild and inlined; `app/crypto-glue.js` connects it to browser storage, app state
and Supabase. The emoji codes and their conversion (`src/emoji.ts`) the avatar helpers (`src/avatar.ts`) the GIF encoder (`src/gif.ts`) the shrinking of pictures and GIFs (`src/shrink.ts`) the two sounds (`src/sound.ts`) the links with their previews (`src/links.ts`) the logic behind reactions (`src/reactions.ts`) the page helpers `$`, `el`, `toast`, `fail`, `q` (`src/dom.ts`), the short texts about a chat (`src/previews.ts`), friends and their order (`src/friends.ts`), presence and typing rules (`src/presence.ts`), unread and double-ping decisions (`src/unread.ts`), small helpers (`src/helpers.ts`) and the app state `S` with all its fields (`src/state.ts`, `PrekState.createState()`) are TypeScript too; `app/dom.js`, `app/emoji.js`, `app/avatar.js`, `app/gif.js`, `app/shrink.js`, `app/sound.js`, `app/links.js` and `app/reactions.js` just give them their old names. Every call to Supabase (tables, server functions, sign-in, file storage, live channel, edge function) goes through the typed module `src/api.ts` (`PrekApi.createApi(sb)`); `tests/api-unit.js` checks them against the SQL. The rest is still plain JavaScript: `app/main.js`, `app/views.js` (sign-in and key screens), `app/body.html` (static page; texts as `{{key}}`), `app/extra.css` and `app/anim.js` are the
sources; `app/build.py` inlines them into `index.html`. The old prototype files that the builder used to cut up and patch are gone: the status icon (`icon.js`), sound (`sound.js`), the start of the page script (`boot.js`) and the base CSS
(`style.css`) are normal source files now. Lines starting with `//#` (or `/*#` in CSS) at the top of a source file are developer notes that the builder leaves out. Always run `npm run build` and commit the regenerated `index.html`; CI fails if it
is out of date.

`tests/crypto-unit.js` tests the crypto module in Node against `tests/fixtures/crypto-vectors.json`, which
was produced by the pre-TypeScript code, so it proves old messages and key backups stay readable. Never
regenerate that file with new code.

`tests/` also holds browser tests (Node + Playwright) that run the built page against a fake Supabase client
(`tests/mock.js`). `npm test` runs them all. They cover login and sign-up, friends and blocking, muting, the
smiley preview, reactions, personal messages, the recovery code, device transfer and the key-missing screen.
Some tests only print what they see and fail on crashes or page errors, not on every wrong value.

## Code from others (`lib/`)
The page loads no code from the internet when it starts. `lib/supabase.js` (supabase-js 2.45.4, unchanged from npm, MIT) and `lib/qrcode.js` are copied into the repo; `lib/README.md` has the version and the SHA-256 so they can be checked. Until 31 Oct 2026 the Supabase library came from the jsdelivr CDN.

## Links and the desktop app
Links that other people open (invitation, e-mail link, QR code for linking a device) are built with `appBase` (`src/helpers.ts`): the page's own address on the web, the public web address (`PUBLIC_URL`) inside the desktop app, where the page's address is `tauri://localhost` or `http://tauri.localhost`. Change `PUBLIC_URL` when the web version moves.

## Content-Security-Policy
`app/build.py` puts a policy in the page (a `<meta http-equiv>` tag): only our own files and the two inline scripts (listed by their SHA-256, worked out from the finished page) may run; no `unsafe-eval`, no inline event attributes; the page may talk only to itself and to our Supabase project (https and wss). If something managed to put a `<script>` into the page, the browser would refuse to run it. `tests/csp.js` checks that the hashes match, that the page starts without violations and that injected scripts and foreign servers are refused; all other browser tests run under the policy too. Styles still allow inline (`style-src 'unsafe-inline'`) because the page sets style attributes.
