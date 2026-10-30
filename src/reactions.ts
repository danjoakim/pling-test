/**
 * The logic behind reactions (the little pictures under a message). A reaction is sent like a message: encrypted with the chat key,
 * so the server only sees that "someone reacted to a message", never which reaction.
 *
 * The message id and the sender are also inside the encrypted part, and a reaction only counts if they match the row around it.
 * Otherwise the server (or someone with write access) could move a reaction to another message or put it in another person's name.
 *
 * tests/reactions-unit.js compares `loadReactions` with tests/fixtures/reactions-vectors.json (made by the JavaScript this replaced);
 * tests/reactions.js tries the whole thing between two users in a browser.
 */

/** reaction by user, per message: message id -> (user id -> kind of reaction) */
export type ReactionMap = Map<any, Map<string, string>>;

/** What the list call answers (the same shape as the Supabase client). */
type Listed = { data?: unknown; error?: unknown } | null | undefined;

/**
 * Reads and checks all reactions of a chat. `list` fetches the rows, `open` decrypts one (iv, ct) and gives back what the sender sealed
 * (or null), `ok` holds the kinds of reaction that exist. Returns the reactions and a signature of them (so the page can see whether
 * anything changed), or null if anything fails.
 */
export async function loadReactions(
  list: () => PromiseLike<Listed>,
  open: (iv: any, ct: any) => PromiseLike<any>,
  ok: ReadonlySet<string>,
): Promise<{ map: ReactionMap; sig: string } | null> {
  try {
    const r = await list();
    if (!r || r.error || !Array.isArray(r.data)) return null;
    const map: ReactionMap = new Map(), parts: string[] = [];
    for (const x of r.data) {
      const p = await open(x.iv, x.ct);
      // The message id and the sender are inside the encrypted part too, so the server cannot move a reaction to another message or person.
      if (!p || typeof p.r !== "string" || Number(p.m) !== Number(x.msg_id) || p.u !== x.user_id) continue;
      if (p.r === "" || !ok.has(p.r)) continue; // "" means the person removed their reaction
      let mp = map.get(x.msg_id);
      if (!mp) { mp = new Map(); map.set(x.msg_id, mp); }
      mp.set(x.user_id, p.r);
      parts.push(x.msg_id + ":" + x.user_id + ":" + p.r);
    }
    parts.sort();
    return { map, sig: parts.join("|") };
  } catch { return null; }
}

/** Groups one message's reactions by kind: kind -> the users who chose it, kinds in order of first appearance. */
export function groupReactions(mp: Map<string, string>): Map<string, string[]> {
  const g = new Map<string, string[]>();
  for (const [u, r] of mp) g.set(r, (g.get(r) || []).concat(u));
  return g;
}

/** Records your own choice right away (before the next fetch). `r` null removes it. */
export function applyReaction(rx: ReactionMap, mid: any, uid: string, r: string | null): void {
  let mp = rx.get(mid);
  if (!mp) { mp = new Map(); rx.set(mid, mp); }
  if (r) mp.set(uid, r); else mp.delete(uid);
}

/** What is encrypted and sent for a reaction. `r` null (removing) is sent as "". */
export function reactionPayload(r: string | null, mid: any, uid: string): { r: string; m: any; u: string } {
  return { r: r || "", m: mid, u: uid };
}

/**
 * Where the choose-menu goes: right edge in line with the message's button but at least 8 px from both sides of the screen,
 * above the message, or below it if there is no room above.
 */
export function menuPosition(
  a: { right: number; top: number; bottom: number }, w: number, h: number, viewWidth: number,
): { x: number; y: number } {
  const x = Math.min(Math.max(8, a.right - w), viewWidth - w - 8);
  let y = a.top - h - 6;
  if (y < 8) y = a.bottom + 6;
  return { x, y };
}
