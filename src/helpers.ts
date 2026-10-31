/**
 * Small pure helpers that used to sit in the middle of main.js: reading an invitation from the page address, writing bytes in the
 * form used in invitation links, the list of friends we have muted on this device, and the "N days" text.
 *
 * - `inviteFromHash`: the page address may end in `#inv=<token>` (an invitation link; the part after # never goes to a server).
 *   It gives the token when it looks right (16 to 64 letters, digits, `_` and `-`), and the address part to put back after the
 *   token is taken out (`rest`, or null when there was no `inv` at all and the address stays as it is).
 * - `b64url`: bytes as URL-safe base64 without `=` (the form of the 128-bit token in an invitation link).
 * - `isMuted` / `withMuted`: the mute list is a JSON list of friend ids in browser storage, this device only. They take and give
 *   the stored text. Odd stored values behave as before: `isMuted` says no when it cannot read it; `withMuted` throws when the
 *   stored value is valid JSON but not a list (the old code did too, outside its `try`).
 * - `daysText`: "1 dag" or "N dager".
 *
 * tests/helpers-unit.js compares all of this with the old code.
 */
import { tr } from "./i18n";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** What an address fragment (with or without the leading #) holds: a valid invitation token or null, and the fragment to keep. */
export function inviteFromHash(hash: string): { token: string | null; rest: string | null } {
  const h = new URLSearchParams(hash.replace(/^#/, "")), t = h.get("inv");
  const token = t && TOKEN_RE.test(t) ? t : null;
  if (!h.has("inv")) return { token, rest: null };
  h.delete("inv");
  return { token, rest: h.toString() };
}

/** Bytes as URL-safe base64 without padding. */
export function b64url(u8: Uint8Array): string {
  return btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Whether `id` is in the stored mute list. `raw` is the stored text (null when there is none). */
export function isMuted(raw: string | null, id: string): boolean {
  try { return JSON.parse(raw || "[]").includes(id); } catch { return false; }
}

/** The stored text after muting (`on`) or unmuting `id`. An unreadable stored text counts as an empty list. */
export function withMuted(raw: string | null, id: string, on: boolean): string {
  let l: string[] = [];
  try { l = JSON.parse(raw || "[]"); } catch { /* start again with an empty list */ }
  l = l.filter(x => x !== id);
  if (on) l.push(id);
  return JSON.stringify(l);
}

/** "1 dag" or "7 dager". */
export function daysText(d: number): string {
  return d === 1 ? tr("exp.oneDay") : tr("exp.days", { n: d });
}
