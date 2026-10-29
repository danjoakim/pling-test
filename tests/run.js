// Runs every test file in this folder in its own process, in a temp working directory
// (several tests write screenshots). A test fails when it exits non-zero or prints a page error
// ("FEIL:" followed by something other than "ingen") or "TESTFEIL".
const {spawnSync}=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");
const skip=new Set(["run.js","mock.js"]);
const only=process.argv.slice(2);
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".js")&&!skip.has(f)&&(!only.length||only.includes(f))).sort();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"prek-"));
let bad=0;
for(const f of files){
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{cwd:tmp,encoding:"utf8",timeout:120000});
  const out=(r.stdout||"")+(r.stderr||"");
  const err=r.status!==0||/TESTFEIL/.test(out)||/FEIL:\s*(?!ingen)\S/.test(out);
  console.log((err?"FAIL ":"ok   ")+f);
  if(err){bad++;console.log(out.split("\n").slice(-12).map(l=>"    "+l).join("\n"))}
}
console.log(bad?`${bad} of ${files.length} failed`:`all ${files.length} passed`);
process.exit(bad?1:0);
