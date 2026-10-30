// Unit test for the GIF encoder in src/gif.ts. tests/fixtures/gif-vectors.json was made by the JavaScript it replaced: 13 frame sets
// (single pixel, transparency, noise that forces dictionary resets, gradients, odd delays ...) with the exact bytes (SHA-256, and
// the full file when small), the palette step, the LZW step and the GIF header check. Byte for byte the same means files made before
// and after the move are identical. Never regenerate the fixture with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert"),crypto=require("crypto");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-gif-")),"gif.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/gif.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const G=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/gif-vectors.json"),"utf8"));
 const sha=b=>crypto.createHash("sha256").update(Buffer.from(b)).digest("hex");
 for(const c of V.cases){
  const frames=c.frames.map(f=>({rgba:new Uint8ClampedArray(Buffer.from(f.rgba,"base64")),hasT:f.hasT,delay:f.delay}));
  const q=G.gifQuant(frames[0].rgba,c.w*c.h,frames[0].hasT);
  assert.deepStrictEqual([q.bits,q.tIdx,sha(q.idx),sha(q.table)],[c.quant.bits,c.quant.tIdx,c.quant.idxSha,c.quant.tableSha],c.name+": palette step");
  const bytes=G.gifEncode(frames,c.w,c.h);
  assert.strictEqual(bytes.length,c.gif.len,c.name+": length");assert.strictEqual(sha(bytes),c.gif.sha,c.name+": bytes");
  if(c.gif.b64)assert.strictEqual(Buffer.from(bytes).toString("base64"),c.gif.b64,c.name+": full file");
  assert.strictEqual(String.fromCharCode(...bytes.slice(0,6)),"GIF89a");assert.strictEqual(bytes[bytes.length-1],0x3B,c.name+": trailer");
  assert.deepStrictEqual([bytes[6]|bytes[7]<<8,bytes[8]|bytes[9]<<8],[c.w,c.h],c.name+": size in the header");
 }
 console.log("ok   "+V.cases.length+" frame sets encode to exactly the same bytes as before");
 for(const l of V.lzw)assert.deepStrictEqual(G.gifLzw(Uint8Array.from(l.idx),l.mb),l.out);
 console.log("ok   LZW gives the same codes for "+V.lzw.length+" inputs (incl. dictionary reset)");
 for(const r of V.readGif){const got=await G.readGif(new Blob([Uint8Array.from(r.in)]));assert.deepStrictEqual(got?{w:got.w,h:got.h,len:got.bytes.length}:null,r.out,"readGif "+JSON.stringify(r.in))}
 console.log("ok   readGif accepts and refuses the same files ("+V.readGif.length+" inputs)");
 assert.strictEqual(G.GIF_MAX,3000000);
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
