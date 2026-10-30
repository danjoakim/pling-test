// Unit test for src/emoji.ts. tests/fixtures/emoji-vectors.json was made by the JavaScript this module replaced
// (all tables, both regular expressions and 775 sample texts with their output). If this passes, the move to TypeScript
// changed nothing. Never regenerate the fixture with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-emoji-")),"emoji.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/emoji.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const E=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/emoji-vectors.json"),"utf8"));
 const T=V.tables;
 assert.deepStrictEqual(E.EMO,T.EMO,"code table is unchanged");
 assert.deepStrictEqual([...E.EMO_LC],T.EMO_LC,"lower-case table is unchanged");
 assert.deepStrictEqual([...E.EMO_CS],T.EMO_CS,"internet smileys are unchanged");
 assert.strictEqual(E.EMO_RE.source,T.EMO_RE);assert.strictEqual(E.EMO_RE.flags,T.EMO_REf);
 assert.strictEqual(E.EMO_CS_RE.source,T.EMO_CS_RE);assert.strictEqual(E.EMO_CS_RE.flags,T.EMO_CS_REf);
 console.log("ok   tables and regular expressions match the old code ("+Object.keys(E.EMO).length+" codes)");
 let n=0;for(const [text,want] of V.cases){assert.strictEqual(E.emoji(text),want,"emoji("+JSON.stringify(text)+")");n++}
 console.log("ok   "+n+" texts convert exactly as before");
 // a few hand-checked cases, so the fixture itself is not the only judge
 assert.strictEqual(E.emoji("Hei :) :D (L)"),"Hei 😊 😃 ❤️");
 assert.strictEqual(E.emoji("Note:Done"),"Note:Done");
 assert.strictEqual(E.emoji("(a) (c) (s)"),"😇 (c) (s)");
 assert.strictEqual(E.emoji("Max_D"),"Max_D");
 console.log("ok   hand-checked cases");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
