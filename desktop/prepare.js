// Copies the finished page (index.html) and the libraries it loads (lib/) into desktop/dist, which is what the app contains.
// The app and the web version are therefore exactly the same page. Run `npm run build` in the repo root first if the sources changed.
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),dist=path.join(__dirname,"dist");
for(const f of ["index.html","lib/supabase.js","lib/qrcode.js"])if(!fs.existsSync(path.join(root,f)))throw new Error("missing "+f);
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
fs.copyFileSync(path.join(root,"index.html"),path.join(dist,"index.html"));
fs.cpSync(path.join(root,"lib"),path.join(dist,"lib"),{recursive:true,filter:s=>!/README\.md$|LICENSE/.test(s)});
console.log("dist:",fs.readdirSync(dist).concat(fs.readdirSync(path.join(dist,"lib")).map(x=>"lib/"+x)).join(", "));
