/**
 * The rules for who is online and who is typing.
 *
 * The server keeps one presence row per person (status, last sign of life, and which chat they are typing in). The app learns about
 * it in two ways: a live event for a single changed row (`applyPresenceEvent`, which makes "typing" show up quickly, 26 Oct) and a
 * full list fetched every 12 seconds and after each event (`presenceFromRows`, which also drops people whose last sign of life is
 * too old). The functions here only decide; main.js draws. They change the maps they are given, as the old code did.
 *
 * Also here: `trackPlan` (we send our own presence at most every 2 seconds; a call that comes too early waits), `typingToSend` (we say
 * we are typing for 3 seconds after the last key) and `typingShown` (the "is typing" line shows for 3 seconds after we last saw it).
 *
 * tests/presence-unit.js compares all of this with the code in main.js that it replaced.
 *
 * Kept on purpose: `isStatus` is given by the caller and is `!!ST[s]`, which is also true for names every object has
 * ("constructor"); the database only allows the four real statuses, so this cannot happen in practice.
 */
import type { Status } from "./state";

/** Someone is typing in chat `c`: since `n` (ms), last seen at `seen` (ms). */
export interface TypingEntry { n: number; c: string; seen: number }

/** One changed presence row, as the live event carries it (`new` is the row after the change). */
export interface PresenceEvent { new?: { user_id?: string; st?: string; typ_chat?: string | null; typ_at?: string | null } | null }

/** One row of the full list from the server. */
export interface PresenceListRow {
  user_id: string; st: string; age_s: number | null; typ_chat?: string | null; typ_age_s?: number | null;
}

export interface PresenceWorld {
  /** the signed-in person, or null when signed out */
  me: string | null;
  pres: Map<string, Status>;
  typ: Map<string, TypingEntry>;
  /** the typing time of each person's last accepted "typing" signal (so the same signal is not counted twice) */
  typAt: Map<string, string>;
  isStatus: (s: string) => boolean;
}

/**
 * Uses one live event. Returns `used: false` when the event cannot be used (then the caller just fetches the list soon), and
 * otherwise whether the friend list and chat header must be redrawn because a status changed.
 */
export function applyPresenceEvent(w: PresenceWorld, p: PresenceEvent | null | undefined, now: number): { used: boolean; redraw: boolean } {
  const r = p && p.new;
  if (!w.me || !r || !r.user_id || r.user_id === w.me || !w.isStatus(r.st as string)) return { used: false, redraw: false };
  const uid = r.user_id;
  let redraw = false;
  if (r.st === "off") { if (w.pres.delete(uid)) redraw = true; }
  else if (w.pres.get(uid) !== r.st) { w.pres.set(uid, r.st as Status); redraw = true; }
  if (r.st !== "off" && r.typ_chat && r.typ_at) {
    if (w.typAt.get(uid) !== r.typ_at) { w.typAt.set(uid, r.typ_at); w.typ.set(uid, { n: now, c: r.typ_chat, seen: now }); }
  } else w.typ.delete(uid);
  return { used: true, redraw };
}

/**
 * Makes the map of who is online from the full list. Rows with an unknown status, with status "off", without age, or older than
 * `stale` seconds are left out. Our own status is added unless it is "off". People who are typing (signal younger than 3 s) are
 * put in `typ`.
 */
export function presenceFromRows(
  rows: PresenceListRow[],
  a: { me: string; status: Status; typ: Map<string, TypingEntry>; isStatus: (s: string) => boolean; stale: number },
  now: number,
): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const p of rows) {
    if (!a.isStatus(p.st) || p.st === "off" || p.age_s == null || p.age_s > a.stale) continue;
    m.set(p.user_id, p.st as Status);
    if (p.typ_chat && p.typ_age_s != null && p.typ_age_s < 3)
      a.typ.set(p.user_id, { n: Math.round(now - p.typ_age_s * 1000), c: p.typ_chat, seen: now - p.typ_age_s * 1000 });
  }
  if (a.status !== "off") m.set(a.me, a.status);
  return m;
}

/** Whether to send our presence now (`null`) or to wait this many ms (a send less than 2 s ago, unless `force`). */
export function trackPlan(now: number, lastTrack: number | undefined, force: boolean): { wait: number } | null {
  if (!force && now - (lastTrack || 0) < 2000) return { wait: 2000 - (now - (lastTrack as number)) };
  return null;
}

/** The chat we say we are typing in, or null when the last key was 3 seconds ago or more. */
export function typingToSend(myTyp: { c: string; n: number } | null | undefined, now: number): string | null {
  return myTyp && now - myTyp.n < 3000 ? myTyp.c : null;
}

/** Whether to show "X is typing" for the open chat, and when to look again (ms), or null when there is nothing to wait for. */
export function typingShown(
  x: TypingEntry | undefined, chat: { id: string; other: string }, pres: Map<string, Status>, now: number,
): { on: boolean; again: number | null } {
  const on = !!(x && x.c === chat.id && now - x.seen < 3000 && pres.has(chat.other));
  return { on, again: on ? 3100 - (now - x!.seen) : null };
}
