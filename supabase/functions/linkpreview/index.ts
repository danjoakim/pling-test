import { buildPreview } from "./core.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

async function resolve(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const t of ["A", "AAAA"] as const) {
    try { out.push(...(await Deno.resolveDns(host, t))); } catch { /* none */ }
  }
  return out;
}

// WHY the role check: verify_jwt also accepts the public (anon) key. Only signed-in users may use this,
// otherwise anyone on the internet could use the function as a fetch proxy.
function roleOf(req: Request): string | null {
  try {
    const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.role === "authenticated" && p.sub ? String(p.role) : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  if (!roleOf(req)) return json({ ok: false, error: "auth" }, 401);
  let url = "";
  try { url = String((await req.json()).url ?? ""); } catch { return json({ ok: false, error: "body" }, 400); }
  try {
    return json(await buildPreview(url, resolve));
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e).slice(0, 80) });
  }
});
