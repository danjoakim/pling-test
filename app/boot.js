//# Start of the page script: Supabase URL, the public (anon) key and the client. {{boot.noSupabase}} is filled in from the language file by build.py.
const SB_URL="https://frvnbcltyvcnyympmjua.supabase.co";
// Offentlig nøkkel (anon). Den er laget for å ligge i nettsider; tilgangsreglene i databasen beskytter dataene.
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydm5iY2x0eXZjbnl5bXBtanVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTQ0MjEsImV4cCI6MjEwODI3MDQyMX0.eh5mH2kCPXXgbQ8wH-vzU2wDAmCJ43Oj-Y8mu6jNaiA";

const $=(s,r=document)=>r.querySelector(s);
const el=(tag,props={},...kids)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==="class")e.className=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?"":v)}for(const c of kids.flat())if(c!=null)e.append(c.nodeType?c:document.createTextNode(c));return e};
let toastT=0;
function toast(msg,bad){const t=$("#toast");t.textContent=msg;t.className=bad?"bad":"";t.style.display="block";clearTimeout(toastT);toastT=setTimeout(()=>t.style.display="none",bad?7000:3500)}
const fail=(e,ctx)=>{console.error(ctx,e);toast((ctx?ctx+": ":"")+(e&&e.message||e),true)};

if(!window.supabase){document.body.textContent="{{boot.noSupabase}}";throw new Error("supabase mangler")}
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
