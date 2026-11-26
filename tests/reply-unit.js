// Svar på enkeltmeldinger (26. nov): formatet og kontrollen av det som kommer fra en annen person (src/reply.ts).
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-reply-")),"reply.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/reply.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const R=await import(out);
 // makeReply
 assert.deepStrictEqual(R.makeReply({id:7,mine:false,t:"Hei på deg"}),{i:7,a:0,q:"Hei på deg"},"kompisens melding");
 assert.deepStrictEqual(R.makeReply({id:7,mine:true,t:"Hei"}),{i:7,a:1,q:"Hei"},"egen melding");
 assert.deepStrictEqual(R.makeReply({id:9,mine:false,t:null,img:{p:"x"}}),{i:9,a:0,q:"",k:"img"},"bilde");
 assert.strictEqual(R.makeReply({id:"p123",mine:true,t:"venter"}),null,"melding som ikke er lagret kan ikke siteres");
 assert.strictEqual(R.makeReply({id:3,mine:true,t:"   "}),null,"tom tekst");
 assert.strictEqual(R.makeReply({id:0,mine:true,t:"x"}),null);
 const long="a".repeat(500);const q=R.makeReply({id:1,mine:false,t:long}).q;
 assert.strictEqual([...q].length,140);assert.ok(q.endsWith("…"),"lang tekst kuttes med …");
 assert.strictEqual(R.makeReply({id:1,mine:false,t:"a\n\n  b\tc"}).q,"a b c","linjeskift og mellomrom slås sammen");
 assert.strictEqual(R.makeReply({id:1,mine:false,t:"\u0007x\u202Ehei\u2067"}).q,"x hei","kontrolltegn og retningsstyring fjernes");
 // validReply: hostile input
 assert.strictEqual(R.validReply(null),null);assert.strictEqual(R.validReply("tekst"),null);assert.strictEqual(R.validReply([1,2]),null);
 assert.strictEqual(R.validReply({i:1,a:1,q:""}),null,"uten tekst og uten bilde: ingenting å vise");
 assert.deepStrictEqual(R.validReply({i:5,a:1,q:"hei"}),{i:5,a:1,q:"hei"});
 assert.deepStrictEqual(R.validReply({i:"5",a:"1",q:"hei"}),{i:null,a:0,q:"hei"},"feil typer: id droppes, a blir 0");
 assert.deepStrictEqual(R.validReply({i:-4,a:2,q:"x"}),{i:null,a:0,q:"x"});
 assert.deepStrictEqual(R.validReply({i:1.5,q:"x"}),{i:null,a:0,q:"x"});
 assert.deepStrictEqual(R.validReply({i:1e20,q:"x"}),{i:null,a:0,q:"x"});
 assert.deepStrictEqual(R.validReply({i:2,a:0,k:"img",q:"<img src=x onerror=alert(1)>"}),{i:2,a:0,q:"",k:"img"},"bilde: teksten ignoreres");
 assert.deepStrictEqual(R.validReply({i:2,k:"annet",q:"hei"}),{i:2,a:0,q:"hei"},"ukjent k ignoreres");
 assert.strictEqual([...R.validReply({i:1,q:"b".repeat(100000)}).q].length,140,"lang sitattekst fra andre kuttes");
 assert.deepStrictEqual(Object.keys(R.validReply({i:1,q:"x",extra:"y",__proto__:{z:1}})).sort(),["a","i","q"],"ingen ekstra felt kommer gjennom");
 // quoteAuthor fra seerens side
 assert.strictEqual(R.quoteAuthor({i:1,a:1,q:"x"},true),"me","jeg svarte på min egen melding");
 assert.strictEqual(R.quoteAuthor({i:1,a:1,q:"x"},false),"other","kompisen siterte sin egen melding");
 assert.strictEqual(R.quoteAuthor({i:1,a:0,q:"x"},true),"other","jeg svarte på kompisens");
 assert.strictEqual(R.quoteAuthor({i:1,a:0,q:"x"},false),"me","kompisen svarte på min melding");
 console.log("FEIL: ingen");
})().catch(e=>{console.log("TESTFEIL",e.message);process.exit(1)});
