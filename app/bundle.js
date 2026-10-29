// Bundles the TypeScript modules into one browser script and prints it to stdout.
// Defines two globals: PrekCrypto (src/crypto.ts) and PrekI18n (src/i18n/index.ts).
const esbuild=require("esbuild"),path=require("path");
if(process.argv[2]==="--messages"){
  // Prints the language file as JSON (used by build.py to fill {{key}} in body.html).
  const r=esbuild.buildSync({entryPoints:[path.join(__dirname,"../src/i18n/index.ts")],bundle:true,format:"cjs",write:false,absWorkingDir:path.join(__dirname,"..")});
  const m={exports:{}};new Function("module","exports",r.outputFiles[0].text)(m,m.exports);
  process.stdout.write(JSON.stringify(m.exports.messages));process.exit(0);
}
const out=[["PrekCrypto","../src/crypto.ts"],["PrekI18n","../src/i18n/index.ts"]].map(([name,file])=>{
  const r=esbuild.buildSync({entryPoints:[path.join(__dirname,file)],bundle:true,format:"iife",globalName:name,target:"es2020",write:false,legalComments:"none",absWorkingDir:path.join(__dirname,"..")});
  return r.outputFiles[0].text;
});
process.stdout.write(out.join("\n"));
