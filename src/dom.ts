/**
 * The small helpers every screen uses to build and talk to the page.
 *
 * `$` finds an element, `el` makes one (with properties, listeners and children), `toast` shows a short message at the bottom of the
 * screen, `fail` shows an error the same way (and writes it to the console), and `q` unpacks the answer of a database call and turns
 * an error into a normal exception whose message starts with what we were doing.
 *
 * These behave exactly as they did in plain JavaScript, odd corners included, because the whole app leans on them: any property that
 * starts with "on" is a listener (even "online"); `true` gives an empty attribute while `false`, null and undefined give none; arrays of
 * children are flattened one level; `false`, `true` and deeper arrays become text. tests/dom.js pins all of it in the built page.
 */

/** Finds the first element that matches, inside `r` (the whole page by default), or null. */
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);

/** Properties for `el`: `class` sets the class, `onclick` etc. add listeners, `true` sets an empty attribute, false/null/undefined set none. */
export type Props = Record<string, any>;

/** Makes an element. Children may be nodes, text, numbers or arrays of them; null and undefined are skipped. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, ...kids: unknown[]): HTMLElementTagNameMap[K];
export function el(tag: string, props?: Props, ...kids: unknown[]): HTMLElement;
export function el(tag: string, props: Props = {}, ...kids: unknown[]): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) e.append((c as Node).nodeType ? (c as Node) : document.createTextNode(c as string));
  return e;
}

let toastT: ReturnType<typeof setTimeout> | 0 = 0;
/** Shows a message at the bottom of the screen: 3.5 seconds, or 7 seconds in red when `bad`. A new message cancels the timer of the old. */
export function toast(msg: string, bad?: boolean): void {
  const t = $("#toast")!;
  t.textContent = msg; t.className = bad ? "bad" : ""; t.style.display = "block";
  clearTimeout(toastT);
  toastT = setTimeout(() => t.style.display = "none", bad ? 7000 : 3500);
}

/** Reports an error: to the console and as a red message (`ctx` says what we were doing). */
export const fail = (e: any, ctx?: string): void => {
  console.error(ctx, e);
  toast((ctx ? ctx + ": " : "") + (e && e.message || e), true);
};

/** Unpacks the answer of a database call: the data, or an Error whose message starts with `ctx`. */
export const q = async <T = any>(p: PromiseLike<{ data: T; error?: { message?: string } | null }>, ctx?: string): Promise<T> => {
  const r = await p;
  if (r.error) throw new Error((ctx ? ctx + ": " : "") + r.error.message);
  return r.data;
};
