// Unit test for src/unread.ts. tests/fixtures/unread-vectors.json has the answers of the inline code in main.js that this replaced
// (loadPreviews, alertDp, loadMsgs). Never regenerate it with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-un-")),"unread.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/unread.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const U=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/unread-vectors.json"),"utf8")),NOW=V.now;
 const un=v=>v==="__undefined__"?undefined:v;
 for(const c of V.dm)assert.deepStrictEqual([...U.dmChats(c.cm,"me",c.friends)],c.out,"dm "+JSON.stringify(c));
 console.log("ok   dmChats gives the old chats in "+V.dm.length+" situations");
 for(const c of V.unread)assert.strictEqual(U.unreadCount(c.rows,"me",c.readId,c.isOpen),c.out,"unread "+JSON.stringify(c));
 console.log("ok   unreadCount gives the old count in "+V.unread.length+" situations");
 for(const c of V.ring)assert.strictEqual(U.shouldRing(c.firstRef,c.n,un(c.before),c.muted),c.out,"ring "+JSON.stringify(c));
 console.log("ok   shouldRing gives the old answer in "+V.ring.length+" situations");
 for(const c of V.cand)assert.strictEqual(U.dpCandidate(c.r,"me",c.readId,new Set(c.seen),NOW),c.out,"cand "+JSON.stringify(c));
 console.log("ok   dpCandidate gives the old answer in "+V.cand.length+" situations");
 for(const c of V.dp){const seen=new Set(c.seenBefore);assert.strictEqual(U.dpDecision(c.id,c.ts,NOW,seen,c.muted),c.out,"dp "+JSON.stringify(c));assert.deepStrictEqual([...seen],c.seenAfter,"remembered "+JSON.stringify(c))}
 console.log("ok   dpDecision gives the old answer and remembers the message in "+V.dp.length+" situations");
 for(const c of V.fresh)assert.deepStrictEqual(U.freshMessages(c.msgs,un(c.first),c.maxSeen),c.out,"fresh "+JSON.stringify(c));
 console.log("ok   freshMessages gives the old answer in "+V.fresh.length+" situations");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
