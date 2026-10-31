// Image and GIF shrinking in the browser (shrink / shrinkGif). Calls the two functions directly in the built page, so it
// does not matter where their code lives. Uses the fake Supabase only to let the page start.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8782);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});
 await p.goto("http://localhost:8782/");
 await p.waitForFunction(()=>typeof shrink==="function"&&typeof shrinkGif==="function");

 // helpers inside the page: make a PNG file, and look at the JPEG that comes out
 await p.evaluate(()=>{
  window.mkPng=(w,h,paint)=>new Promise(r=>{const c=document.createElement("canvas");c.width=w;c.height=h;paint(c.getContext("2d"),w,h);c.toBlob(b=>r(new File([b],"x.png",{type:"image/png"})),"image/png")});
  window.look=async b=>{const u=new Uint8Array(await b.arrayBuffer());const bm=await createImageBitmap(b);const c=document.createElement("canvas");c.width=bm.width;c.height=bm.height;const g=c.getContext("2d");g.drawImage(bm,0,0);
   return{type:b.type,size:b.size,magic:[u[0],u[1]],w:bm.width,h:bm.height,px:Array.from(g.getImageData(0,0,1,1).data)}};
 });

 // 1. a big picture is scaled so the long side is 1920, and comes out as JPEG
 const r1=await p.evaluate(async()=>{const f=await mkPng(4000,1000,(g,w,h)=>{g.fillStyle="#2a7";g.fillRect(0,0,w,h)});const r=await shrink(f);return{w:r.w,h:r.h,...await look(r.blob)}});
 assert.deepStrictEqual([r1.w,r1.h,r1.type,r1.magic],[1920,480,"image/jpeg",[0xff,0xd8]]);
 assert.deepStrictEqual([r1.w,r1.h],[1920,480],"returned size is the real size");
 console.log("1 big picture scaled:",r1.w+"x"+r1.h);

 // 1b. portrait: the long side is the height
 const r1b=await p.evaluate(async()=>{const f=await mkPng(1000,3000,(g,w,h)=>{g.fillStyle="#2a7";g.fillRect(0,0,w,h)});const r=await shrink(f);const l=await look(r.blob);return{w:r.w,h:r.h,bw:l.w,bh:l.h}});
 assert.deepStrictEqual(r1b,{w:640,h:1920,bw:640,bh:1920});
 console.log("1b portrait scaled:",r1b.w+"x"+r1b.h);

 // 2. a small picture keeps its size (never made bigger)
 const r2=await p.evaluate(async()=>{const f=await mkPng(64,40,(g)=>{g.fillStyle="#d33";g.fillRect(0,0,64,40)});const r=await shrink(f);const l=await look(r.blob);return{w:r.w,h:r.h,bw:l.w,bh:l.h}});
 assert.deepStrictEqual(r2,{w:64,h:40,bw:64,bh:40});
 console.log("2 small picture unchanged in size");

 // 3. transparency becomes white (JPEG has no alpha)
 const r3=await p.evaluate(async()=>{const f=await mkPng(32,32,(g)=>{g.clearRect(0,0,32,32)});const r=await shrink(f);return(await look(r.blob)).px});
 assert.ok(r3[0]>245&&r3[1]>245&&r3[2]>245,"transparent pixel is white: "+r3);
 console.log("3 transparency becomes white");

 // 4. a noisy picture is compressed harder than the first try (quality .85) when that is over 2.5 MB
 const r4=await p.evaluate(async()=>{const f=await mkPng(1920,1920,(g,w,h)=>{const d=g.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){d.data[i]=Math.random()*255;d.data[i+1]=Math.random()*255;d.data[i+2]=Math.random()*255;d.data[i+3]=255}g.putImageData(d,0,0)});
  const r=await shrink(f);
  const c=document.createElement("canvas");c.width=r.w;c.height=r.h;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,r.w,r.h);g.drawImage(await createImageBitmap(f),0,0);
  const at=q=>new Promise(ok=>c.toBlob(b=>ok(b.size),"image/jpeg",q));
  const first=await at(.85),second=await at(.7),third=await at(.55);
  return{w:r.w,h:r.h,size:r.blob.size,first,want:first<=2.5*1024*1024?first:second<=2.5*1024*1024?second:third}});
 assert.deepStrictEqual([r4.w,r4.h],[1920,1920]);
 assert.ok(r4.first>2.5*1024*1024,"the test picture is big at quality .85 ("+r4.first+")");
 assert.strictEqual(r4.size,r4.want,"quality steps .85, .7, .55 until it fits");
 console.log("4 noisy picture compressed harder:",r4.first,"->",r4.size);

 // 5. something that is not a picture gives the readable error, not a crash
 const e5=await p.evaluate(async()=>{try{await shrink(new File(["dette er ikke et bilde"],"x.png",{type:"image/png"}));return"no error"}catch(e){return e.message}});
 assert.strictEqual(e5,"Dette er ikke et bilde nettleseren kan lese");
 console.log("5 unreadable file:",e5);

 // 6. shrinkGif: a GIF with many frames drops frames (every 2nd for 250 frames), adds the delays, and scales to 480 on the long side
 const g6=await p.evaluate(async()=>{
  const w=1000,h=500,fr=[];for(let t=0;t<250;t++){const a=new Uint8ClampedArray(w*h*4);const v=t%2?255:0;for(let i=0;i<a.length;i+=4){a[i]=v;a[i+1]=60;a[i+2]=200;a[i+3]=255}fr.push({rgba:a,hasT:false,delay:40})}
  const f=new File([gifEncode(fr,w,h)],"a.gif",{type:"image/gif"});
  const steps=[];const r=await shrinkGif(f,10*1024*1024,(i,n)=>steps.push([i,n]));
  const d=new ImageDecoder({data:r.bytes,type:"image/gif"});await d.tracks.ready;await d.completed;
  const img=(await d.decode({frameIndex:0})).image,dur=img.duration;img.close();
  return{w:r.w,h:r.h,steps,frames:d.tracks.selectedTrack.frameCount,dur,head:new TextDecoder().decode(r.bytes.slice(0,6))}});
 assert.deepStrictEqual([g6.w,g6.h,g6.steps],[480,240,[[1,10]]]);
 assert.strictEqual(g6.frames,125,"every 2nd frame kept");assert.ok(/^GIF8[79]a$/.test(g6.head));
 assert.ok(Math.abs(g6.dur-80000)<=10000,"delays added up (80 ms): "+g6.dur);
 console.log("6 many-frame GIF:",g6.w+"x"+g6.h,g6.frames,"frames, delay",g6.dur/1000,"ms");

 // 7. shrinkGif that never gets under the limit: reports all 10 tries, then the readable error
 const g7=await p.evaluate(async()=>{
  const a=new Uint8ClampedArray(40*30*4);for(let i=0;i<a.length;i+=4){a[i]=i%251;a[i+1]=i%13*19;a[i+2]=i%7*35;a[i+3]=255}
  const f=new File([gifEncode([{rgba:a,hasT:false,delay:100}],40,30)],"a.gif",{type:"image/gif"});
  const steps=[];let msg="";try{await shrinkGif(f,10,(i,n)=>steps.push(i+"/"+n))}catch(e){msg=e.message}return{steps,msg}});
 assert.deepStrictEqual(g7.steps,["1/10","2/10","3/10","4/10","5/10","6/10","7/10","8/10","9/10","10/10"]);
 assert.strictEqual(g7.msg,"Klarte ikke å gjøre GIF-en liten nok");
 console.log("7 impossible limit: 10 tries, then",g7.msg);

 // 8. over 40 MB is refused before anything is decoded; without ImageDecoder the readable error comes first
 const g8=await p.evaluate(async()=>{
  const big=new File([new Uint8Array(41*1024*1024)],"b.gif",{type:"image/gif"});let a="";try{await shrinkGif(big,3000000)}catch(e){a=e.message}
  const keep=window.ImageDecoder;window.ImageDecoder=undefined;let b="";try{await shrinkGif(new File([new Uint8Array(10)],"c.gif"),3000000)}catch(e){b=e.message}window.ImageDecoder=keep;return{a,b}});
 assert.strictEqual(g8.a,"GIF-en er altfor stor til å bli gjort mindre (over 40 MB)");
 assert.strictEqual(g8.b,"Nettleseren din kan ikke gjøre GIF-er mindre. Velg en mindre GIF.");
 console.log("8 limits:",g8.a,"|",g8.b);

 assert.deepStrictEqual(p.errs,[],"no page errors: "+JSON.stringify(p.errs));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
