/**
 * Avatar helpers: check a stored picture, shrink a chosen picture to an avatar, a color from a name, and the avatar element.
 *
 * `okAv` is a security check as much as a format check: an avatar is shown with `img.src = <string from the server>`, so
 * only a small JPEG data URL made of base64 characters is accepted. Anything else (another type, a link, a script URL,
 * something big) is ignored and the initial letter is shown instead.
 *

 * Known quirk, kept as it was: the initial is `name[0]`, which is half a character for a name that starts with an emoji.
 * Fixing it (take the first code point) is a visible change, so it needs Dan Joakim's yes.
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
    d.textContent = (name[0] || "?").toUpperCase();
    d.style.background = "hsl(" + hue(name) + " 45% 36%)";
  }
  return d;
}
