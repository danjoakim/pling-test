//# Start of the page script: Supabase URL, the public (anon) key and the client. {{boot.noSupabase}} is filled in from the language file by build.py.
const SB_URL="https://frvnbcltyvcnyympmjua.supabase.co";
// Offentlig nøkkel (anon). Den er laget for å ligge i nettsider; tilgangsreglene i databasen beskytter dataene.
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydm5iY2x0eXZjbnl5bXBtanVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTQ0MjEsImV4cCI6MjEwODI3MDQyMX0.eh5mH2kCPXXgbQ8wH-vzU2wDAmCJ43Oj-Y8mu6jNaiA";

if(!window.supabase){document.body.textContent="{{boot.noSupabase}}";throw new Error("supabase mangler")}
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
