import os
import json
import re
import subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
def src(name):
    """Reads a source file next to this script. Leading lines that start with //# or /*# are notes for developers
    (the why behind the code) and are not built into the page. The final newline is dropped."""
    t=open(HERE+'/'+name,encoding='utf8').read().split('\n')
    while t and (t[0].startswith('//#') or t[0].startswith('/*#')): t.pop(0)
    t='\n'.join(t)
    assert t.endswith('\n'),name
    return t[:-1]
# Pieces that used to be cut out of the old prototype (app/base/, removed) and patched here. They are normal source files now.
# The order matters: emoji, status icon, sound, avatar helpers, GIF.
proto='\n'.join([src('emoji.js'),src('icon.js'),src('sound.js'),src('avatar.js'),src('gif.js'),src('shrink.js'),src('links.js'),src('reactions.js')])
# Start of the page script: Supabase URL and key, and the client. The "could not load" message is {{boot.noSupabase}}, filled from the language file below.
head=src('boot.js')
# The cryptography is TypeScript (src/crypto.ts), bundled by esbuild; crypto-glue.js connects it to the app.
import subprocess
bundle=subprocess.run(['node',HERE+'/bundle.js'],check=True,capture_output=True,text=True).stdout
crypto='/* ---------- src/ (bundled TypeScript) ---------- */\n'+bundle+'\n'+open(HERE+'/crypto-glue.js',encoding='utf8').read()
# Sign-in and key screens. Originally taken from the old base file and patched here; now a normal source file.
views=open(HERE+'/views.js',encoding='utf8').read()
main=open(HERE+'/main.js',encoding='utf8').read().replace('/*@@PROTO@@*/',proto+'\n'+open(HERE+'/anim.js',encoding='utf8').read()).replace('//@@VIEWS@@',views)
css=src('style.css')
extra=open(HERE+'/extra.css',encoding='utf8').read()
body=open(HERE+'/body.html',encoding='utf8').read()
# Static page text comes from the language file: {{key}} in body.html is replaced here (HTML-escaped).
_msgs=json.loads(subprocess.run(['node',HERE+'/bundle.js','--messages'],check=True,capture_output=True,text=True).stdout)
def _esc(t): return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
def _fill(m):
    assert m.group(1) in _msgs,"missing text key: "+m.group(1)
    return _esc(_msgs[m.group(1)])
body=re.sub(r'\{\{([\w.]+)\}\}',_fill,body)
html=f'''<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{{{{html.title}}}}</title>
<script>(function(){{var t="auto";try{{t=localStorage.getItem("pling_theme")||"auto"}}catch(e){{}}
var mq=matchMedia("(prefers-color-scheme: light)");
function ap(){{document.documentElement.classList.toggle("lys",t==="lys"||(t==="auto"&&mq.matches))}}
window.plingTheme=function(v){{t=v;try{{localStorage.setItem("pling_theme",v)}}catch(e){{}}ap()}};
window.plingThemeGet=function(){{return t}};
ap();if(mq.addEventListener)mq.addEventListener("change",ap)}})()</script>
<style>
{css}
{extra}
</style>
</head>
<body>
{body}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="lib/qrcode.js"></script>
<script>
"use strict";
{head}

{crypto}
{main}
</script>
</body>
</html>
'''
assert '{{boot.noSupabase}}' in html
html=html.replace('{{boot.noSupabase}}',json.dumps(_msgs['boot.noSupabase'],ensure_ascii=False)[1:-1])
assert '{{html.title}}' in html
html=html.replace('{{html.title}}',_esc(_msgs['html.title']),1)
open(HERE+'/../index.html','w',encoding='utf8').write(html)
print(len(html))
