// Two users: A sends an image to B (encrypted file in storage, readable by B), both see the same safety
// number, and an invite link can be made (only its SHA-256 goes to the server). Uses the fake Supabase in mock.js.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8777);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8777/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");

 // 1. image: A sends, B reads
 const png=await A.evaluate(()=>{const c=document.createElement("canvas");c.width=64;c.height=40;const g=c.getContext("2d");g.fillStyle="#d33";g.fillRect(0,0,64,40);g.fillStyle="#fff";g.fillRect(10,10,20,12);return c.toDataURL("image/png").split(",")[1]});
 await A.setInputFiles("#af",{name:"test.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 await A.waitForSelector(".pic-box img",{timeout:8000});
 await B.evaluate(()=>refresh());await B.waitForSelector(".pic-box img",{timeout:8000});
 const dim=await B.evaluate(()=>{const i=document.querySelector(".pic-box img");return new Promise(r=>{const f=()=>r([i.naturalWidth,i.naturalHeight]);i.complete?f():i.onload=f})});
 assert.deepStrictEqual(dim,[64,40],"B should decode the image at its original size");
 console.log("1 B sees the image:",dim.join("x"));

 // 2. the stored file is ciphertext (IV + data, no JPEG header), and at least IV + tag long
 const files=await A.evaluate(()=>JSON.parse(localStorage.getItem("mockfiles")||"{}"));
 const paths=Object.keys(files);assert.strictEqual(paths.length,1,"one uploaded file");
 const raw=Buffer.from(files[paths[0]].data,"base64");
 assert.ok(raw.length>12+16,"IV + tag at least");assert.ok(!(raw[0]===0xff&&raw[1]===0xd8)&&raw.indexOf("JFIF")<0&&raw.indexOf("PNG")<0,"stored file must not look like an image");
 console.log("2 stored file is ciphertext:",raw.length,"bytes");

 // 3. same safety number on both sides
 await A.click("#mb");await B.click("#mb");
 await A.waitForFunction(()=>/^\d{5}( \d{5}){5}$/.test(document.querySelector("#sn").textContent));
 await B.waitForFunction(()=>/^\d{5}( \d{5}){5}$/.test(document.querySelector("#sn").textContent));
 const sa=await A.textContent("#sn"),sb=await B.textContent("#sn");
 assert.strictEqual(sa,sb,"both friends must see the same safety number");
 console.log("3 safety number:",sa);

 // 4. invite: link has a token, server only has its SHA-256
 await A.keyboard.press("Escape");if(!(await A.isVisible("#addfp")))await A.click("#addf");await A.click("#mkinv");await A.waitForSelector("#invlink");
 const link=await A.inputValue("#invlink");const tok=link.split("#inv=")[1];assert.ok(tok&&tok.length>=20,"token in link");
 const stored=await A.evaluate(()=>JSON.parse(localStorage.getItem("mockdb")).invites.map(i=>i.hash));
 const want=await A.evaluate(async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join(""),tok);
 assert.deepStrictEqual(stored,[want],"server holds only the hash of the token");
 assert.ok(!JSON.stringify(stored).includes(tok),"token itself is never stored");
 console.log("4 invite hash stored, token not stored");

 assert.deepStrictEqual([A.errs,B.errs],[[],[]],"no page errors");
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
