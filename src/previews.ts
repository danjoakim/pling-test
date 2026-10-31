/**
 * Short texts about a chat: the line under a friend's name, and the page title.
 *
 * `previewText` decides what the "last message" of a chat is called in the list: "Dobbeltpling" for a double ping, "GIF" or
 * "📷 Bilde" for a picture, "(kan ikke dekrypteres)" when the message could not be opened, otherwise the text itself.
 * The same rule used to be written out twice in main.js (once for the list, once for the open chat); it is one function now.
 * `listLine` shortens that text for the list (emoji codes become emoji, white space becomes one space, at most 60 UTF-16 units,
 * "Du: " first when it was our own message). `pageTitle` puts the number of unread messages in front of the page name.
 *
 * Quirks kept on purpose (tests/previews-unit.js compares with the old code): a message with a picture entry of any kind counts
 * as a picture; the text is turned into text with String(); the cut at 60 is by UTF-16 units, so a pair of units that make one
 * emoji can be cut in half.
 */
import { tr } from "./i18n";
import { emoji } from "./emoji";

/** What the list needs to know about a decrypted message. `null` or `undefined` means it could not be decrypted. */
export interface PreviewSource { dp?: unknown; img?: { t?: unknown } | null; t?: unknown }

/** The text for a message in the chat list. */
export function previewText(m: PreviewSource | null | undefined): string {
  if (!m) return tr("chat.undecryptable");
  if (m.dp) return tr("chat.dp");
  if (m.img) return m.img.t === "image/gif" ? "GIF" : tr("chat.previewImage");
  return String(m.t == null ? "" : m.t);
}

/** The line under a friend's name: the last message, shortened, or "" when there is none. */
export function listLine(l: { mine: boolean; t: string } | undefined): string {
  if (!l) return "";
  const t = emoji(l.t).replace(/\s+/g, " ");
  return (l.mine ? tr("chat.youPrefix") : "") + (t.length > 60 ? t.slice(0, 60) + "…" : t);
}

/** The page title: "(3) Prek! testside" with unread messages, otherwise just the name. */
export function pageTitle(unread: Iterable<number>): string {
  const tot = [...unread].reduce((a, b) => a + b, 0);
  return (tot ? "(" + tot + ") " : "") + tr("app.pageTitle");
}
