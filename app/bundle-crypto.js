// Bundles src/crypto.ts into one browser script that defines the global `PrekCrypto`. Prints it to stdout.
const esbuild=require("esbuild"),path=require("path");
const r=esbuild.buildSync({entryPoints:[path.join(__dirname,"../src/crypto.ts")],bundle:true,format:"iife",globalName:"PrekCrypto",target:"es2020",write:false,legalComments:"none"});
process.stdout.write(r.outputFiles[0].text);
