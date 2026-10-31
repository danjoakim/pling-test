/**
 * Who is a friend and who has asked whom, worked out from the rows the server sends, and the order of the friend list.
 *
 * `relations` takes the rows of the two tables (`friends`: a pair a/b in either order; `friend_requests`: from/to) and the id of
 * the signed-in person, and gives the other persons' ids: friends, requests to us, requests from us, and all of them once
 * (in that order) so their profiles can be fetched. `sortFriendRows` puts online friends first, then away and busy together,
 * then offline, and inside each group by name with Norwegian sorting (æ, ø, å last).
 *
 * This used to be written out inside `refresh` and `drawFriends` in main.js; tests/friends-unit.js compares with that old code.
 */
import type { FriendRow, FriendRequestRow } from "./api";

export interface Relations { friends: string[]; reqIn: string[]; reqOut: string[]; ids: string[] }

/** Friends and requests as lists of the other persons' ids. */
export function relations(me: string, friends: FriendRow[], requests: FriendRequestRow[]): Relations {
  const ids = new Set<string>();
  const f = friends.map(r => r.a === me ? r.b : r.a); f.forEach(i => ids.add(i));
  const reqIn = requests.filter(r => r.to_id === me).map(r => r.from_id); reqIn.forEach(i => ids.add(i));
  const reqOut = requests.filter(r => r.from_id === me).map(r => r.to_id); reqOut.forEach(i => ids.add(i));
  return { friends: f, reqIn, reqOut, ids: [...ids] };
}

/** The short status names the list uses ("on" for online). */
export type ShortStatus = "on" | "away" | "busy" | "off";
/** Online first, away and busy together, offline last. */
const ORD: Record<ShortStatus, number> = { on: 0, away: 1, busy: 1, off: 2 };

/** Sorts the friend rows in place (and returns them): by status group, then by name. */
export function sortFriendRows<T extends { id: string; st: ShortStatus }>(rows: T[], nameOf: (id: string) => string): T[] {
  return rows.sort((a, b) => ORD[a.st] - ORD[b.st] || nameOf(a.id).localeCompare(nameOf(b.id), "nb"));
}
