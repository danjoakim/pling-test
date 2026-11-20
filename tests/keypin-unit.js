// Unit test for src/keypin.ts: remembering a friend's key and noticing a change.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-kp-")),"keypin.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/keypin.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const K=await import(out);
 const A="a".repeat(32),B="b".repeat(32);
 // first sight is remembered, the same key afterwards is ok
 let r=K.checkKey({},"f",A,A,10);
 assert.strictEqual(r.state,"new");assert.deepStrictEqual(r.pins,{f:{fp:A,seen:10}});
 r=K.checkKey(r.pins,"f",A,A,20);assert.strictEqual(r.state,"ok");assert.strictEqual(r.pins.f.seen,10);
 console.log("ok   first key is remembered, the same key is ok");
 // a different key is a change and does not overwrite the memory
 const pins={f:{fp:A,seen:10,verified:15}};
 r=K.checkKey(pins,"f",B,B,30);assert.strictEqual(r.state,"changed");assert.strictEqual(r.pins,pins);
 console.log("ok   a different key is a change and the old one stays remembered");
 // the server saying one fingerprint while the key has another is a change, even the first time, and nothing is remembered
 r=K.checkKey({},"f",A,B,5);assert.strictEqual(r.state,"changed");assert.deepStrictEqual(r.pins,{});
 r=K.checkKey(pins,"f",A,B,5);assert.strictEqual(r.state,"changed");
 // a fingerprint that is not 32 hex characters is never accepted
 r=K.checkKey({},"f","xyz","xyz",5);assert.strictEqual(r.state,"changed");assert.deepStrictEqual(r.pins,{});
 console.log("ok   a fingerprint that does not match the key, or a malformed one, is never trusted");
 // the input is never changed
 const frozen=Object.freeze({f:Object.freeze({fp:A,seen:1})});
 K.checkKey(frozen,"g",B,B,2);K.acceptNew(frozen,"f",B,3);K.markVerified(frozen,"f",4);K.clearVerified(frozen,"f");
 console.log("ok   the pins given in are not changed");
 // accepting a new key drops the compared mark; verifying needs a remembered key
 let p=K.acceptNew(pins,"f",B,40);assert.deepStrictEqual(p.f,{fp:B,seen:40});
 p=K.markVerified({f:{fp:A,seen:1}},"f",50);assert.strictEqual(p.f.verified,50);
 assert.deepStrictEqual(K.markVerified({},"f",50),{});
 p=K.clearVerified(p,"f");assert.deepStrictEqual(p.f,{fp:A,seen:1});
 console.log("ok   accept, verify and clear");
 // the row state
 assert.strictEqual(K.rowState("changed",{fp:A,seen:1,verified:2}),"changed");
 assert.strictEqual(K.rowState("ok",{fp:A,seen:1,verified:2}),"verified");
 assert.strictEqual(K.rowState("ok",{fp:A,seen:1}),"unverified");
 assert.strictEqual(K.rowState("new",undefined),"unverified");
 console.log("ok   row state");
 // invitation links carry the inviter's fingerprint
 assert.strictEqual(K.inviteFp("#inv=abc&fp="+A),A);assert.strictEqual(K.inviteFp("inv=abc&fp="+A),A);
 assert.strictEqual(K.inviteFp("#inv=abc"),null);assert.strictEqual(K.inviteFp("#inv=abc&fp=XYZ"),null);assert.strictEqual(K.inviteFp("#fp="+A+"0"),null);
 let q=K.pinFromInvite({},"f",A,7);assert.deepStrictEqual(q.f,{fp:A,seen:7,verified:7,via:"invite"});
 assert.strictEqual(K.rowState("ok",q.f),"verified");assert.strictEqual(K.checkKey(q,"f",A,A,8).state,"ok");assert.strictEqual(K.checkKey(q,"f",B,B,8).state,"changed");
 q=K.pinFromInvite({f:{fp:A,seen:1}},"f",A,9);assert.deepStrictEqual(q.f,{fp:A,seen:1,verified:9,via:"invite"});
 const keep={f:{fp:B,seen:1}};assert.strictEqual(K.pinFromInvite(keep,"f",A,9),keep);
 assert.deepStrictEqual(K.clearVerified(K.pinFromInvite({},"f",A,7),"f").f,{fp:A,seen:7});
 assert.deepStrictEqual(K.parsePins(JSON.stringify(K.pinFromInvite({},"f",A,7))).f,{fp:A,seen:7,verified:7,via:"invite"});
 console.log("ok   invitation fingerprint: read, remembered as compared, never replaces a different key");
 // damaged storage is ignored piece by piece
 assert.deepStrictEqual(K.parsePins(null),{});assert.deepStrictEqual(K.parsePins("{oops"),{});assert.deepStrictEqual(K.parsePins("[1]"),{});
 const t=K.parsePins(JSON.stringify({good:{fp:A,seen:1,verified:2},bad1:{fp:"zz",seen:1},bad2:{fp:A},bad3:null,bad4:{fp:A,seen:1,verified:"x"}}));
 assert.deepStrictEqual(t,{good:{fp:A,seen:1,verified:2},bad4:{fp:A,seen:1}});
 console.log("ok   damaged storage is dropped entry by entry");
})().catch(e=>{console.log("TESTFEIL",e.message);process.exit(1)});
