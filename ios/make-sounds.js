// Renders the two app sounds (src/sound.ts: the marimba message sound and the double-ping bell) to WAV files for the
// native sound player (ios/sounds/pling.wav and dobbelt.wav). Same code as in the page, so they sound the same.
// Run from the repo root: NODE_PATH=/opt/npm-tools/node_modules node ios/make-sounds.js
const {chromium}=require("playwright"),{execFileSync}=require("child_process"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const bundle=execFileSync("node",[path.join(root,"app/bundle.js")],{maxBuffer:1<<28}).toString();
const wav=(x,sr)=>{const b=Buffer.alloc(44+x.length*2);b.write("RIFF",0);b.writeUInt32LE(36+x.length*2,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(x.length*2,40);
  x.forEach((v,i)=>b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*32767))),44+i*2));return b};
(async()=>{
 const br=await chromium.launch(),p=await br.newPage();await p.setContent("<html></html>");await p.addScriptTag({content:bundle});
 for(const [name,secs] of [["pling",2.0],["dobbelt",3.6]]){
  const x=await p.evaluate(async([n,s])=>{const c=new OfflineAudioContext(1,44100*s,44100);n==="pling"?PrekSound.pling(c):PrekSound.dobbelt(c);return Array.from((await c.startRendering()).getChannelData(0))},[name,secs]);
  const peak=x.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
  fs.writeFileSync(path.join(__dirname,"sounds",name+".wav"),wav(x,44100));console.log(name,secs+"s","peak",peak.toFixed(2));
 }
 await br.close();
})();
