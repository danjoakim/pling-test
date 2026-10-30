/**
 * Our own GIF encoder (used to make too-big GIFs smaller while keeping the animation) and the check that a file really is a GIF.
 *
 * Why our own encoder and not a library (25 Oct): nothing external should go into an app that promises encryption without a reason,
 * and the build environment could not fetch one. The browser decodes (ImageDecoder, which gives fully composed frames); we encode
 * again with a local color table per frame.
 *
 * What it does: `gifQuant` reduces one frame to at most 256 colors (median cut over a 5-bit-per-channel histogram), `gifLzw`
 * compresses the color indexes the way GIF wants, `gifEncode` writes the whole file (looping forever, one local table per frame,
 * transparency kept as one extra palette index, delays in hundredths of a second). There is no dithering, so smooth gradients can band.
 *
 * tests/gif-unit.js compares the output byte for byte with tests/fixtures/gif-vectors.json, made by the JavaScript this replaced.
 */

/** Largest GIF that is sent unchanged. The storage bucket takes 3 MB including the IV and the tag. */
export const GIF_MAX = 3000000;

/** One decoded picture: RGBA pixels (width x height x 4), whether any pixel is transparent, and how long it shows (ms). */
export interface GifFrame { rgba: Uint8ClampedArray | Uint8Array; hasT: boolean; delay: number }

interface Box { ks: number[]; c: number; rg: number[] }
export interface Quantized { idx: Uint8Array; table: Uint8Array; bits: number; tIdx: number }

/** Reduces one frame to a palette of at most 256 colors (255 plus one transparent index when the frame has transparency). */
export function gifQuant(rgba: Uint8ClampedArray | Uint8Array, n: number, hasT: boolean): Quantized {
  const hist = new Uint32Array(32768);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (rgba[o + 3] >= 128) hist[((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3)]++;
  }
  const keys: number[] = [];
  for (let k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
  const max = hasT ? 255 : 256;
  const mk = (ks: number[]): Box => {
    let c = 0, r0 = 31, r1 = 0, g0 = 31, g1 = 0, b0 = 31, b1 = 0;
    for (const k of ks) {
      c += hist[k];
      const r = k >> 10, g = (k >> 5) & 31, b = k & 31;
      if (r < r0) r0 = r; if (r > r1) r1 = r;
      if (g < g0) g0 = g; if (g > g1) g1 = g;
      if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    return { ks, c, rg: [r1 - r0, g1 - g0, b1 - b0] };
  };
  const boxes: Box[] = keys.length ? [mk(keys)] : [];
  while (boxes.length < max) {
    let bi = -1, best = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.ks.length > 1 && b.c > best) { best = b.c; bi = i; }
    }
    if (bi < 0) break;
    const b = boxes[bi], ch = b.rg[0] >= b.rg[1] && b.rg[0] >= b.rg[2] ? 0 : b.rg[1] >= b.rg[2] ? 1 : 2;
    const v = ch === 0 ? (k: number) => k >> 10 : ch === 1 ? (k: number) => (k >> 5) & 31 : (k: number) => k & 31;
    const s = b.ks.slice().sort((x, y) => v(x) - v(y));
    let acc = 0, cut = 1;
    for (let i = 0; i < s.length - 1; i++) { acc += hist[s[i]]; cut = i + 1; if (acc * 2 >= b.c) break; }
    boxes[bi] = mk(s.slice(0, cut));
    boxes.push(mk(s.slice(cut)));
  }
  const pal: number[] = [], map = new Uint8Array(32768);
  boxes.forEach((b, i) => {
    let r = 0, g = 0, bl = 0;
    for (const k of b.ks) {
      const c = hist[k];
      r += (k >> 10) * c; g += ((k >> 5) & 31) * c; bl += (k & 31) * c;
      map[k] = i;
    }
    const e = (v: number) => { v = Math.round(v / b.c); return (v << 3) | (v >> 2); };
    pal.push(e(r), e(g), e(bl));
  });
  const nCol = boxes.length, tIdx = hasT ? nCol : -1, total = nCol + (hasT ? 1 : 0);
  let bits = 1;
  while ((1 << bits) < total) bits++;
  const idx = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    idx[i] = rgba[o + 3] < 128 ? (tIdx < 0 ? 0 : tIdx) : map[((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3)];
  }
  const table = new Uint8Array((1 << bits) * 3);
  table.set(pal);
  return { idx, table, bits, tIdx };
}

/** GIF's variant of LZW: codes grow from minBits+1 up to 12 bits, and the dictionary is reset when it is full. */
export function gifLzw(idx: Uint8Array, minBits: number): number[] {
  const out: number[] = [], clear = 1 << minBits, eoi = clear + 1;
  let size = minBits + 1, next = eoi + 1, dict = new Map<number, number>(), buf = 0, nb = 0;
  const emit = (c: number) => {
    buf |= c << nb; nb += size;
    while (nb >= 8) { out.push(buf & 255); buf >>>= 8; nb -= 8; }
  };
  emit(clear);
  let cur = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = (cur << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { cur = hit; continue; }
    emit(cur);
    if (next > (1 << size) - 1 && size < 12) size++;
    if (next < 4096) { dict.set(key, next++); }
    else { emit(clear); dict = new Map(); size = minBits + 1; next = eoi + 1; }
    cur = k;
  }
  emit(cur);
  if (next > (1 << size) - 1 && size < 12) size++; /* as in ordinary encoders: the width can grow before the end code */
  emit(eoi);
  if (nb > 0) out.push(buf & 255);
  return out;
}

/** Writes a complete animated GIF (89a, loops forever) from frames that all have the size w x h. */
export function gifEncode(frames: GifFrame[], w: number, h: number): Uint8Array {
  const o: number[] = [];
  const u16 = (v: number) => o.push(v & 255, (v >> 8) & 255);
  for (const c of "GIF89a") o.push(c.charCodeAt(0));
  u16(w); u16(h); o.push(0x70, 0, 0);
  o.push(0x21, 0xFF, 0x0B);
  for (const c of "NETSCAPE2.0") o.push(c.charCodeAt(0));
  o.push(3, 1, 0, 0, 0);
  for (const f of frames) {
    const q = gifQuant(f.rgba, w * h, f.hasT);
    const d = Math.max(2, Math.min(65535, Math.round(f.delay / 10)));
    o.push(0x21, 0xF9, 4, (f.hasT ? (2 << 2) | 1 : (1 << 2)), d & 255, d >> 8, q.tIdx < 0 ? 0 : q.tIdx, 0);
    o.push(0x2C); u16(0); u16(0); u16(w); u16(h); o.push(0x80 | (q.bits - 1));
    for (const b of q.table) o.push(b);
    const mb = Math.max(2, q.bits);
    o.push(mb);
    const data = gifLzw(q.idx, mb);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      o.push(n);
      for (let j = 0; j < n; j++) o.push(data[i + j]);
    }
    o.push(0);
  }
  o.push(0x3B);
  return Uint8Array.from(o);
}

/** Reads a file as a GIF: its bytes and the size from the header, or null when it does not start with "GIF8". */
export async function readGif(file: Blob): Promise<{ bytes: Uint8Array; w: number; h: number } | null> {
  const b = new Uint8Array(await file.arrayBuffer());
  if (b.length < 10 || String.fromCharCode(b[0], b[1], b[2], b[3]) !== "GIF8") return null;
  return { bytes: b, w: b[6] | b[7] << 8, h: b[8] | b[9] << 8 };
}
