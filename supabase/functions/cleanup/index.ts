import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Deletes expired messages that have an encrypted file: first the file (via the Storage API), then the row.
// Idempotent and safe to run repeatedly. Only touches messages whose exp has passed.
// Called hourly by the pg_cron job `pling-cleanup-files` (see the baseline migration).
Deno.serve(async (req: Request) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  let files = 0, rows = 0;
  for (let i = 0; i < 20; i++) {
    const { data, error } = await sb
      .from("messages")
      .select("id,file")
      .lt("exp", new Date().toISOString())
      .not("file", "is", null)
      .limit(200);
    if (error) return json({ ok: false, step: "select", error: error.message, files, rows }, 500);
    if (!data || data.length === 0) break;
    const paths = data.map((r: { file: string }) => r.file);
    const rm = await sb.storage.from("chat-files").remove(paths);
    if (rm.error) return json({ ok: false, step: "remove", error: rm.error.message, files, rows }, 500);
    files += paths.length;
    const del = await sb.from("messages").delete().in("id", data.map((r: { id: number }) => r.id));
    if (del.error) return json({ ok: false, step: "delete", error: del.error.message, files, rows }, 500);
    rows += data.length;
  }
  return json({ ok: true, files, rows });
});
