//# Status icon (the small exclamation mark with a status dot) and the helper that draws it. The colors come from CSS (.gl, .bd, .ab).
//# (Lines starting with //# are notes for developers; build.py leaves them out of the page.)
const FF='<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="gl" cx="12" cy="17.5" r="6.5"/><path class="bd" d="M8.5 2.8Q8.4 1.6 9.6 1.6L14.4 1.6Q15.6 1.6 15.5 2.8L14.5 13.4Q14.4 14.6 13.2 14.6L10.8 14.6Q9.6 14.6 9.5 13.4Z"/><circle class="ab" cx="12" cy="18.2" r="3.1"/></svg>';
function ff(st){const s=document.createElement("span");s.className="ff "+st;s.innerHTML=FF;return s}
