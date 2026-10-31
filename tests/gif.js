// GIF handling: a small GIF is sent unchanged and stays animated, the stored file is ciphertext, a too-big GIF is
// shrunk under the 3 MB limit and still animated, and a fake .gif (not a GIF) is not sent. Uses the fake Supabase.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"prek-gif-"));
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8778);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8778/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 const count=p=>p.evaluate(()=>document.querySelectorAll(".pic-box img").length);
 const info=p=>p.evaluate(async()=>{const imgs=document.querySelectorAll(".pic-box img");const i=imgs[imgs.length-1];const b=await fetch(i.src).then(r=>r.arrayBuffer());
  const d=new ImageDecoder({data:b,type:"image/gif"});await d.tracks.ready;await d.completed;
  return{size:b.byteLength,head:new TextDecoder().decode(new Uint8Array(b).slice(0,6)),w:i.naturalWidth,h:i.naturalHeight,frames:d.tracks.selectedTrack.frameCount}});

 // 1. small two-frame GIF (10x7, made with Pillow): sent unchanged, still two frames
 const gif=Buffer.from("R0lGODlhCgAHAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAACgAHAAAIEAABCBxIsKDBgwgTKlxIMCAAIfkEAQoAAQAsAAAAAAoABwCBAAD/AAAAAAAAAAAACBAAAQgcSLCgwYMIEypcSDAgADs=","base64");
 fs.writeFileSync(path.join(tmp,"t.gif"),gif);
 await A.setInputFiles("#af",path.join(tmp,"t.gif"));await A.waitForFunction(()=>document.querySelectorAll(".pic-box img").length>=1,null,{timeout:8000});
 await A.waitForTimeout(300);
 const a1=await info(A);
 assert.strictEqual(a1.size,gif.length,"a small GIF is sent byte for byte");assert.ok(/^GIF8[79]a$/.test(a1.head));assert.strictEqual(a1.frames,2,"still animated");
 assert.deepStrictEqual([a1.w,a1.h],[10,7]);
 console.log("1 small GIF unchanged:",JSON.stringify(a1));

 // 2. B receives it
 await B.evaluate(()=>refresh());await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.waitForFunction(()=>document.querySelectorAll(".pic-box img").length>=1,null,{timeout:8000});await B.waitForTimeout(300);
 const b1=await info(B);assert.strictEqual(b1.size,gif.length);assert.strictEqual(b1.frames,2);
 console.log("2 B got the same GIF");

 // 3. the stored file is ciphertext
 const files=await A.evaluate(()=>JSON.parse(localStorage.getItem("mockfiles")||"{}"));
 const raw=Buffer.from(Object.values(files)[0].data,"base64");
 assert.ok(raw.indexOf("GIF8")<0&&raw.length>12+16,"stored GIF is encrypted (IV + ciphertext + tag)");
 console.log("3 stored file is ciphertext:",raw.length,"bytes");

 // 4. a GIF over the limit (made with the app's own encoder: 40 noisy frames, 320x240) is shrunk and stays animated
 const big=await A.evaluate(()=>{const w=320,h=240,fr=[];for(let t=0;t<40;t++){const a=new Uint8ClampedArray(w*h*4);for(let i=0;i<a.length;i+=4){a[i]=Math.random()*255;a[i+1]=Math.random()*255;a[i+2]=Math.random()*255;a[i+3]=255}fr.push({rgba:a,hasT:false,delay:80})}
  return Array.from(gifEncode(fr,w,h))});
 assert.ok(big.length>3000000,"test GIF is over the limit ("+big.length+")");
 fs.writeFileSync(path.join(tmp,"big.gif"),Buffer.from(big));
 const before=await count(A);
 await A.setInputFiles("#af",path.join(tmp,"big.gif"));
 await A.waitForFunction(b=>document.querySelectorAll(".pic-box img").length>b,before,{timeout:90000});await A.waitForTimeout(400);
 const a2=await info(A);
 assert.ok(a2.size<=3000000,"shrunk to the limit ("+a2.size+")");assert.ok(a2.frames>1,"still animated ("+a2.frames+" frames)");assert.ok(/^GIF8[79]a$/.test(a2.head));
 console.log("4 big GIF shrunk:",big.length,"->",a2.size,"bytes,",a2.frames,"frames");

 // 5. a file that only claims to be a GIF is not sent
 fs.writeFileSync(path.join(tmp,"fake.gif"),"dette er ikke en gif");
 const n5=await count(A);
 await A.setInputFiles("#af",path.join(tmp,"fake.gif"));await A.waitForTimeout(800);
 assert.strictEqual(await count(A),n5,"fake GIF is not sent");
 console.log("5 fake GIF rejected");

 // The only console error allowed is the app reporting the fake GIF (step 5).
 const other=A.errs.filter(e=>!/Dette er ikke et bilde/.test(e));
 assert.deepStrictEqual([other,B.errs],[[],[]],"no page errors: "+JSON.stringify([other,B.errs]));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
