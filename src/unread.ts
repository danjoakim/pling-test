/**
 * Unread messages, the sound for new messages, and the double-ping alert: the decisions only. main.js fetches, decrypts and draws.
 *
 * Rules that live here (they were written out inside `loadPreviews`, `loadMsgs` and `alertDp` in main.js):
 * - `dmChats`: which chat is the one-to-one chat with each friend (rows of `chat_members`; a chat counts when we are in it too).
 * - `unreadCount`: unread = messages from the other person newer than the last one we have read; none while that chat is open.
 * - `shouldRing`: the new-message sound plays when a chat has more unread than before, not on the first fetch after signing in,
 *   and not for a muted friend.
 * - `dpCandidate`: a message is checked for being a double ping only when it is from the other person, unread, not handled
 *   before, and younger than 30 seconds (`DP_FRESH`).
 * - `dpDecision`: each message sets off the alert at most once; an old message or a muted friend gives no alert.
 * - `freshMessages`: which messages in the open chat are new since we last looked (none on the first look).
 *
 * tests/unread-unit.js compares all of this with the code that was replaced.
 */

/** A double ping younger than this (ms) rings; older ones are quiet. */
export const DP_FRESH = 30000;

export interface MemberRow { user_id: string; chat_id: string }
export interface MsgHead { id: number; sender: string; created_at: string }

/** Friend id -> the id of the chat we share with them. If a friend appears in several of our chats, the last row wins (as before). */
export function dmChats(members: MemberRow[], me: string, friends: string[]): Map<string, string> {
  const mine = new Set(members.filter(r => r.user_id === me).map(r => r.chat_id));
  const dm = new Map<string, string>();
  for (const r of members) if (r.user_id !== me && mine.has(r.chat_id) && friends.includes(r.user_id)) dm.set(r.user_id, r.chat_id);
  return dm;
}

/** Number of unread messages among `rows` (the newest ones of the chat). */
export function unreadCount(rows: MsgHead[], me: string, readId: number, isOpen: boolean): number {
  return isOpen ? 0 : rows.filter(r => r.sender !== me && r.id > readId).length;
}

/** Whether the new-message sound should play for this chat. */
export function shouldRing(firstRefresh: boolean, unread: number, before: number | undefined, muted: boolean): boolean {
  return !firstRefresh && unread > (before || 0) && !muted;
}

/** Whether this message must be opened to see if it is a double ping. */
export function dpCandidate(r: MsgHead, me: string, readId: number, seen: Set<number>, now: number): boolean {
  return r.sender !== me && r.id > readId && !seen.has(r.id) && now - new Date(r.created_at).getTime() < DP_FRESH;
}

/**
 * Decides the alert for a double ping and remembers the message in `seen`. "skip" = handled before, "quiet" = too old or muted
 * (it is still remembered), "alert" = ring, flash, banner and title.
 */
export function dpDecision(id: number, ts: string, now: number, seen: Set<number>, muted: boolean): "skip" | "quiet" | "alert" {
  if (seen.has(id)) return "skip";
  seen.add(id);
  if (now - new Date(ts).getTime() > DP_FRESH) return "quiet";
  if (muted) return "quiet";
  return "alert";
}

/** The messages in the open chat that are new since last time (not ours, newer than the newest we had seen). None on the first look. */
export function freshMessages<T extends { id: number; mine: boolean }>(msgs: T[], first: boolean | undefined, maxSeen: number): T[] {
  return first ? [] : msgs.filter(m => !m.mine && m.id > maxSeen);
}
