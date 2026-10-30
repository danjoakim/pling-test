// Unit tests for src/crypto.ts, run in Node (Web Crypto is built in). The module is bundled on the fly.
// tests/fixtures/crypto-vectors.json was made by the pre-TypeScript code: if these pass, the new code can
// read everything the old code wrote.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-crypto-")),"crypto.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/crypto.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const C=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/crypto-vectors.json"),"utf8"));
 let n=0;const ok=(name,fn)=>fn().then(()=>{n++;console.log("ok  ",name)});

 await ok("fingerprint and pair code match the old code",async()=>{
  assert.strictEqual(await C.fpOf(V.A.pub),V.fpA);assert.strictEqual(await C.fpOf(V.B.pub),V.fpB);
  assert.strictEqual(await C.pairCode(V.A.pub),V.pairCodeA)});

 await ok("reads every message the old code encrypted (both directions)",async()=>{
  const kB=await C.deriveChatKey(V.B.priv,V.A.pub),kA=await C.deriveChatKey(V.A.priv,V.B.pub);
  for(const m of V.messages){
   const key=m.from==="A"?kB:kA;
   assert.deepStrictEqual(await C.open(key,m.iv,m.ct),m.plain)}});

 await ok("new ciphertext round-trips and uses a fresh IV each time",async()=>{
  const kA=await C.deriveChatKey(V.A.priv,V.B.pub),kB=await C.deriveChatKey(V.B.priv,V.A.pub);
  const p={t:"Hei æøå 😊",ts:1},s1=await C.seal(kA,p),s2=await C.seal(kA,p);
  assert.notStrictEqual(s1.iv,s2.iv);assert.notStrictEqual(s1.ct,s2.ct);
  assert.deepStrictEqual(await C.open(kB,s1.iv,s1.ct),p)});

 await ok("wrong key or changed data gives null, never an exception",async()=>{
  const kA=await C.deriveChatKey(V.A.priv,V.B.pub),other=await C.generateIdentity();
  const kX=await C.deriveChatKey(other.priv,V.A.pub),m=V.messages[0];
  assert.strictEqual(await C.open(kX,m.iv,m.ct),null);
  const bad=m.ct.slice(0,-4)+(m.ct.endsWith("AAAA")?"BBBB":"AAAA");
  assert.strictEqual(await C.open(kA,m.iv,bad),null);
  assert.strictEqual(await C.open(kA,"not base64!!","also not"),null)});

 await ok("restores the identity from an old backup, typed loosely",async()=>{
  const b=V.backup;
  const id=await C.restoreBackup(b.code,b);assert.deepStrictEqual(id,V.A);
  const loose=b.code.toLowerCase().replace(/-/g," ");
  assert.deepStrictEqual(await C.restoreBackup(loose,b),V.A);
  assert.strictEqual(await C.restoreBackup("AAAAA-AAAAA-AAAAA-AAAAA-AAAAA",b),null)});

 await ok("new backup round-trips with the same parameters as before",async()=>{
  const code=C.newCode();assert.ok(/^([0-9A-HJKMNP-TV-Z]{5}-){4}[0-9A-HJKMNP-TV-Z]{5}$/.test(code));
  const b=await C.makeBackup(code,V.B);assert.strictEqual(b.iter,V.backup.iter);
  assert.deepStrictEqual(await C.restoreBackup(code,b),V.B);
  assert.strictEqual(await C.restoreBackup(C.newCode(),b),null)});

 await ok("normCode matches the old behaviour",async()=>{
  for(const [i,o] of V.normCode)assert.strictEqual(C.normCode(i),o)});

 await ok("device transfer: identity moves between two ephemeral keys",async()=>{
  const nu=await C.ephPair(),old=await C.ephPair();
  const sealed=await C.seal(await C.aesFrom(old.priv,nu.pub),{v:1,priv:V.A.priv,pub:V.A.pub});
  const got=await C.open(await C.aesFrom(nu.priv,old.pub),sealed.iv,sealed.ct);
  assert.deepStrictEqual({priv:got.priv,pub:got.pub},V.A);
  assert.strictEqual(await C.pairCode(nu.pub),await C.pairCode(nu.pub))});

 await ok("safety number and invite hash match the old code",async()=>{
  assert.strictEqual(await C.safetyNumber(V.safety.fpA,V.safety.fpB),V.safety.number);
  assert.strictEqual(await C.safetyNumber(V.safety.fpB,V.safety.fpA),V.safety.numberSwapped);
  assert.strictEqual(await C.inviteHash(V.invite.token),V.invite.hash)});

 await ok("reads the image blob the old code encrypted, and its own blobs are readable by the old expression",async()=>{
  const kB=await C.deriveChatKey(V.B.priv,V.A.pub),kA=await C.deriveChatKey(V.A.priv,V.B.pub);
  const old=new Uint8Array(Buffer.from(V.file.blobB64,"base64"));
  const want=new Uint8Array(2500).map((_,i)=>(i*31+7)&255);
  assert.deepStrictEqual(new Uint8Array(await C.decryptBytes(kB,old)),want);
  const fresh=await C.encryptBytes(kA,want),fresh2=await C.encryptBytes(kA,want);
  assert.strictEqual(fresh.length,12+want.length+16);assert.notDeepStrictEqual(fresh.slice(0,12),fresh2.slice(0,12));
  // the old reader: IV is the first 12 bytes, the rest is ciphertext
  const back=new Uint8Array(await globalThis.crypto.subtle.decrypt({name:"AES-GCM",iv:fresh.slice(0,12)},kB,fresh.slice(12)));
  assert.deepStrictEqual(back,want)});

 await ok("changed or foreign image data throws instead of returning garbage",async()=>{
  const kB=await C.deriveChatKey(V.B.priv,V.A.pub),other=await C.generateIdentity();
  const old=new Uint8Array(Buffer.from(V.file.blobB64,"base64")),bad=old.slice();bad[100]^=1;
  await assert.rejects(()=>C.decryptBytes(kB,bad));
  const kX=await C.deriveChatKey(other.priv,V.A.pub);
  await assert.rejects(()=>C.decryptBytes(kX,old))});

 await ok("new identities are valid and agree on a shared key",async()=>{
  const a=await C.generateIdentity(),b=await C.generateIdentity();
  assert.ok(/^[0-9a-f]{32}$/.test(await C.fpOf(a.pub)));assert.deepStrictEqual(Object.keys(a.pub).sort(),["crv","kty","x","y"]);
  const s=await C.seal(await C.deriveChatKey(a.priv,b.pub),{t:"x"});
  assert.deepStrictEqual(await C.open(await C.deriveChatKey(b.priv,a.pub),s.iv,s.ct),{t:"x"})});

 await ok("base64 handles large buffers",async()=>{
  const big=new Uint8Array(3_000_000).map((_,i)=>i%251);
  const back=C.ub64(C.b64(big));assert.strictEqual(back.length,big.length);assert.ok(back.every((v,i)=>v===big[i]))});

 console.log(`all ${n} crypto tests passed`);
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
