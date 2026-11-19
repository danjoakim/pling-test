import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Sends an APNs push when a message is saved (called by the trigger messages_push, see migration 20261119180000_push.sql).
// The server cannot read messages, so the text is generic: who wrote, not what. messages.dp marks a double ping.
// Secrets: APNS_KEY_P8 (the .p8 text), APNS_KEY_ID, APNS_TEAM_ID, APNS_TOPIC (bundle id).
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (s: string) => b64u(new TextEncoder().encode(s));

async function apnsJwt(): Promise<string> {
  const pem = Deno.env.get("APNS_KEY_P8")!.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = enc(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") }));
  const body = enc(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID"), iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(head + "." + body));
  return head + "." + body + "." + b64u(sig);
}

Deno.serve(async (req: Request) => {
  if (!Deno.env.get("APNS_KEY_P8")) return json({ ok: false, error: "no APNs key yet" });
  let id: number;
  try { id = Number((await req.json()).id); } catch { return json({ ok: false }, 400); }
  if (!Number.isFinite(id)) return json({ ok: false }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: msg } = await sb.from("messages").select("id,chat_id,sender,dp,created_at").eq("id", id).maybeSingle();
  if (!msg || Date.now() - new Date(msg.created_at).getTime() > 120000) return json({ ok: true, skipped: "old or missing" });
  const once = await sb.from("push_sent").insert({ msg_id: id });
  if (once.error) return json({ ok: true, skipped: "already sent" });

  const [{ data: mem }, { data: prof }] = await Promise.all([
    sb.from("chat_members").select("user_id").eq("chat_id", msg.chat_id).neq("user_id", msg.sender),
    sb.from("profiles").select("name").eq("id", msg.sender).maybeSingle(),
  ]);
  const to = (mem ?? []).map((r: { user_id: string }) => r.user_id);
  if (!to.length) return json({ ok: true, sent: 0 });
  const { data: muted } = await sb.from("push_mutes").select("user_id").eq("muted_id", msg.sender).in("user_id", to);
  const skip = new Set((muted ?? []).map((r: { user_id: string }) => r.user_id));
  const targets = to.filter((u: string) => !skip.has(u));
  if (!targets.length) return json({ ok: true, sent: 0, muted: true });
  const { data: toks } = await sb.from("push_tokens").select("token").in("user_id", targets);
  if (!toks?.length) return json({ ok: true, sent: 0, tokens: 0 });

  const name = (prof?.name ?? "").toString().slice(0, 40) || "Prek!";
  const aps: Record<string, unknown> = msg.dp
    ? { alert: { title: name, body: "vil ha tak i deg! 🔔" }, sound: "ring.caf", "interruption-level": "time-sensitive", "thread-id": msg.chat_id }
    : { alert: { title: name, body: "har sendt deg en melding" }, sound: "default", "thread-id": msg.chat_id };
  const payload = JSON.stringify({ aps, chat: msg.chat_id, from: msg.sender });
  const jwt = await apnsJwt();
  let sent = 0, dead = 0;
  const fails: string[] = [];
  await Promise.all(toks.map(async ({ token }: { token: string }) => {
    try {
      const r = await fetch("https://api.push.apple.com/3/device/" + token, {
        method: "POST",
        headers: {
          authorization: "bearer " + jwt,
          "apns-topic": Deno.env.get("APNS_TOPIC") ?? "es.prek.messenger",
          "apns-push-type": "alert",
          "apns-priority": "10",
          "apns-expiration": String(Math.floor(Date.now() / 1000) + (msg.dp ? 60 : 3600)),
        },
        body: payload,
      });
      if (r.ok) { sent++; return; }
      const t = await r.text();
      fails.push(r.status + " " + t);
      if (r.status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(t)) { dead++; await sb.from("push_tokens").delete().eq("token", token); }
    } catch (e) { fails.push(String(e)); }
  }));
  return json({ ok: true, sent, dead, fails });
});
