/**
 * Links in messages and their previews.
 *
 * Why the SENDER fetches the preview: the receiver must never contact the web site (it would show who read the link). The sender's
 * client asks the `linkpreview` function on Supabase for title, text and picture; the result travels inside the message and is
 * encrypted with it. The sender is not trusted by the receiver, so everything in `lk` is validated before it is shown (`validLk`:
 * only http/https, only a JPEG picture as a data URL, cut lengths).
 *
 * tests/links-unit.js compares the pure functions with tests/fixtures/links-vectors.json (made by the JavaScript this replaced);
 * tests/links.js sends links between two users in a browser (preview, failing and slow preview, hostile preview).
 */

/** A link card as it is stored in a message and shown in the chat. `i` is a JPEG data URL. */
export interface LinkCard { u: string; ti: string; d: string; s: string; i?: string }

/** One piece of a message text: plain text, or a link followed by the punctuation that was cut off its end. */
export type LinkPart = { text: string } | { url: string; tail: string };

/** Cuts punctuation off the end of a found address ("see https://a.b." must not link the dot). Returns [address, cut-off end]. */
export const cutUrl = (u: string): [string, string] => {
  let t = "";
  while (/[.,;:!?)\]»”]$/.test(u)) { t = u.slice(-1) + t; u = u.slice(0, -1); }
  return [u, t];
};

/** True for an address that parses and uses http or https (nothing else is ever linked). */
export const okHttp = (u: string): boolean => {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; } catch { return false; }
};

/** The first usable address in a text (at most 2000 characters), or null. */
export function firstUrl(t: string): string | null {
  const r = /https?:\/\/[^\s<>"']+/i.exec(t);
  if (!r) return null;
  const u = cutUrl(r[0])[0];
  return okHttp(u) && u.length <= 2000 ? u : null;
}

/**
 * Splits a text into plain pieces and links, in order. A found address that is not a valid http(s) address stays part of the
 * plain text around it.
 */
export function splitLinks(t: string): LinkPart[] {
  const out: LinkPart[] = [], re = /https?:\/\/[^\s<>"']+/gi;
  let last = 0, r: RegExpExecArray | null;
  while ((r = re.exec(t))) {
    const [u, tail] = cutUrl(r[0]);
    if (!okHttp(u)) continue;
    if (r.index > last) out.push({ text: t.slice(last, r.index) });
    out.push({ url: u, tail });
    last = r.index + r[0].length;
  }
  if (last < t.length) out.push({ text: t.slice(last) });
  return out;
}

/** Checks a link card that came from another person's message. Returns a clean copy, or null if it cannot be shown. */
export function validLk(x: unknown): LinkCard | null {
  const v = x as Record<string, unknown> | null | undefined;
  if (!v || typeof v !== "object" || typeof v.u !== "string" || v.u.length > 2000 || !okHttp(v.u)) return null;
  const s = (val: unknown, n: number) => typeof val === "string" ? val.slice(0, n) : "";
  const o: LinkCard = { u: v.u, ti: s(v.ti, 140), d: s(v.d, 240), s: s(v.s, 60) };
  if (typeof v.i === "string" && v.i.length <= 90000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v.i)) o.i = v.i;
  return o;
}

/** Makes a small JPEG data URL (at most 60000 characters) from a picture the preview function sent. Returns "" if that fails. */
export async function thumb(ct: string, b64: string): Promise<string> {
  try {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const bm = await createImageBitmap(new Blob([u8], { type: ct }));
    for (const [W, qq] of [[360, .72], [300, .6], [220, .55]] as const) {
      const sc = Math.min(1, W / bm.width), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bm.width * sc)); c.height = Math.max(1, Math.round(bm.height * sc));
      const x = c.getContext("2d")!;
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/jpeg", qq);
      if (d.length <= 60000) { bm.close(); return d; }
    }
    bm.close();
  } catch { /* falls through: no picture */ }
  return "";
}

/**
 * Asks the preview function about an address. `call` is `api.linkPreview`. Gives up after `timeoutMs`. Returns a validated card,
 * or null when anything goes wrong (the message is then sent without a card).
 */
export async function fetchPreview(
  call: (url: string) => PromiseLike<{ data?: any } | null | undefined>, u: string, timeoutMs = 8000,
): Promise<LinkCard | null> {
  try {
    const r = await Promise.race([call(u), new Promise<never>((_, j) => setTimeout(() => j(new Error("tid")), timeoutMs))]);
    const d = r && r.data;
    if (!d || !d.ok) return null;
    const lk: Record<string, unknown> = { u, ti: String(d.ti || "").slice(0, 140), d: String(d.d || "").slice(0, 240), s: String(d.s || "").slice(0, 60) };
    if (d.img && /^image\/(jpeg|png|webp|gif)$/.test(d.img.ct) && typeof d.img.b64 === "string") {
      const i = await thumb(d.img.ct, d.img.b64);
      if (i) lk.i = i;
    }
    return validLk(lk);
  } catch { return null; }
}
