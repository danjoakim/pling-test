// Copies the finished page (index.html) and the libraries it loads (lib/) into ios/www, which is what the iPhone app contains.
// Same page as the web version and the desktop app. Run `npm run build` in the repo root first if the sources changed.
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),dist=path.join(__dirname,"www");
for(const f of ["index.html","lib/supabase.js","lib/qrcode.js","lib/jsqr.js"])if(!fs.existsSync(path.join(root,f)))throw new Error("missing "+f);
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
fs.copyFileSync(path.join(root,"index.html"),path.join(dist,"index.html"));
fs.cpSync(path.join(root,"lib"),path.join(dist,"lib"),{recursive:true,filter:s=>!/README\.md$|LICENSE/.test(s)});
fs.cpSync(path.join(__dirname,"sounds"),path.join(dist,"sounds"),{recursive:true}); // the app sounds for the native sound player (sound.js)
console.log("www:",fs.readdirSync(dist).join(", "));
