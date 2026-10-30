// Avatars in the browser: the avatar element looks as before (picture only when the stored string passes okAv, otherwise the initial
// on a color from the name), a chosen picture becomes a centered 64x64 JPEG, a file that is not a picture is refused, and the whole
// flow works for a user (choose picture -> stored -> shown). Expected element strings were recorded from the code this replaced.
// The initial is the first whole character (fix of 30 Oct): names that start with an emoji or a flag are checked in step 1b.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8781);
const P="data:image/jpeg;base64,AAAA";
const EXPECTED=[
 '<span class="pav x" style="background: rgb(95, 133, 50);">A</span>',
 '<span class="pav y"><img alt="" src="data:image/jpeg;base64,AAAA"></span>',
 '<span class="pav z" style="background: rgb(133, 50, 50);">?</span>',
 '<span class="pav q" style="background: rgb(133, 82, 50);">Å</span>',
 '<span class="pav me big"><img alt="" src="data:image/jpeg;base64,AAAA"></span>'];
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8781/");await p.waitForTimeout(500);

 // 1. the element
 const el=await p.evaluate(P=>[["Alice",null,"x"],["bob",P,"y"],["",undefined,"z"],["Åse","data:image/png;base64,AAAA","q"],["Dan Joakim",P,"me big"]].map(a=>avEl(...a).outerHTML),P);
 assert.deepStrictEqual(el,EXPECTED);
 console.log("1 avatar elements look as before");
 // 1b. names starting with an emoji or a flag show that whole character (they used to show half of it)
 const ini=await p.evaluate(()=>["😊 smil","🇳🇴 Norge","åse","","Dan"].map(n=>avEl(n,null,"").textContent));
 assert.deepStrictEqual(ini,["😊","🇳🇴","Å","?","D"]);
 console.log("1b initials are whole characters:",ini.join(" "));

 // 2. a picture is cut to its centered square and scaled to 64x64: a 200x100 picture, red left half and blue right half
 const px=await p.evaluate(async()=>{
  const c=document.createElement("canvas");c.width=200;c.height=100;const g=c.getContext("2d");g.fillStyle="#f00";g.fillRect(0,0,100,100);g.fillStyle="#00f";g.fillRect(100,0,100,100);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));const url=await toAvatar(blob);
  const im=new Image();im.src=url;await im.decode();const o=document.createElement("canvas");o.width=o.height=64;const h=o.getContext("2d");h.drawImage(im,0,0);
  const at=(x,y)=>Array.from(h.getImageData(x,y,1,1).data).slice(0,3);
  return {ok:okAv(url),w:im.naturalWidth,h:im.naturalHeight,left:at(8,32),right:at(56,32)}});
 assert.ok(px.ok,"result passes okAv");assert.deepStrictEqual([px.w,px.h],[64,64]);
 assert.ok(px.left[0]>200&&px.left[2]<60,"left side is red: "+px.left);assert.ok(px.right[2]>200&&px.right[0]<60,"right side is blue: "+px.right);
 console.log("2 picture cut and scaled:",JSON.stringify(px));

 // 3. a file that is not a picture is refused
 assert.strictEqual(await p.evaluate(async()=>{try{await toAvatar(new Blob(["not an image"]));return false}catch(e){return true}}),true);
 console.log("3 non-picture refused");

 // 4. the flow: sign up, choose a profile picture, it is stored (small JPEG) and shown
 await p.click("text=Ny konto");await p.fill("#em","alice@x.test");await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm","😊 Alice");await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men");
 assert.strictEqual(await p.textContent("#avini"),"😊","own initial is the whole emoji");
 const png=await p.evaluate(()=>{const c=document.createElement("canvas");c.width=120;c.height=80;const g=c.getContext("2d");g.fillStyle="#2a7";g.fillRect(0,0,120,80);return c.toDataURL("image/png").split(",")[1]});
 await p.setInputFiles("#avf",{name:"me.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 await p.waitForFunction(()=>Object.keys(localStorage).some(k=>/^pling_av_/.test(k)),null,{timeout:8000});
 const stored=await p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/^pling_av_/.test(k));return localStorage.getItem(k)});
 assert.ok(stored.startsWith("data:image/jpeg;base64,")&&stored.length<12000,"stored avatar is a small JPEG");
 assert.ok(await p.evaluate(()=>[...document.querySelectorAll("img")].some(i=>i.src.startsWith("data:image/jpeg;base64,")&&i.offsetParent)),"the picture is shown");
 console.log("4 profile picture chosen, stored and shown:",stored.length,"characters");

 assert.deepStrictEqual(p.errs,[],"no page errors: "+JSON.stringify(p.errs));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
