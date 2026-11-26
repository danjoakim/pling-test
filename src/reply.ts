/**
 * Svar på en enkeltmelding (Dan 26. nov). Henvisningen ligger inni den krypterte meldingen (`rp`), så serveren ser ingenting.
 * `i` er den refererte meldingens id, `a` er 1 når den som svarer selv skrev originalen, `q` er en kopi av første del av teksten
 * (kopi, så sitatet virker også om originalen er slettet eller ikke er lastet), `k` er "img" når originalen var et bilde.
 * Avsenderen er ikke tillitsfull for mottakeren: alt valideres av `validReply` før det vises.
 */
export interface Reply { i: number | null; a: 0 | 1; q: string; k?: "img" }

export const REPLY_Q_MAX = 140;

/** Strips control characters and collapses runs of whitespace, then cuts to `n` characters (adds … when cut). */
export function cleanQuote(t: unknown, n = REPLY_Q_MAX): string {
  const s = typeof t === "string" ? t.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, " ").replace(/\s+/g, " ").trim() : "";
  if (s.length <= n) return s;
  return [...s].slice(0, n - 1).join("").trimEnd() + "\u2026";
}

/** What to send when replying to `orig`. Null when the message cannot be replied to (not saved yet, no content). */
export function makeReply(orig: { id: unknown; mine: boolean; t?: string | null; img?: unknown }): Reply | null {
  if (typeof orig.id !== "number" || !Number.isInteger(orig.id) || orig.id < 1) return null;
  const a: 0 | 1 = orig.mine ? 1 : 0;
  if (orig.img) return { i: orig.id, a, q: "", k: "img" };
  const q = cleanQuote(orig.t);
  if (!q) return null;
  return { i: orig.id, a, q };
}

/** Checks a reference that came from another person's message. Returns a clean copy, or null if it cannot be shown. */
export function validReply(x: unknown): Reply | null {
  const v = x as Record<string, unknown> | null | undefined;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const i = typeof v.i === "number" && Number.isInteger(v.i) && v.i >= 1 && v.i <= 1e15 ? v.i : null;
  const a: 0 | 1 = v.a === 1 ? 1 : 0;
  if (v.k === "img") return { i, a, q: "", k: "img" };
  const q = cleanQuote(v.q, REPLY_Q_MAX);
  if (!q) return null;
  return { i, a, q };
}

/** Who wrote the quoted message, from the viewer's point of view: "me" or "other". `mine` is whether the viewer sent the message holding the quote. */
export function quoteAuthor(r: Reply, mine: boolean): "me" | "other" {
  const writtenBySender = r.a === 1;
  return writtenBySender === mine ? "me" : "other";
}
