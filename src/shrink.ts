/**
 * Makes pictures smaller in the browser before they are encrypted and uploaded.
 *
 * `shrink` handles ordinary pictures: the long side becomes at most 1920 px, transparency becomes white, and the result is a JPEG
 * (quality .85, then .7, then .55 while the file is over 2.5 MB). `shrinkGif` handles GIFs that are over the storage limit: it keeps
 * the animation, trying smaller sizes and fewer frames until the file fits (a still picture is never made from a GIF).
 *
 * Why the browser does the decoding: ImageDecoder gives fully composed frames, and our own encoder (src/gif.ts) writes the new file.
 * tests/shrink.js calls both functions in the built page.
 */
import { tr } from "./i18n";
import { gifEncode, type GifFrame } from "./gif";

/** Longest side of a picture that is sent (px). */
const MAX_SIDE = 1920;
/** A JPEG over this size is compressed harder. */
const JPEG_TARGET = 2.5 * 1024 * 1024;
/** GIFs over this size are refused instead of decoded. */
const GIF_INPUT_MAX = 40 * 1024 * 1024;
/** GIFs are never made bigger than this on the long side (px). */
const GIF_SIDE = 480;
/** Never keep more than about this many GIF frames at the first try. */
const GIF_FRAMES = 200;
/** What `shrinkGif` tries, in order: [scale, keep every n-th frame]. */
const GIF_TRIES: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [.75, 1], [.6, 1], [.5, 1], [.5, 2], [.4, 2], [.3, 2], [.3, 3], [.25, 3], [.2, 4],
];

/** Size after scaling so the long side is at most `max` (never scaled up, never below 1 px). */
function fit(w: number, h: number, max: number): { k: number; w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { k, w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Reads a picture file and returns it as a JPEG with its size. Throws a readable error if the browser cannot read the file. */
export async function shrink(file: Blob): Promise<{ blob: Blob; w: number; h: number }> {
  const toBlob = (c: HTMLCanvasElement, qual: number) => new Promise<Blob | null>(r => c.toBlob(r, "image/jpeg", qual));
  let src: CanvasImageSource, w: number, h: number, close = () => {};
  try {
    // Saves memory: the browser scales down while it reads the picture in.
    const probe = await createImageBitmap(file), pw = probe.width, ph = probe.height;
    probe.close();
    const f = fit(pw, ph, MAX_SIDE);
    w = f.w; h = f.h;
    const bm = await createImageBitmap(file, f.k < 1 ? { resizeWidth: w, resizeHeight: h, resizeQuality: "high" } : undefined);
    src = bm;
    close = () => bm.close();
  } catch {
    const im = await new Promise<HTMLImageElement>((ok, no) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); ok(i); };
      i.onerror = () => { URL.revokeObjectURL(u); no(new Error(tr("img.notReadable"))); };
      i.src = u;
    });
    const f = fit(im.width, im.height, MAX_SIDE);
    src = im; w = f.w; h = f.h;
  }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
  x.drawImage(src, 0, 0, w, h);
  close();
  let qual = .85, b = await toBlob(c, qual);
  while (b && b.size > JPEG_TARGET && qual > .5) { qual = qual > .7 ? .7 : .55; b = await toBlob(c, qual); }
  if (!b) throw new Error(tr("img.readFailed"));
  return { blob: b, w, h };
}

/**
 * Makes a GIF smaller than `limit` bytes and keeps it animated. `onStep(i, n)` is called before each try (for the progress text).
 * Frames that are dropped add their delay to the frame before, so the animation keeps its speed.
 */
export async function shrinkGif(
  file: Blob, limit: number, onStep?: (i: number, n: number) => void,
): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  if (typeof ImageDecoder === "undefined") throw new Error(tr("gif.noDecoder"));
  if (file.size > GIF_INPUT_MAX) throw new Error(tr("gif.tooLarge"));
  const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: "image/gif" });
  await dec.tracks.ready; await dec.completed;
  const n = dec.tracks.selectedTrack!.frameCount;
  const f0 = (await dec.decode({ frameIndex: 0 })).image, W = f0.displayWidth, H = f0.displayHeight;
  f0.close();
  const cap = Math.min(1, GIF_SIDE / Math.max(W, H)), minStep = Math.max(1, Math.ceil(n / GIF_FRAMES));
  for (let t = 0; t < GIF_TRIES.length; t++) {
    const [sc, st0] = GIF_TRIES[t], st = Math.max(st0, minStep), k = cap * sc;
    const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
    if (onStep) onStep(t + 1, GIF_TRIES.length);
    await new Promise(r => setTimeout(r, 0)); // lets the page paint the progress text
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true })!;
    x.imageSmoothingQuality = "high";
    const frames: GifFrame[] = [];
    for (let i = 0; i < n; i++) {
      const vf = (await dec.decode({ frameIndex: i })).image, dur = (vf.duration || 100000) / 1000;
      if (i % st === 0) {
        x.clearRect(0, 0, w, h); x.drawImage(vf, 0, 0, w, h);
        const px = x.getImageData(0, 0, w, h).data;
        let hasT = false;
        for (let p = 3; p < px.length; p += 4) if (px[p] < 128) { hasT = true; break; }
        frames.push({ rgba: px, hasT, delay: dur });
      } else frames[frames.length - 1].delay += dur;
      vf.close();
    }
    const bytes = gifEncode(frames, w, h);
    if (bytes.length <= limit) { dec.close(); return { bytes, w, h }; }
  }
  dec.close();
  throw new Error(tr("gif.cannotShrink"));
}
