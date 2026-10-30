//# Avatar helpers: check a stored picture, shrink a chosen picture to an avatar, color from a name, and the avatar element.
//# (Lines starting with //# are notes for developers; build.py leaves them out of the page.)
function okAv(a){return typeof a==="string"&&a.startsWith("data:image/jpeg;base64,")&&a.length<12000&&/^[A-Za-z0-9+/=]*$/.test(a.slice(23))}
function toAvatar(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const s=Math.min(im.width,im.height),c=document.createElement("canvas");c.width=c.height=64;
  c.getContext("2d").drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,64,64);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.72))};
 im.onerror=()=>{URL.revokeObjectURL(u);no()};im.src=u})}
function hue(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h}
function avEl(name,av,cls){const d=document.createElement("span");d.className="pav "+cls;
 if(okAv(av)){const i=document.createElement("img");i.alt="";i.src=av;d.append(i)}else{d.textContent=(name[0]||"?").toUpperCase();d.style.background="hsl("+hue(name)+" 45% 36%)"}
 return d}
