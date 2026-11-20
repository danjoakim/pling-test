/**
 * Remembering each friend's key, and noticing when it changes (claude/noekkelvarsel.md).
 *
 * Every account has one fixed key, also across devices, so a friend's key must never change. Before this the app took the key
 * straight from the server and nothing would have shown that someone had swapped it. Now the first key we see for a friend is
 * remembered on this device (trust on first use), and any later difference stops the chat until the person has chosen.
 *
 * Only the decisions live here. The glue in crypto-glue.js stores the pins, flags the friends and blocks sending.
 * tests/keypin-unit.js tests all of this.
 */

/** What is remembered about one friend: the fingerprint, when we first saw it, and when the two compared numbers (if they did). */
export interface Pin { fp: string; seen: number; verified?: number; via?: "invite" }
export type Pins = Record<string, Pin>
/** new = seen for the first time (now remembered), ok = same as before, changed = different, or the stated fingerprint is not the key's. */
export type KeyState = "new" | "ok" | "changed"

const FP = /^[0-9a-f]{32}$/;

/** Reads what was stored. Anything that is not exactly the right shape is dropped (a damaged entry is the same as no entry). */
export function parsePins(text: string | null): Pins {
  let j: unknown = null;
  try { j = text ? JSON.parse(text) : null } catch { return {} }
  const out: Pins = {};
  if (!j || typeof j !== "object" || Array.isArray(j)) return out;
  for (const [id, v] of Object.entries(j as Record<string, unknown>)) {
    const p = v as Partial<Pin> | null;
    if (!p || typeof p.fp !== "string" || !FP.test(p.fp) || typeof p.seen !== "number") continue;
    out[id] = { fp: p.fp, seen: p.seen, ...(typeof p.verified === "number" ? { verified: p.verified } : {}), ...(p.via === "invite" ? { via: "invite" as const } : {}) };
  }
  return out;
}

/**
 * `fromKey` is the fingerprint the app worked out itself from the public key; `stated` is what the server says it is.
 * They must agree, otherwise the server is inconsistent and the key cannot be trusted, even the first time.
 * Returns the state and the pins to store (the input is not changed).
 */
export function checkKey(pins: Pins, id: string, fromKey: string, stated: string, now: number): { state: KeyState; pins: Pins } {
  if (fromKey !== stated || !FP.test(fromKey)) return { state: "changed", pins };
  const have = pins[id];
  if (!have) return { state: "new", pins: { ...pins, [id]: { fp: fromKey, seen: now } } };
  return { state: have.fp === fromKey ? "ok" : "changed", pins };
}

/** The person chose to trust the new key. The old "compared" mark is gone: the new key has not been compared. */
export function acceptNew(pins: Pins, id: string, fp: string, now: number): Pins {
  return { ...pins, [id]: { fp, seen: now } };
}

/** The two have compared the safety number. Only a remembered key can be marked. */
export function markVerified(pins: Pins, id: string, now: number): Pins {
  const p = pins[id];
  return p ? { ...pins, [id]: { ...p, verified: now } } : pins;
}

/**
 * An invitation link can carry the inviter's fingerprint (`#inv=<token>&fp=<32 hex>`). The link reaches the new friend by another road than the
 * server (sent by message, shown as a QR code), so a key that matches it is checked without anyone comparing numbers. Returns the fingerprint or null.
 */
export function inviteFp(hash: string): string | null {
  const v = new URLSearchParams(hash.replace(/^#/, "")).get("fp");
  return v && FP.test(v) ? v : null;
}

/**
 * Remembers a friend's key from an invitation link: marked as compared (via the link). A key that is already remembered and differs is
 * not replaced (the change warning stays); the same key is upgraded to compared.
 */
export function pinFromInvite(pins: Pins, id: string, fp: string, now: number): Pins {
  const have = pins[id];
  if (have && have.fp !== fp) return pins;
  return { ...pins, [id]: { fp, seen: have ? have.seen : now, verified: now, via: "invite" } };
}

/** Removes the mark (the person changed their mind). */
export function clearVerified(pins: Pins, id: string): Pins {
  const p = pins[id];
  if (!p || p.verified === undefined) return pins;
  const { verified: _v, via: _w, ...rest } = p;
  return { ...pins, [id]: rest };
}

/** What the safety number row shows. A key that has not been accepted yet always shows as changed. */
export function rowState(state: KeyState, pin: Pin | undefined): "unverified" | "verified" | "changed" {
  if (state === "changed") return "changed";
  return pin && pin.verified !== undefined ? "verified" : "unverified";
}
