// Links in messages: the link is clickable (trailing punctuation stays outside it), the sender fetches a preview that travels inside the
// encrypted message, the receiver validates it before showing it, and nothing breaks when the preview fails or is slow.
// Uses the fake Supabase (its linkpreview function answers with a title and a 1x1 picture).
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8783);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8783/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");
 const send=async(text)=>{await A.fill("#tx",text);await A.click("#sd");await A.waitForFunction(()=>!document.querySelector("#sd").disabled,null,{timeout:15000});await A.waitForTimeout(250)};
 const last=p=>p.evaluate(()=>{const m=[...document.querySelectorAll("#log .m")].pop();if(!m)return null;
  const a=m.querySelector("a.ulink"),c=m.querySelector("a.lkc"),im=c&&c.querySelector("img.lki");
  return{text:m.textContent,link:a?{href:a.getAttribute("href"),text:a.textContent,rel:a.rel,target:a.target,next:a.nextSibling&&a.nextSibling.textContent}:null,
   card:c?{href:c.getAttribute("href"),title:c.querySelector("b").textContent,site:c.querySelector("small").textContent,desc:(c.querySelector(".lkd")||{}).textContent||"",img:im?im.getAttribute("src").slice(0,23):null,imgLen:im?im.getAttribute("src").length:0}:null}});
 const seen=async p=>{await p.evaluate(()=>refresh());await p.waitForTimeout(400)};

 // 1. a link with a preview: A fetches it once, B sees link and card; the "." after the link is not part of it
 await send("Se https://example.org/side. Hei :)");
 const a1=await last(A);
 assert.deepStrictEqual(a1.link,{href:"https://example.org/side",text:"https://example.org/side",rel:"noopener noreferrer nofollow",target:"_blank",next:"."});
 assert.deepStrictEqual([a1.card.href,a1.card.title,a1.card.site,a1.card.img],["https://example.org/side","Viktig sak i Bergen","Avisen","data:image/jpeg;base64,"]);
 assert.ok(a1.card.desc.startsWith("En lengre beskrivelse"));
 assert.deepStrictEqual(await A.evaluate(()=>[window.__lpCalls,window.__lpLast.body.url]),[1,"https://example.org/side"],"the preview was fetched once, for the first link");
 await seen(B);const b1=await last(B);assert.deepStrictEqual(b1,a1);
 console.log("1 link + preview card on both sides:",a1.card.title);

 // 2. the preview setting off: a clickable link but no fetching and no card
 await A.evaluate(()=>{localStorage.setItem("pling_lp","0")});await A.reload();await A.waitForSelector("#men");await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await send("Bare lenke http://example.org/x?y=1&z=2!");
 const a2=await last(A);assert.strictEqual(a2.card,null);assert.deepStrictEqual([a2.link.href,a2.link.next],["http://example.org/x?y=1&z=2","!"]);
 assert.strictEqual(await A.evaluate(()=>window.__lpCalls||0),0,"no call when the setting is off");
 await A.evaluate(()=>{localStorage.removeItem("pling_lp")});await A.reload();await A.waitForSelector("#men");await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 console.log("2 setting off: link only, no call");

 // 3. the preview fails: the message is still sent, without a card
 await A.evaluate(()=>{window.__lpFail=true});
 await send("Feiler https://example.org/feil");
 const a3=await last(A);assert.strictEqual(a3.card,null);assert.strictEqual(a3.link.href,"https://example.org/feil");
 await A.evaluate(()=>{window.__lpFail=false});
 console.log("3 failing preview: message sent without card");

 // 4. the preview never answers: gives up after 8 s (the timer is shortened here) and sends without a card
 await A.evaluate(()=>{const st=window.setTimeout;window.setTimeout=(f,ms,...r)=>st(f,ms===8000?60:ms,...r);window.__oldLp=api.linkPreview;api.linkPreview=()=>new Promise(()=>{})});
 await send("Treg https://example.org/treg");
 const a4=await last(A);assert.strictEqual(a4.card,null);assert.strictEqual(a4.link.href,"https://example.org/treg");
 console.log("4 slow preview: gave up, message sent");

 // 5. a big picture in the preview is shrunk to a small JPEG (at most 360 px wide); a broken picture gives a card without picture
 const big=await A.evaluate(()=>new Promise(r=>{const c=document.createElement("canvas");c.width=1000;c.height=500;const g=c.getContext("2d");g.fillStyle="#27a";g.fillRect(0,0,1000,500);g.fillStyle="#fff";g.fillRect(100,100,300,200);r(c.toDataURL("image/png").split(",")[1])}));
 await A.evaluate(b64=>{api.linkPreview=async()=>({data:{ok:true,ti:"Stort bilde",d:"",s:"Nettsted",img:{ct:"image/png",b64}},error:null})},big);
 await send("Bilde https://example.org/bilde");
 const a5=await last(A);assert.strictEqual(a5.card.img,"data:image/jpeg;base64,");assert.ok(a5.card.imgLen<=60000,"small enough ("+a5.card.imgLen+")");
 const dim=await A.evaluate(()=>{const i=[...document.querySelectorAll("#log .m")].pop().querySelector("img.lki");return new Promise(r=>{const f=()=>r([i.naturalWidth,i.naturalHeight]);i.complete?f():i.onload=f})});
 assert.deepStrictEqual(dim,[360,180]);
 await A.evaluate(()=>{api.linkPreview=async()=>({data:{ok:true,ti:"Ødelagt bilde",d:"x",s:"S",img:{ct:"image/png",b64:"AAAA"}},error:null})});
 await send("Ødelagt https://example.org/odelagt");
 const a6=await last(A);assert.strictEqual(a6.card.title,"Ødelagt bilde");assert.strictEqual(a6.card.img,null);
 await A.evaluate(b64=>{api.linkPreview=async()=>({data:{ok:true,ti:"SVG",d:"",s:"",img:{ct:"image/svg+xml",b64}},error:null})},big);
 await send("Svg https://example.org/svg");
 const a7=await last(A);assert.strictEqual(a7.card.img,null,"only jpeg, png, webp and gif pictures are accepted");
 console.log("5 picture shrunk to",dim.join("x"),"; broken or wrong-type picture: card without picture");

 // 6. the receiver does not trust the sender: a hostile "lk" in the message is cleaned or dropped
 const sendRaw=lk=>A.evaluate(lk=>sendMsg({t:"rå melding",lk,ts:Date.now()}),lk);
 await sendRaw({u:"javascript:alert(1)",ti:"ond"});await sendRaw({u:"https://ok.example/",ti:"T".repeat(300),d:"D".repeat(500),s:"S".repeat(200),i:"data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="});
 await seen(B);
 const hostile=await B.evaluate(()=>[...document.querySelectorAll("#log .m")].slice(-2).map(m=>{const c=m.querySelector("a.lkc");return c?{href:c.getAttribute("href"),t:c.querySelector("b").textContent.length,d:c.querySelector(".lkd").textContent.length,s:c.querySelector("small").textContent.length,img:!!c.querySelector("img")}:null}));
 assert.deepStrictEqual(hostile,[null,{href:"https://ok.example/",t:140,d:240,s:60,img:false}]);
 console.log("6 hostile preview: javascript: link dropped; text cut to 140/240/60; svg picture refused");

 // 7. several links in one message, links next to emoji codes
 await A.evaluate(()=>{api.linkPreview=window.__oldLp});
 await send("(https://a.example/x) og https://b.example/y, :D");
 const a8=await last(A);assert.strictEqual(a8.link.href,"https://a.example/x");
 const all=await A.evaluate(()=>[...[...document.querySelectorAll("#log .m")].pop().querySelectorAll("a.ulink")].map(a=>a.getAttribute("href")));
 assert.deepStrictEqual(all,["https://a.example/x","https://b.example/y"]);
 console.log("7 two links in one message");

 assert.deepStrictEqual([A.errs,B.errs],[[],[]],"no page errors: "+JSON.stringify([A.errs,B.errs]));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
