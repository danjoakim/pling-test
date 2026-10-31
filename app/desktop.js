//# Inside the desktop app (Tauri) a link to another address would replace the app window. This hands such links to the system browser
//# (the opener plugin, see desktop/src-tauri/src/lib.rs). On the web, window.__TAURI_INTERNALS__ does not exist and nothing happens.
//# The class "desk" on <html> lets the page fill the whole app window instead of floating as a framed window on a background (see extra.css).
if(window.__TAURI_INTERNALS__)document.documentElement.classList.add("desk");
if(window.__TAURI_INTERNALS__)document.addEventListener("click",e=>{
  const a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;
  const u=externalLink(a.href,location.origin);if(!u)return;
  e.preventDefault();
  window.__TAURI_INTERNALS__.invoke("plugin:opener|open_url",{url:u}).catch(()=>{});
},true);
