//# HVORFOR (26. okt, Dan Joakim): flere klassiske MSN-koder. Kodene er bare tekst; emojiene er standard Unicode (ingen MSN-grafikk, se claude/emoji.md).
//# Kildeliste: github.com/Crissov/unicode-proposals/issues/256. Eksisterende koder beholdes uendret. Små/store bokstaver er likt. Koder som ofte står i vanlig tekst
//# eller som listemarkører, som (c) (i) (o) (p) (s) (x), er med vilje utelatt ((a) fantes fra før og beholdes). Koder som slutter på bokstav (:D, :s) gjelder bare når
//# bokstav/tall ikke følger rett etter («Note:Done» blir ikke endret). Omgjøringen skjer bare utenfor lenker (linkify).
//# (Lines starting with //# are notes for developers; build.py leaves them out of the page.)
const EMO={":)":"😊",":-)":"😊",":D":"😃",";)":"😉",":(":"🙁",":P":"😛",":p":"😛","(L)":"❤️","(Y)":"👍","(N)":"👎",":O":"😮","8-)":"😎","(6)":"😈","(A)":"😇",":'(":"😢","(K)":"💋","(U)":"💔"};
const EMO2={":-D":"😃",":-P":"😛",":-(":"🙁",";-)":"😉",":-O":"😮",":-@":"😠",":@":"😠",":-#":"🤐",":-|":"😐",":|":"😐",":-$":"😳",":$":"😳",":-S":"😕",":S":"😕",":-*":"😘",":*":"😘",":-]":"😍",":]":"😍",":-[":"😈","*-)":"🤔","+o(":"🤢","|-)":"😴","8-|":"🤓","8o|":"😬",":8)":"👽",":}":"👸","<3":"❤️","(@)":"🐱","(&)":"🐶","(*)":"⭐","(#)":"☀️","(^)":"🎂","(||)":"🍜","(~)":"🎬","('.')":"🐰",
"(b)":"🍺","(d)":"🍸","(f)":"🌹","(g)":"🎁","(t)":"📞","(R)":"🌈","(w)":"🥀",
"(brb)":"⏳","(h)":"😎",":L":"🤣","(lol)":"😂","(rotfl)":"🤣","(boo)":"👻","(ap)":"✈️","(au)":"🚗","(bah)":"🐑","(bus)":"🚌","(co)":"💻","(ip)":"🏝️","(li)":"⚡","(mo)":"💰","(mp)":"📱","(nah)":"🐐","(nnh)":"🐐","(pi)":"🍕","(pl)":"🍽️","(pu)":"☝️","(sn)":"🐌","(so)":"⚽","(st)":"⛈️","(tu)":"🐢","(um)":"☂️","(wo)":"💼","(xo)":"😘","(yn)":"🤞","(h5)":"🙌","(xx)":"🎮"};
for(const k in EMO2)if(!(k in EMO))EMO[k]=EMO2[k];
const EMO_LC=new Map(Object.keys(EMO).map(k=>[k.toLowerCase(),EMO[k]]));
const EMO_RE=new RegExp(Object.keys(EMO).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[^a-z0-9]/gi,c=>String.fromCharCode(92)+c)+(/[a-z0-9]$/i.test(k)?"(?![a-z0-9])":"")).join("|"),"gi");
/* Vanlige internett-smileys som ikke var i MSN (26. okt, Dan Joakim: «xD»). Skiller mellom store og små bokstaver, og må stå alene (ikke midt i et ord). Ingen lookbehind (eldre iPhone). */
const EMO_CS=new Map([["xD","😆"],["XD","😆"],["o_O","😳"],["O_o","😳"],["T_T","😭"],["^^","😊"],["-_-","😑"],[">:(","😠"]]);
const EMO_CS_RE=new RegExp("(^|[^A-Za-z0-9])(xD|XD|o_O|O_o|T_T)(?![A-Za-z0-9])|()("+String.fromCharCode(92)+"^"+String.fromCharCode(92)+"^|-_-|>:"+String.fromCharCode(92)+"()","g");
const emoji=t=>t.replace(EMO_CS_RE,(m,a,b,c,d)=>(b?a:"")+EMO_CS.get(b||d)).replace(EMO_RE,m=>EMO_LC.get(m.toLowerCase())||m);
