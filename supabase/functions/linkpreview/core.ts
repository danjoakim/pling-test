// Link preview core. Pure logic so it can be tested in Node as well as Deno.
// WHY: the browser cannot fetch other sites (CORS), so this runs server side. Rules:
// only http(s) on ports 80/443, never private or internal addresses (SSRF), every redirect is re-checked,
// strict size and time limits, no cookies sent, images only as jpeg/png/webp/gif (never svg).

export type Resolver = (host: string) => Promise<string[]>;

export function isPrivateIp(ip: string): boolean {
  ip = ip.trim().toLowerCase();
  if (ip.includes(":")) {
    const v4 = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) return isPrivateIp(v4[1]);
    if (ip === "::" || ip === "::1") return true;
    const first = parseInt(ip.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (ip.startsWith("2001:db8") || ip.startsWith("64:ff9b") || ip.startsWith("100::")) return true;
    return false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

export async function checkUrl(raw: string, resolve: Resolver): Promise<URL> {
  if (typeof raw !== "string" || raw.length > 2000) throw new Error("bad url");
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme");
  if (u.username || u.password) throw new Error("credentials in url");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("bad port");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) throw new Error("bad host");
  const literal = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
  const ips = literal ? [host] : await resolve(host);
  if (!ips.length) throw new Error("no address");
  if (!literal && !host.includes(".")) throw new Error("bad host");
  for (const ip of ips) if (isPrivateIp(ip)) throw new Error("private address");
  return u;
}

const UA = "Mozilla/5.0 (compatible; Pling-LinkPreview/0.1)";

export async function safeFetch(
  raw: string, resolve: Resolver, opts: { accept: string; maxBytes: number; timeoutMs: number; fetchFn?: typeof fetch },
): Promise<{ url: URL; res: Response; bytes: Uint8Array }> {
  const f = opts.fetchFn ?? fetch;
  let cur = raw;
  for (let hop = 0; hop < 5; hop++) {
    const u = await checkUrl(cur, resolve);
    const res = await f(u.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(opts.timeoutMs),
      headers: { "user-agent": UA, accept: opts.accept, "accept-language": "nb,no;q=0.9,en;q=0.7" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      cur = new URL(res.headers.get("location")!, u).toString();
      try { await res.body?.cancel(); } catch { /* ignore */ }
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error("http " + res.status);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > opts.maxBytes && opts.maxBytes > 0 && opts.accept.startsWith("image")) throw new Error("too large");
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0, cut = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > opts.maxBytes) {
        if (opts.accept.startsWith("image")) throw new Error("too large");
        chunks.push(value.slice(0, value.length - (total - opts.maxBytes)));
        cut = true;
        break;
      }
      chunks.push(value);
    }
    if (cut) { try { await reader.cancel(); } catch { /* ignore */ } }
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of chunks) { bytes.set(c, o); o += c.length; }
    return { url: u, res, bytes };
  }
  throw new Error("too many redirects");
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", aelig: "æ", oslash: "ø", aring: "å", AElig: "Æ", Oslash: "Ø", Aring: "Å" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; } catch { return ""; }
    }
    return ENT[e] ?? ENT[e.toLowerCase()] ?? m;
  });
}
const clean = (s: string | undefined, n: number) => decodeEntities(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function parseMeta(html: string, finalUrl: string) {
  const head = html.slice(0, 400000);
  const meta: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const attr = (n: string) => {
      const r = tag.match(new RegExp("\\b" + n + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
      return r ? (r[1] ?? r[2] ?? r[3]) : undefined;
    };
    const key = (attr("property") || attr("name") || "").toLowerCase();
    const val = attr("content");
    if (key && val != null && !(key in meta)) meta[key] = val;
  }
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  let img = meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"];
  if (img) { try { img = new URL(decodeEntities(img), finalUrl).toString(); } catch { img = undefined; } }
  return {
    ti: clean(meta["og:title"] || meta["twitter:title"] || title, 140),
    d: clean(meta["og:description"] || meta["twitter:description"] || meta["description"], 240),
    s: clean(meta["og:site_name"], 60) || host,
    img,
  };
}

export function charsetOf(contentType: string | null, bytes: Uint8Array): string {
  const h = contentType?.match(/charset=([\w-]+)/i)?.[1];
  if (h) return h.toLowerCase();
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 2048));
  return head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]?.toLowerCase() ?? "utf-8";
}

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const IMG_OK = /^image\/(jpeg|png|webp|gif)$/i;

export async function buildPreview(raw: string, resolve: Resolver, fetchFn?: typeof fetch) {
  const page = await safeFetch(raw, resolve, { accept: "text/html,application/xhtml+xml", maxBytes: 400000, timeoutMs: 5000, fetchFn });
  const ct = page.res.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/i.test(ct)) throw new Error("not html");
  let html: string;
  try { html = new TextDecoder(charsetOf(ct, page.bytes)).decode(page.bytes); } catch { html = new TextDecoder().decode(page.bytes); }
  const meta = parseMeta(html, page.url.toString());
  if (!meta.ti && !meta.d) throw new Error("no metadata");
  let image: { ct: string; b64: string } | undefined;
  if (meta.img) {
    try {
      const im = await safeFetch(meta.img, resolve, { accept: "image/jpeg,image/png,image/webp,image/gif", maxBytes: 2_000_000, timeoutMs: 5000, fetchFn });
      const ict = (im.res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (IMG_OK.test(ict) && im.bytes.length > 0) image = { ct: ict, b64: toB64(im.bytes) };
    } catch { /* the preview works without an image */ }
  }
  return { ok: true, ti: meta.ti, d: meta.d, s: meta.s, img: image };
}
