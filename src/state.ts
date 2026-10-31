/**
 * What the app knows right now: who is signed in, the friends, the open chat, the messages on screen, who is online, and so on.
 * One object, called `S` in the app, made by `createState()`.
 *
 * Why this file exists: the object used to be written out in `main.js` with 26 fields, but 19 more were added later, here and there,
 * the first time some code assigned them. Nobody could see the whole picture. Now every field is described here, once.
 *
 * Two kinds of field. The ones without a question mark exist from the start (set in `createState`). The ones with a question mark
 * (`sig`, `rx`, `poll`, ...) are set later, for example when a chat is opened or a timer is started, and are `undefined` until then;
 * that is how the app has always worked and the code relies on it (for example `if(!S.anSeen)`).
 *
 * tests/state-unit.js checks that `createState()` gives exactly the old starting values (tests/fixtures/state-vectors.json) and that
 * every `S.name` used in the app files is described here, and that every field described here is used (so a misspelled field name,
 * which JavaScript would silently turn into a new field, is caught).
 */
import type { Session, ProfileRow } from "./api";
import type { Identity } from "./crypto";
import type { LinkCard } from "./links";
import type { ReactionMap } from "./reactions";

/** A status a person can have. "off" is also what a person who is not online counts as. */
export type Status = "online" | "away" | "busy" | "off";

/** A message as the chat shows it, after it has been decrypted (`decodeRows` in main.js). `ok` is false when it could not be decrypted. */
export interface DecodedMsg {
  id: number; mine: boolean;
  /** the text, or null when there is none (a picture, a double ping, or it could not be decrypted) */
  t: string | null;
  /** true for a double ping */
  dp: boolean;
  /** a picture: path in storage, size, and "image/gif" for an animated one */
  img: { p: string; w?: number; h?: number; t?: string } | null;
  lk: LinkCard | null; ok: boolean;
  /** when the server stored it (ISO time) */
  ts: string;
}

/** The profile of the signed-in person. Right after sign-up it has no personal message (`pm`) yet. */
export type OwnProfile = Pick<ProfileRow, "id" | "fp" | "name" | "pub"> & { pm?: string | null };

export interface AppState {
  /** the signed-in person (from the session) */
  user: Session["user"] | null;
  profile: OwnProfile | null;
  /** the key pair of this device */
  id: Identity | null;
  /** the backup of the key on the server: when it was made, or null if there is none */
  backup: { updated_at: string } | null;
  /** sign-in screen: "in" = sign in, "up" = make an account */
  mode: "in" | "up";
  /** the sign-in screen waits for the code that was sent by e-mail */
  needCode: boolean;

  /** profiles of friends and of people with a pending request, by person id */
  profiles: Map<string, ProfileRow>;
  /** profile pictures (JPEG data URLs that passed the check), by person id */
  av: Map<string, string>;
  /** person ids */
  friends: string[]; reqIn: string[]; reqOut: string[];
  /** the people this person has blocked (set when the list has been fetched) */
  blocks?: { blocked: string; name: string }[];
  /** own status; others' statuses are in `pres` */
  status: Status;
  /** who is online right now, by person id (never "off") */
  pres: Map<string, Status>;
  /** who is typing: since when, in which chat, and when we last saw it (ms) */
  typ: Map<string, { n: number; c: string; seen: number }>;
  /** this person is typing in this chat since this time (ms), or null */
  myTyp?: { c: string; n: number } | null;

  /** the open chat and the other person, or null */
  chat: { id: string; other: string } | null;
  /** the messages on screen: the older ones fetched with "show older" come first in `older`, and `msgs` is all of them */
  msgs: DecodedMsg[]; older: DecodedMsg[];
  /** there are older messages to fetch */
  more: boolean;
  /** which messages are on screen, as text; used to see whether anything changed */
  sig?: string | null;
  /** true until the first fetch of a newly opened chat is on screen */
  first?: boolean;
  /** this person has just sent a message (scroll to the bottom) */
  justSent?: boolean;
  /** reactions on the open chat: message id -> person id -> reaction, and a signature for change detection */
  rx?: ReactionMap; rxSig?: string;
  /** when an animated figure was first shown, by message id (so it plays once) */
  anSeen?: Map<string, number>;

  /** the last message of each chat, by friend id (for the list) */
  last: Map<string, { id: number; mine: boolean; t: string }>;
  /** how many days messages last, by chat id (0 = never) */
  exp: Map<string, number>;
  /** the last message that has been read, by chat id */
  reads: Map<string, number>;
  /** number of unread messages, by friend id */
  unread: Map<string, number>;
  /** the highest message id seen in each chat (for the sound), by chat id */
  seen: Map<string, number>;
  /** true until the list of chats has been fetched once after signing in (no sounds for what was already there) */
  firstRef: boolean;
  /** counts refreshes; avatars are fetched on every fifth */
  nref: number;

  /** the double ping button is blocked until this time (ms) */
  cdUntil: number;

  /** the access token of the session (for the call that must be sent when the tab closes) */
  tok?: string | null;
  /** the pairing request that is on screen (a new device asking for the key), or null */
  pairId?: string | null;
  /** when the presence was last sent (ms) */
  lastTrack?: number;
  /** timers: refresh, check for pairing requests, presence heartbeat, fetch presence, hide "typing", double ping countdown, delayed presence */
  poll?: ReturnType<typeof setInterval>; pp?: ReturnType<typeof setInterval>;
  pbT?: ReturnType<typeof setInterval>; pfT?: ReturnType<typeof setInterval>;
  tT?: ReturnType<typeof setTimeout>; cdT?: ReturnType<typeof setInterval>;
  trT?: ReturnType<typeof setTimeout> | 0;
}

/** Makes the state with its starting values. */
export function createState(): AppState {
  return {
    backup: null, user: null, profile: null, id: null, profiles: new Map(), av: new Map(), friends: [], reqIn: [], reqOut: [],
    chat: null, msgs: [], mode: "in", needCode: false, status: "online", last: new Map(), exp: new Map(), reads: new Map(),
    older: [], more: false, unread: new Map(), firstRef: true, pres: new Map(), typ: new Map(), seen: new Map(), cdUntil: 0, nref: 0,
  };
}
