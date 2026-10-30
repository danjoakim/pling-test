/* ---------- innlogging ---------- */
function viewLogin(){
  const app=scrHost();
  const email=el("input",{type:"email",placeholder:tr("auth.emailPlaceholder"),autocomplete:"email",id:"em"});
  const pw=el("input",{type:"password",placeholder:tr("auth.passwordPlaceholder"),autocomplete:S.mode==="up"?"new-password":"current-password",id:"pw"});
  const code=el("input",{type:"text",placeholder:tr("auth.codePlaceholder"),inputmode:"numeric",id:"cd",autocomplete:"one-time-code"});
  const go=async()=>{
    try{
      if(S.mode==="up"){
        const d=await q(api.signUp(email.value.trim(),pw.value),tr("ctx.signUp"));
        if(!d.session)toast(tr("auth.accountCreated"));
      }else{
        await q(api.signIn(email.value.trim(),pw.value),tr("ctx.signIn"));
      }
    }catch(e){fail(e)}
  };
  const sendCode=async()=>{try{await q(api.sendLoginCode(email.value.trim(),location.origin+location.pathname),tr("ctx.sendCode"));S.needCode=true;toast(tr("auth.emailSent"));viewLogin()}catch(e){fail(e)}};
  const verify=async()=>{try{await q(api.verifyLoginCode(email.value.trim(),code.value.trim()),tr("ctx.verifyCode"))}catch(e){fail(e)}};
  app.classList.add("lgn");
  let remMail="";try{remMail=localStorage.getItem("pling_remember_email")||""}catch(e){}
  if(remMail&&!email.value)email.value=remMail;
  const rem=el("input",{type:"checkbox",id:"rem"});rem.checked=!!remMail;
  const lst=el("select",{id:"lst","aria-label":tr("auth.statusLabel")},el("option",{value:"online"},tr("status.on")),el("option",{value:"busy"},tr("status.busy")),el("option",{value:"away"},tr("status.away")),el("option",{value:"off"},tr("auth.showOffline")));
  const go0=go;
  const goW=async()=>{try{localStorage.setItem("pling_st_next",lst.value);if(rem.checked)localStorage.setItem("pling_remember_email",email.value.trim());else{localStorage.removeItem("pling_remember_email");localStorage.removeItem("pling_last_av")}}catch(e){}await go0()};
  const fr=el("div",{class:"lpic"});let lastAv=null;try{lastAv=remMail?localStorage.getItem("pling_last_av"):null}catch(e){}if(lastAv&&okAv(lastAv)){fr.classList.add("hasav");fr.append(el("img",{src:lastAv,alt:""}))}else fr.append(ico("lgi"));
  const wm=el("div",{class:"lwm","aria-hidden":"true"});wm.hidden=true;
  app.append(
    fr,
    el("div",{class:"lh"},prk("lgn")),
    el("div",{class:"invb",id:"invb",hidden:true}),
    el("div",{class:"dim lc"},S.mode==="up"?tr("auth.signupTagline"):tr("auth.tagline")),
    el("label",{for:"em",class:"ll"},tr("auth.emailLabel")),email,
    el("label",{for:"pw",class:"ll"},tr("auth.passwordLabel")),pw,
    el("div",{class:"lrow"},el("label",{for:"lst",class:"ll"},tr("auth.statusColon")),lst),
    el("label",{class:"lchk"},rem,tr("auth.remember")),
    ...(S.needCode?[el("div",{class:"row"},code,el("button",{id:"vf",onclick:verify},tr("auth.verify")))]:[]),
    el("button",{id:"go",class:"lgo",onclick:goW},S.mode==="up"?tr("auth.createAccount"):tr("auth.login")),
    el("div",{class:"llinks"},
      el("button",{class:"llink",id:"otp",type:"button",onclick:sendCode},tr("auth.sendOtp")),
      el("button",{class:"llink",type:"button",onclick:()=>{S.mode=S.mode==="up"?"in":"up";viewLogin()}},S.mode==="up"?tr("auth.haveAccount"):tr("auth.newAccount"))),
    el("div",{class:"fine lc"},tr("auth.e2eNote"),el("button",{class:"llink",type:"button",onclick:showInfo},tr("info.title"))),
    wm);
  pw.addEventListener("keydown",e=>{if(e.key==="Enter")goW()});
  showInviteBanner();
}

/* ---------- oppsett av profil ---------- */
async function afterLogin(user){
  S.user=user;
  const rows=await q(api.getProfile(user.id),tr("ctx.fetchProfile"));
  S.profile=rows[0]||null;S.id=loadIdentity(user.id);
  if(S.profile&&!S.id){viewNoKey();return}
  if(!S.profile){viewSetup();return}
  const fp=await fpOf(S.id.pub);
  if(fp!==S.profile.fp){viewNoKey();return}
  await start();
}
function viewSetup(){
  const app=scrHost();
  const name=el("input",{type:"text",placeholder:tr("setup.displayName"),maxlength:"40",id:"nm"});
  const go=async()=>{
    const n=name.value.trim();if(!n)return toast(tr("setup.enterName"),true);
    try{
      const id=S.id||await makeIdentity(S.user.id);S.id=id;
      const fp=await fpOf(id.pub);
      await q(api.createProfile({id:S.user.id,fp,name:n,pub:id.pub}),tr("ctx.createProfile"));
      S.profile={id:S.user.id,fp,name:n,pub:id.pub};showRecovery(true);
    }catch(e){fail(e)}
  };
  app.append(el("h1",{},tr("setup.welcome")),el("div",{class:"card"},
    el("p",{},tr("setup.explain")),
    el("p",{},name),el("button",{id:"mk",onclick:go},tr("setup.continue"))));
}
function viewNoKey(){
  const app=scrHost();
  const code=el("input",{type:"text",placeholder:"XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",id:"rc",autocapitalize:"characters",autocomplete:"off"});
  app.append(el("h1",{},tr("nokey.title")),
    el("div",{class:"card"},el("p",{},tr("nokey.explain"))),
    el("div",{class:"card"},el("strong",{},tr("nokey.option1")),el("p",{class:"dim"},tr("nokey.option1Hint")),
      el("button",{id:"pair",onclick:startPairing},tr("nokey.ask"))),
    el("div",{class:"card"},el("strong",{},tr("nokey.option2")),el("p",{class:"dim"},tr("nokey.option2Hint")),
      el("div",{class:"row"},code,el("button",{id:"rcgo",onclick:async()=>{try{await adoptIdentity(await restoreFromCode(code.value));toast(tr("nokey.restored"));await start()}catch(e){fail(e)}}},tr("nokey.restore")))),
    el("button",{class:"glass",onclick:doLogout},tr("common.logout")));
}
async function startPairing(){
  const app=scrHost();
  let stop=false,id=null;
  const cancel=async()=>{stop=true;if(id)try{await api.deleteTransfer(id)}catch(e){}viewNoKey()};
  try{
    const e=await ephPair();id=crypto.randomUUID();
    await q(api.askTransfer({id,user_id:S.user.id,eph_pub:e.pub}),tr("ctx.askKey"));
    const code=await pairCode(e.pub),url=location.origin+location.pathname+"#godkjenn";
    const box=el("div",{class:"qr",id:"qrbox"});box.innerHTML=qrSvg(url);
    app.append(el("h1",{},tr("pairing.title")),
      el("div",{class:"card"},
        el("p",{},tr("pairing.explain")),
        el("div",{class:"code",id:"pcode"},code),
        el("p",{class:"dim"},tr("pairing.scan")),box,
        el("p",{},el("button",{class:"glass",id:"pcancel",onclick:cancel},tr("cam.cancel")))));
    const t0=Date.now();
    const poll=async()=>{
      if(stop)return;
      try{
        const rows=await q(api.getTransfer(id)),r=rows[0];
        if(!r){stop=true;toast(tr("pairing.rejected"),true);viewNoKey();return}
        if(r.status==="approved"){
          stop=true;
          const key=await aesFrom(e.priv,r.sender_pub),o=await open(key,r.iv,r.ct);
          if(!o)throw new Error(tr("pairing.cannotOpen"));
          await adoptIdentity({priv:o.priv,pub:o.pub});
          await api.deleteTransfer(id);
          toast(tr("nokey.restored"));await start();return;
        }
        if(Date.now()-t0>10*60*1000){stop=true;await cancel();return}
      }catch(err){stop=true;fail(err);viewNoKey();return}
      setTimeout(poll,2000);
    };poll();
  }catch(err){fail(err);viewNoKey()}
}

/* ---------- gjenopprettingskode ---------- */
function showRecovery(first){
  const app=scrHost();
  const code=newCode();
  const typed=el("input",{type:"text",placeholder:tr("recovery.retype"),id:"rcv",autocapitalize:"characters",autocomplete:"off"});
  const go=async()=>{
    if(normCode(typed.value)!==normCode(code))return toast(tr("recovery.mismatch"),true);
    try{await saveBackup(code);toast(tr("recovery.activated"));await start()}catch(e){fail(e)}
  };
  app.append(el("h1",{},first?tr("recovery.lastStep"):tr("recovery.newCode")),
    el("div",{class:"card"},
      el("p",{},tr("recovery.explain")),
      el("div",{class:"code",id:"rccode"},code),
      el("div",{class:"row",style:"margin-top:10px"},
        el("button",{class:"glass sm",id:"cp",onclick:async()=>{try{await navigator.clipboard.writeText(code);toast(tr("recovery.copied"))}catch(e){toast(tr("recovery.copyFailed"),true)}}},tr("common.copy")),
        el("button",{class:"glass sm",id:"dl",onclick:()=>download("prek-gjenopprettingskode.txt",tr("recovery.fileContent",{code}))},tr("img.download"))),
      el("p",{class:"warn"},tr("recovery.saveAdvice"))),
    el("div",{class:"card"},el("p",{},typed),el("div",{class:"row"},el("button",{id:"rcgo",onclick:go},tr("recovery.saved")),
      el("button",{class:"glass sm",id:"skip",onclick:()=>{if(first)start();else showShell()}},first?tr("recovery.skip"):tr("cam.cancel")))));
}