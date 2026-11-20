// Native sound player (iPhone app): the app sounds play through the plugin when it is there and has loaded the files,
// and fall back to the Web Audio sounds when it is not there, when loading a file fails, or when playing fails.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8801);
(async()=>{
 const br=await chromium.launch({args:["--autoplay-policy=no-user-gesture-required"]});
 const open=async(mode)=>{ // mode: ok | none | badload | badplay
  const ctx=await br.newContext();await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
  await ctx.addInitScript(()=>{window.__osc=0;const o=BaseAudioContext.prototype.createOscillator;BaseAudioContext.prototype.createOscillator=function(){__osc++;return o.call(this)}});
  if(mode!=="none")await ctx.addInitScript(m=>{window.__calls=[];const rec=(n,o)=>{__calls.push([n,o])};
   window.Capacitor={isNativePlatform:()=>true,Plugins:{NativeAudio:{
    configure:async o=>{rec("configure",o)},
    preload:async o=>{rec("preload",o);if(m==="badload")throw new Error("no such file")},
    play:async o=>{rec("play",o);if(m==="badplay")throw new Error("cannot play")}}}}},mode);
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8801/");await p.waitForTimeout(300);
  return {p,errs,ctx};
 };
 // web = how many Web Audio oscillators were made (the marimba and the bell are made of them)
 const sounds=async p=>{await p.evaluate(()=>{__osc=0;pling()});await p.waitForTimeout(500);const a=await p.evaluate(()=>__osc);await p.evaluate(()=>{__osc=0;dobbelt()});await p.waitForTimeout(500);const b=await p.evaluate(()=>__osc);
  return {calls:await p.evaluate(()=>window.__calls||[]),web:[a>0?"pling":null,b>0?"dobbelt":null].filter(Boolean)}};
 // 1. plugin there and files loaded: configured first, both files preloaded, sounds play natively and not through Web Audio
 let {p,errs,ctx}=await open("ok");let r=await sounds(p);
 assert.strictEqual(r.calls[0][0],"configure");assert.strictEqual(r.calls[0][1].focus,false,"does not take audio focus from other apps");
 assert.deepStrictEqual(r.calls.filter(c=>c[0]==="preload").map(c=>[c[1].assetId,c[1].assetPath,c[1].isUrl]),[["pling","sounds/pling.wav",false],["dobbelt","sounds/dobbelt.wav",false]]);
 assert.deepStrictEqual(r.calls.filter(c=>c[0]==="play").map(c=>c[1].assetId),["pling","dobbelt"]);assert.deepStrictEqual(r.web,[],"nothing through Web Audio");
 console.log("1 native player used for both sounds");
 // 2. sound switched off: silence
 await p.evaluate(()=>{setSound(false);__calls.length=0});r=await sounds(p);assert.deepStrictEqual([r.calls,r.web],[[],[]],"silent when sound is off");
 console.log("2 sound off gives no sound");
 assert.deepStrictEqual(errs,[]);await ctx.close();
 // 3. no plugin (web, desktop, test): Web Audio as before
 ({p,errs,ctx}=await open("none"));r=await sounds(p);assert.deepStrictEqual(r.web,["pling","dobbelt"]);assert.deepStrictEqual(errs,[]);await ctx.close();
 console.log("3 without the plugin the old sounds play");
 // 4. a file that cannot be loaded: Web Audio
 ({p,errs,ctx}=await open("badload"));r=await sounds(p);assert.deepStrictEqual(r.calls.filter(c=>c[0]==="play"),[],"never plays a file that did not load");assert.deepStrictEqual(r.web,["pling","dobbelt"]);assert.deepStrictEqual(errs,[]);await ctx.close();
 console.log("4 failed load falls back");
 // 5. playing fails: this sound comes through Web Audio, and the next ones too
 ({p,errs,ctx}=await open("badplay"));r=await sounds(p);assert.deepStrictEqual(r.web,["pling","dobbelt"],"the failed sound is played the old way");
 await p.evaluate(()=>{__calls.length=0});r=await sounds(p);assert.deepStrictEqual([r.calls.filter(c=>c[0]==="play").length,r.web],[0,["pling","dobbelt"]]);assert.deepStrictEqual(errs,[]);await ctx.close();
 console.log("5 failed play falls back");
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
