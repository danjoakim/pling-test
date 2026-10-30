//# The page helpers $, el, toast, fail and q live in src/dom.ts (bundled as PrekDom). This line gives them their old names. It is the first
//# thing in the script that main.js is built from, because everything else uses them. (Lines starting with //# are not built into the page.)
const {$,el,toast,fail,q}=PrekDom;
