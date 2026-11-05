//# Update inside the desktop app (Tauri updater plugin, see desktop/src-tauri and claude/oppdatering.md). The app asks GitHub once after start
//# and every 6 hours whether a newer signed build exists; if so a bar offers to download, install and restart. Nothing happens on the web
//# (no window.__TAURI__ there), and a failed check (offline, no release yet) is silent. Only builds signed with our own key are accepted.
const UPD={busy:false};
async function updCheck(){
  const T=window.__TAURI__;if(!T||!T.updater||UPD.busy)return;
  try{const u=await T.updater.check();if(u)updShow(u)}catch(e){}
}
function updShow(u){
  const old=document.getElementById("upd");if(old)old.remove();
  const msg=el("span",{},tr("upd.new",{v:u.version})),go=el("button",{class:"glass sm",type:"button"},tr("upd.go")),later=el("button",{class:"glass sm",type:"button"},tr("upd.later"));
  const bar=el("div",{id:"upd",role:"status"},msg,go,later);
  later.addEventListener("click",()=>bar.remove());
  go.addEventListener("click",async()=>{
    UPD.busy=true;go.disabled=true;later.hidden=true;msg.textContent=tr("upd.busy");
    let total=0,got=0;
    try{
      await u.downloadAndInstall(ev=>{
        if(ev.event==="Started")total=(ev.data&&ev.data.contentLength)||0;
        else if(ev.event==="Progress"){got+=(ev.data&&ev.data.chunkLength)||0;if(total)msg.textContent=tr("upd.pct",{p:Math.min(99,Math.round(got*100/total))})}
      });
      msg.textContent=tr("upd.done");
      await window.__TAURI__.process.relaunch();
    }catch(e){UPD.busy=false;msg.textContent=tr("upd.failed");go.disabled=false;later.hidden=false}
  });
  document.body.append(bar);
}
if(window.__TAURI__&&window.__TAURI__.updater){setTimeout(updCheck,8000);setInterval(updCheck,6*3600*1000)}
