//# Finding links in text, validating link cards and fetching previews live in src/links.ts (bundled as PrekLinks). This file gives them
//# their old names and keeps what touches the page: linkify() builds the elements, lkCard() the card, LP_ON() is the setting.
//# The reasons (why the sender fetches the preview, why the receiver validates) are in src/links.ts. (Lines starting with //# are not built into the page.)
const {firstUrl,validLk}=PrekLinks;
const LP_ON=()=>{try{return localStorage.getItem("pling_lp")!=="0"}catch(e){return true}};
function linkify(t){
  const out=[];
  for(const p of PrekLinks.splitLinks(t)){
    if("url" in p){out.push(el("a",{class:"ulink",href:p.url,target:"_blank",rel:"noopener noreferrer nofollow"},p.url));if(p.tail)out.push(p.tail)}
    else out.push(...emojiNodes(p.text));
  }
  return out;
}
function lkCard(l){
  const a=el("a",{class:"lkc",href:l.u,target:"_blank",rel:"noopener noreferrer nofollow"});
  if(l.i)a.append(el("img",{class:"lki",src:l.i,alt:""}));
  a.append(el("span",{class:"lkb"},el("small",{},l.s||""),el("b",{},l.ti||l.u),l.d?el("span",{class:"lkd"},l.d):null));
  return a;
}
const fetchPreview=u=>PrekLinks.fetchPreview(api.linkPreview,u);
