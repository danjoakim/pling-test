import { nb } from "./nb-NO";

export type Key = keyof typeof nb;
export type Params = Record<string, string | number>;

/** Looks up a text and fills in {placeholders}. Throws on an unknown key so mistakes show up in tests. */
export function tr(key: Key, params?: Params): string {
  const text = nb[key];
  if (text === undefined) throw new Error("Unknown text key: " + key);
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (params && name in params ? String(params[name]) : m));
}

export const messages: Record<string, string> = nb;
