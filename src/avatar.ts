/**
 * Avatar helpers: check a stored picture, shrink a chosen picture to an avatar, a color from a name, and the avatar element.
 *
 * `okAv` is a security check as much as a format check: an avatar is shown with `img.src = <string from the server>`, so
 * only a small JPEG data URL made of base64 characters is accepted. Anything else (another type, a link, a script URL,
 * something big) is ignored and the initial letter is shown instead.
 *
 * The initial is the first whole character of the name (30 Oct, Dan Joakim: fix). Before, it was `name[0]`, which is half a character
 * for a name that starts with an emoji and showed as a broken sign.
 *
 * tests/avatar-unit.js compares `okAv` and `hue` with tests/fixtures/avatar-vectors.json, made by the JavaScript this
 * replaced; tests/avatar.js compares the picture and the element in a browser.
 */

/** True for a small JPEG data URL (under 12000 characters) that contains only base64 characters. */
export function okAv(a: unknown): a is string {
  return typeof a === "string" && a.startsWith("data:image/jpeg;base64,") && a.length < 12000 && /^[A-Za-z0-9+/=]*$/.test(a.slice(23));
}

/** Cuts the largest centered square out of the picture, scales it to 64x64 and returns it as a JPEG data URL (quality 0.72). */
export function toAvatar(file: Blob): Promise<string> {
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const s = Math.min(im.width, im.height), c = document.createElement("canvas");
      c.width = c.height = 64;
      c.getContext("2d")!.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 64, 64);
      URL.revokeObjectURL(u);
      ok(c.toDataURL("image/jpeg", .72));
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(); };
    im.src = u;
  });
}

/** A hue (0-359) from a name, so the same name always gets the same color. */
export function hue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * The first whole character of a name, in capitals, or "?" for an empty name. A letter with a combining mark, an emoji or a flag
 * counts as one character (Intl.Segmenter); where that is missing it falls back to the first code point.
 */
export function initial(name: string): string {
  const seg = (Intl as { Segmenter?: new (l?: string, o?: { granularity: "grapheme" }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  let first = "";
  if (seg) {
    for (const part of new seg(undefined, { granularity: "grapheme" }).segment(name)) { first = part.segment; break; }
  } else {
    first = Array.from(name)[0] || "";
  }
  return (first || "?").toUpperCase();
}

/** The avatar circle: the picture when it passes `okAv`, otherwise the first letter on a color made from the name. */
export function avEl(name: string, av: unknown, cls: string): HTMLSpanElement {
  const d = document.createElement("span");
  d.className = "pav " + cls;
  if (okAv(av)) {
    const i = document.createElement("img");
    i.alt = "";
    i.src = av;
    d.append(i);
  } else {
    d.textContent = initial(name);
    d.style.background = "hsl(" + hue(name) + " 45% 36%)";
  }
  return d;
}
