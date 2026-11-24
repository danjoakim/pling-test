//# Finding links in text, validating link cards and fetching previews live in src/links.ts (bundled as PrekLinks). This file gives them
//# their old names and keeps what touches the page: linkify() builds the elements, lkCard() the card, LP_ON() is the setting.
//# The reasons (why the sender fetches the preview, why the receiver validates) are in src/links.ts. (Lines starting with //# are not built into the page.)
const {firstUrl,validLk}=PrekLinks;
const LP_ON=()=>{try{return localStorage.getItem("pling_lp")!=="0"}catch(e){return true}};
/* Når meldingen har et kort, skjules lenketeksten som er kortets adresse (Dan 24. nov); kortet er lenken. */
function linkify(t,lk){
  const out=[];
  for(const p of PrekLinks.splitLinksForCard(t,lk)){
    if("url" in p){out.push(el("a",{class:"ulink",href:p.url,target:"_blank",rel:"noopener noreferrer nofollow"},p.url));if(p.tail)out.push(p.tail)}
    else out.push(...emojiNodes(p.text));
  }
  return out;
}
/* Kortet (forslag B, 24. nov): stort bilde med nettstedet som pille, skrå tittel, to linjer tekst. Nettstedet vises med det ekte domenet fra
   selve adressen (`hostOf`), ikke med navnet siden oppgir selv, fordi lenketeksten er skjult og et kort ellers kunne utgi seg for en annen avsender. */
const LK_ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
function lkSite(host,cls){const s=el("span",{class:cls},host);const a=el("i",{});a.innerHTML=LK_ARROW;s.append(a);return s}
function lkCard(l){
  const host=PrekLinks.hostOf(l.u),a=el("a",{class:"lkc"+(l.i?"":" noimg"),href:l.u,target:"_blank",rel:"noopener noreferrer nofollow"});
  if(l.i)a.append(el("span",{class:"lkw"},el("img",{class:"lki",src:l.i,alt:""}),lkSite(host,"lks")));
  a.append(el("span",{class:"lkb"},l.i?null:lkSite(host,"lkh"),el("span",{class:"lkt"},l.ti||host),l.d?el("span",{class:"lkd"},l.d):null));
  return a;
}
const fetchPreview=u=>PrekLinks.fetchPreview(api.linkPreview,u);
