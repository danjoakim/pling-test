// The two sounds, rendered offline and measured (Claude cannot hear, see beslutningslogg rule 8):
// the message sound is the marimba C4-D4-A4 (about 260.2 / 292.0 / 437.6 Hz, 0.13 s apart), the double ping (dobbeltpling)
// is a bell ringing at 1480 and 1870 Hz, and neither clips.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8779);
const SR=44100;
// Energy of one frequency in a window (Goertzel), as an amplitude.
function amp(x,f,from,to){const w=2*Math.PI*f/SR,c=2*Math.cos(w);let s1=0,s2=0;const n=to-from;
 for(let i=from;i<to;i++){const s=x[i]*(0.5-0.5*Math.cos(2*Math.PI*(i-from)/n))+c*s1-s2;s2=s1;s1=s}
 return Math.sqrt(s1*s1+s2*s2-c*s1*s2)*2/n*2}
// The strongest frequency in a window, searched in 1 Hz steps.
function peakHz(x,from,to,lo,hi){let best=0,bf=0;for(let f=lo;f<=hi;f+=1){const a=amp(x,f,from,to);if(a>best){best=a;bf=f}}return bf}
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext();
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8779/");
 const render=(which,secs)=>p.evaluate(async([which,secs])=>{const oc=new OfflineAudioContext(1,44100*secs,44100);oc.resume=()=>{};AC=oc;
  which==="dbl"?dobbelt():pling();const b=await oc.startRendering();return Array.from(b.getChannelData(0))},[which,secs]);
 const one=await render("one",2.6),dbl=await render("dbl",3.5);
 const peak=x=>x.reduce((m,v)=>Math.max(m,Math.abs(v)),0);

 // message sound: three notes starting at 0, 0.13 and 0.26 s; each window is dominated by its own note
 const win=t=>[Math.round((t+0.01)*SR),Math.round((t+0.11)*SR)];
 const notes=[[0,260.2],[0.13,292.0],[0.26,437.6]];
 for(const [t,f] of notes){const [a,b]=win(t);const got=peakHz(one,a,b,200,500);
  assert.ok(Math.abs(got-f)<4,`note at ${t}s should be about ${f} Hz, measured ${got}`)}
 assert.ok(peak(one)<0.99,"message sound does not clip ("+peak(one).toFixed(2)+")");assert.ok(peak(one)>0.4,"message sound is not too quiet ("+peak(one).toFixed(2)+")");
 console.log("1 message sound: notes",notes.map(([t,f])=>peakHz(one,...win(t),200,500)).join(" / "),"Hz, peak",peak(one).toFixed(2));

 // double ping: a bell at 1480 and 1870 Hz in two rounds, 2.8 s long; the marimba notes are not in it
 const bell=[1480,1870].map(f=>amp(dbl,f,0,Math.round(1.0*SR)));
 const marimba=[260.2,292.0,437.6].map(f=>amp(dbl,f,0,Math.round(1.0*SR)));
 assert.ok(Math.min(...bell)>5*Math.max(...marimba),"the ring is at 1480/1870 Hz, not the marimba tones: "+JSON.stringify({bell,marimba}));
 const second=amp(dbl,1480,Math.round(1.4*SR),Math.round(2.3*SR));
 assert.ok(second>0.5*bell[0],"second ring round is present");
 const tail=amp(dbl,1480,Math.round(3.3*SR),Math.round(3.5*SR));
 assert.ok(tail<0.05*bell[0],"it has stopped by 3.3 s");
 assert.ok(peak(dbl)<0.99&&peak(dbl)>0.4,"double ping level ok ("+peak(dbl).toFixed(2)+")");
 console.log("2 double ping: bell 1480/1870 Hz amplitudes",bell.map(v=>v.toFixed(3)).join(" / "),", peak",peak(dbl).toFixed(2));

 assert.deepStrictEqual(errs,[],"no page errors");
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
