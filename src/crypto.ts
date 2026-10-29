// Prek! cryptography. Pure functions only: no DOM, no localStorage, no network, no app state.
// Everything here must stay byte-compatible with what the pre-TypeScript code wrote, because real
// messages and key backups exist. tests/fixtures/crypto-vectors.json (made by the old code) proves it.
//
// Scheme: ECDH P-256 key pair per user. For a chat, ECDH(my private, their public) gives an AES-GCM-256
// key. Every message is JSON, encrypted with a random 12-byte IV, stored as base64 iv + ct.
// Recovery code: 25 characters of Crockford base32; PBKDF2-SHA256 (600000 iterations) derives an AES key
// that encrypts the identity.

export interface PublicJwk { crv: string; kty: string; x: string; y: string }
export interface Identity { priv: JsonWebKey; pub: PublicJwk }
export interface Sealed { iv: string; ct: string }
export interface BackupPayload { salt: string; iv: string; ct: string; iter: number }

const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const subtle = (): SubtleCrypto => globalThis.crypto.subtle;

export const BACKUP_ITERATIONS = 600000;

export function b64(u: ArrayBuffer | Uint8Array): string {
  const b = u instanceof Uint8Array ? u : new Uint8Array(u);
  let s = "";
  // Chunked so large buffers (files) do not overflow the call stack. Output is identical.
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function ub64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

const bytes = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

const pubOf = (j: JsonWebKey): PublicJwk => ({ crv: j.crv!, kty: j.kty!, x: j.x!, y: j.y! });

/** Fingerprint shown to users: first 32 hex characters of SHA-256 over the canonical public key. */
export async function fpOf(pub: PublicJwk): Promise<string> {
  const c = JSON.stringify({ crv: pub.crv, kty: pub.kty, x: pub.x, y: pub.y });
  const h = await subtle().digest("SHA-256", enc.encode(c));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function generateIdentity(): Promise<Identity> {
  const kp = await subtle().generateKey(ECDH, true, ["deriveKey"]);
  const priv = await subtle().exportKey("jwk", kp.privateKey);
  const pub = await subtle().exportKey("jwk", kp.publicKey);
  return { priv, pub: pubOf(pub) };
}

/** The AES-GCM key two users share, from my private key and their public key. */
export async function deriveChatKey(myPriv: JsonWebKey, theirPub: PublicJwk): Promise<CryptoKey> {
  const priv = await subtle().importKey("jwk", myPriv, ECDH, false, ["deriveKey"]);
  return aesFrom(priv, theirPub);
}

/** Same derivation from an already imported private key (used for device transfer). */
export async function aesFrom(priv: CryptoKey, theirPub: PublicJwk): Promise<CryptoKey> {
  const pk = await subtle().importKey("jwk", theirPub, ECDH, false, []);
  return subtle().deriveKey({ name: "ECDH", public: pk }, priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, obj: unknown): Promise<Sealed> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: bytes(iv) }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}

/** Returns the decrypted object, or null if the key is wrong or the data was changed. Never throws. */
export async function open<T = any>(key: CryptoKey, iv: string, ct: string): Promise<T | null> {
  try {
    return JSON.parse(dec.decode(await subtle().decrypt({ name: "AES-GCM", iv: bytes(ub64(iv)) }, key, bytes(ub64(ct)))));
  } catch {
    return null;
  }
}

/** Ephemeral key pair for device transfer. The private key cannot be exported. */
export async function ephPair(): Promise<{ priv: CryptoKey; pub: PublicJwk }> {
  const kp = await subtle().generateKey(ECDH, false, ["deriveKey"]);
  const pub = await subtle().exportKey("jwk", kp.publicKey);
  return { priv: kp.privateKey, pub: pubOf(pub) };
}

/** Four digits both devices show during transfer so the user can check they match. */
export async function pairCode(pub: PublicJwk): Promise<string> {
  const h = new Uint8Array(await subtle().digest("SHA-256", enc.encode(pub.x + "." + pub.y)));
  return String((((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0) % 10000).padStart(4, "0");
}

// ---- recovery code ----

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newCode(): string {
  const r = globalThis.crypto.getRandomValues(new Uint8Array(25));
  let t = "";
  for (const b of r) t += B32[b & 31];
  return t.match(/.{5}/g)!.join("-");
}

/** Lets people type the code loosely: any case, spaces and dashes, and O/I/L read as 0/1/1. */
export const normCode = (c: string): string =>
  c.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, "");

async function codeKey(code: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", enc.encode(normCode(code)), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt: bytes(salt), iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function makeBackup(code: string, id: Identity): Promise<BackupPayload> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await codeKey(code, salt, BACKUP_ITERATIONS);
  const s = await seal(key, { v: 1, priv: id.priv, pub: id.pub });
  return { salt: b64(salt), iv: s.iv, ct: s.ct, iter: BACKUP_ITERATIONS };
}

/** Returns the identity, or null when the code is wrong. */
export async function restoreBackup(code: string, b: BackupPayload): Promise<Identity | null> {
  const key = await codeKey(code, ub64(b.salt), b.iter);
  const o = await open<{ priv: JsonWebKey; pub: PublicJwk }>(key, b.iv, b.ct);
  return o ? { priv: o.priv, pub: o.pub } : null;
}
