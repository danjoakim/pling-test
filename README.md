# Prek! (test build)

An end-to-end encrypted chat app inspired by MSN Messenger: contacts with presence, personal messages,
the "double ping" (shakes the friend's window), animated smileys, and chats that can expire. The UI is Norwegian only during the test phase.

Test site: https://danjoakim.github.io/pling-test/ (the repo and storage keys still use the old name "pling").

Status: version 0.x, test phase. Not for general use yet.

## What is in this repo

| Path | What |
| --- | --- |
| `index.html` | The whole app as one generated file (HTML, CSS and JS inlined). Served by GitHub Pages. |
| `app/` | Sources and the build script that generates `index.html` (`npm run build`). |
| `tests/` | Browser tests with a fake Supabase client (`npm test`). |
| `.github/workflows/ci.yml` | Builds, checks that `index.html` is up to date, and runs the tests on every push. |
| `lib/` | Third-party code that is inlined into the build (QR code generator, with its license). |
| `supabase/` | Backend as code: schema migration and edge functions. See `supabase/README.md`. |
| `ARCHITECTURE.md` | How the pieces fit together and how the encryption works. |
| `DECISIONS.md` | Why things are the way they are. |

## Running it

Open `index.html` in a browser, or serve the folder with any static server. It talks to the Supabase
project configured inside the file (URL and the public anon key; the anon key is meant to be public).

## Developing

```
npm install && npx playwright install chromium
npm run build   # regenerate index.html from app/
npm test        # run the browser tests
```

## Security model in one paragraph

Message text, reactions and files are encrypted in the browser (ECDH P-256 + AES-GCM) before they are
sent. The server stores only ciphertext and cannot read it. Who may see what is enforced by Postgres row
level security, not by the client. Private keys stay in the browser; an optional recovery code or a
device-to-device transfer moves them to another device.
