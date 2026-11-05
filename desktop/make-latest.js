// Writes latest.json, the file the app's updater reads (Tauri updater format), from the finished files in a folder.
// Usage: node make-latest.js <folder> <repo e.g. danjoakim/pling-test> <tag> <version> [notes]
// The folder holds: prek-mac_*.app.tar.gz (+ .sig) and prek-windows_*.exe (+ .sig). The .sig files are written by the build, signed with our key.
const fs=require("fs"),path=require("path");
const [dir,repo,tag,version,notes]=process.argv.slice(2);
if(!dir||!repo||!tag||!version)throw new Error("usage: node make-latest.js <folder> <repo> <tag> <version> [notes]");
const files=fs.readdirSync(dir);
const one=re=>{const m=files.filter(f=>re.test(f));if(m.length!==1)throw new Error("expected exactly one file matching "+re+", found "+m.length);return m[0]};
const entry=f=>({signature:fs.readFileSync(path.join(dir,f+".sig"),"utf8").trim(),url:`https://github.com/${repo}/releases/download/${tag}/${f}`});
const mac=entry(one(/^prek-mac_.*\.app\.tar\.gz$/)),win=entry(one(/^prek-windows_.*\.exe$/));
const out={version,notes:notes||"",pub_date:new Date().toISOString(),platforms:{"darwin-aarch64":mac,"darwin-x86_64":mac,"windows-x86_64":win}};
fs.writeFileSync(path.join(dir,"latest.json"),JSON.stringify(out,null,2)+"\n");
console.log("latest.json:",version,Object.keys(out.platforms).join(", "));
