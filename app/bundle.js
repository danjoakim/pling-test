// Bundles the TypeScript modules into one browser script and prints it to stdout.
// Defines seventeen globals: PrekCrypto (src/crypto.ts), PrekI18n (src/i18n/index.ts), PrekApi (src/api.ts) PrekEmoji (src/emoji.ts) PrekAvatar (src/avatar.ts) PrekGif (src/gif.ts) PrekShrink (src/shrink.ts) PrekSound (src/sound.ts) PrekLinks (src/links.ts) PrekReactions (src/reactions.ts) PrekDom (src/dom.ts) PrekState (src/state.ts) PrekPreviews (src/previews.ts) PrekFriends (src/friends.ts) PrekPresence (src/presence.ts) PrekUnread (src/unread.ts) and PrekHelpers (src/helpers.ts).
const esbuild=require("esbuild"),path=require("path");
if(process.argv[2]==="--messages"){
  // Prints the language file as JSON (used by build.py to fill {{key}} in body.html).
  const r=esbuild.buildSync({entryPoints:[path.join(__dirname,"../src/i18n/index.ts")],bundle:true,format:"cjs",write:false,absWorkingDir:path.join(__dirname,"..")});
  const m={exports:{}};new Function("module","exports",r.outputFiles[0].text)(m,m.exports);
  process.stdout.write(JSON.stringify(m.exports.messages));process.exit(0);
}
const out=[["PrekCrypto","../src/crypto.ts"],["PrekI18n","../src/i18n/index.ts"],["PrekApi","../src/api.ts"],["PrekEmoji","../src/emoji.ts"],["PrekAvatar","../src/avatar.ts"],["PrekGif","../src/gif.ts"],["PrekShrink","../src/shrink.ts"],["PrekSound","../src/sound.ts"],["PrekLinks","../src/links.ts"],["PrekReactions","../src/reactions.ts"],["PrekDom","../src/dom.ts"],["PrekState","../src/state.ts"],["PrekPreviews","../src/previews.ts"],["PrekFriends","../src/friends.ts"],["PrekPresence","../src/presence.ts"],["PrekUnread","../src/unread.ts"],["PrekHelpers","../src/helpers.ts"]].map(([name,file])=>{
  const r=esbuild.buildSync({entryPoints:[path.join(__dirname,file)],bundle:true,format:"iife",globalName:name,target:"es2020",write:false,legalComments:"none",absWorkingDir:path.join(__dirname,"..")});
  return r.outputFiles[0].text;
});
process.stdout.write(out.join("\n"));
