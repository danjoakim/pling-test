// Unit test for src/friends.ts. tests/fixtures/friends-vectors.json has the answers of the inline code in main.js that this replaced
// (refresh: who is a friend / who asked whom; drawFriends: the order of the list). Never regenerate it with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-fr-")),"friends.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/friends.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const M=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/friends-vectors.json"),"utf8"));
 for(const c of V.relations)assert.deepStrictEqual(M.relations(V.me,c.fr,c.rq),c.out,"relations "+JSON.stringify([c.fr,c.rq]));
 console.log("ok   relations gives the old answer in "+V.relations.length+" situations");
 const nameOf=id=>V.names[id]===undefined?"…":V.names[id];
 for(const c of V.sort){const rows=c.rows.map(r=>({...r})),r=M.sortFriendRows(rows,nameOf);assert.strictEqual(r,rows,"sorts in place");assert.deepStrictEqual(r,c.out,"sort "+JSON.stringify(c.rows))}
 console.log("ok   sortFriendRows gives the old order in "+V.sort.length+" lists");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
