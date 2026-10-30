/**
 * MSN-style text codes (":)", "(L)", ...) and common internet smileys, turned into emoji.
 *
 * Why (26 Oct, Dan Joakim): more of the classic MSN codes. The codes are only text; the emoji are standard Unicode (no MSN graphics,
 * see claude/emoji.md). Source list: github.com/Crissov/unicode-proposals/issues/256. Existing codes are unchanged. Upper and lower
 * case are the same. Codes that often appear in ordinary text or as list markers, such as (c) (i) (o) (p) (s) (x), are left out on
 * purpose ((a) existed before and stays). Codes that end in a letter (:D, :s) only count when no letter or digit follows
 * ("Note:Done" is not changed). The conversion only happens outside links (linkify).
 *
 * tests/emoji-unit.js compares everything here with tests/fixtures/emoji-vectors.json, made by the JavaScript this replaced.
 */

export const EMO: Record<string, string> = {":)":"😊",":-)":"😊",":D":"😃",";)":"😉",":(":"🙁",":P":"😛",":p":"😛","(L)":"❤️","(Y)":"👍","(N)":"👎",":O":"😮","8-)":"😎","(6)":"😈","(A)":"😇",":'(":"😢","(K)":"💋","(U)":"💔"};
const EMO2: Record<string, string> = {":-D":"😃",":-P":"😛",":-(":"🙁",";-)":"😉",":-O":"😮",":-@":"😠",":@":"😠",":-#":"🤐",":-|":"😐",":|":"😐",":-$":"😳",":$":"😳",":-S":"😕",":S":"😕",":-*":"😘",":*":"😘",":-]":"😍",":]":"😍",":-[":"😈","*-)":"🤔","+o(":"🤢","|-)":"😴","8-|":"🤓","8o|":"😬",":8)":"👽",":}":"👸","<3":"❤️","(@)":"🐱","(&)":"🐶","(*)":"⭐","(#)":"☀️","(^)":"🎂","(||)":"🍜","(~)":"🎬","('.')":"🐰",
"(b)":"🍺","(d)":"🍸","(f)":"🌹","(g)":"🎁","(t)":"📞","(R)":"🌈","(w)":"🥀",
"(brb)":"⏳","(h)":"😎",":L":"🤣","(lol)":"😂","(rotfl)":"🤣","(boo)":"👻","(ap)":"✈️","(au)":"🚗","(bah)":"🐑","(bus)":"🚌","(co)":"💻","(ip)":"🏝️","(li)":"⚡","(mo)":"💰","(mp)":"📱","(nah)":"🐐","(nnh)":"🐐","(pi)":"🍕","(pl)":"🍽️","(pu)":"☝️","(sn)":"🐌","(so)":"⚽","(st)":"⛈️","(tu)":"🐢","(um)":"☂️","(wo)":"💼","(xo)":"😘","(yn)":"🤞","(h5)":"🙌","(xx)":"🎮"};
for(const k in EMO2)if(!(k in EMO))EMO[k]=EMO2[k];
export const EMO_LC = new Map(Object.keys(EMO).map(k=>[k.toLowerCase(),EMO[k]]));
export const EMO_RE = new RegExp(Object.keys(EMO).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[^a-z0-9]/gi,c=>String.fromCharCode(92)+c)+(/[a-z0-9]$/i.test(k)?"(?![a-z0-9])":"")).join("|"),"gi");
/* Common internet smileys that MSN did not have (26 Oct, Dan Joakim: "xD"). Case-sensitive, and they must stand alone (not inside a word). No lookbehind (older iPhones). */
export const EMO_CS = new Map<string, string>([["xD","😆"],["XD","😆"],["o_O","😳"],["O_o","😳"],["T_T","😭"],["^^","😊"],["-_-","😑"],[">:(","😠"]]);
export const EMO_CS_RE = new RegExp("(^|[^A-Za-z0-9])(xD|XD|o_O|O_o|T_T)(?![A-Za-z0-9])|()("+String.fromCharCode(92)+"^"+String.fromCharCode(92)+"^|-_-|>:"+String.fromCharCode(92)+"()","g");
export const emoji = (t: string): string =>
  t.replace(EMO_CS_RE, (_m: string, a: string, b: string, _c: string, d: string) => (b ? a : "") + String(EMO_CS.get(b || d)))
    .replace(EMO_RE, (m: string) => EMO_LC.get(m.toLowerCase()) || m);
