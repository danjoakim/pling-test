// Bundles the TypeScript modules into one browser script and prints it to stdout.
// Defines two globals: PrekCrypto (src/crypto.ts) and PrekI18n (src/i18n/index.ts).
const esbuild=require("esbuild"),path=require("path");
const out=[["PrekCrypto","../src/crypto.ts"],["PrekI18n","../src/i18n/index.ts"]].map(([name,file])=>{
  const r=esbuild.buildSync({entryPoints:[path.join(__dirname,file)],bundle:true,format:"iife",globalName:name,target:"es2020",write:false,legalComments:"none"});
  return r.outputFiles[0].text;
});
process.stdout.write(out.join("\n"));
