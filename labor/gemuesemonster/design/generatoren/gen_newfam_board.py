"""Board der neuen Familien (Weich-Vektor A, normiert) – zum Absegnen. Aufruf: python3 gen_newfam_board.py <out.html>"""
import sys, re, json
import anim, bonus, softvec as sv, measure, fam_kit as fk
import fam_new as fn
OUT = sys.argv[1]
forms = [(fid, typ, area, rare, k, f) for fid, typ, area, rare, fl in fn.FAMILIES for k, f in enumerate(fl)]
raw = [fk.svg(f[2](), fn.TPL[(fid, k)], 120) for fid, typ, area, rare, k, f in forms]
bbs = measure.bboxes([r.replace('rgba(0,0,0,0.28)', 'rgba(255,255,255,0.07)') for r in raw], anim.css_lib())
cells = {}
for (fid, typ, area, rare, k, f), r, bb in zip(forms, raw, bbs):
    s = sv.wrap_norm(sv.restyle(r, 'weich'), sv.norm_tf(f[1], bb))
    cells.setdefault((area, fid, typ, rare), []).append((f[0], s, f[5]))
ref = {'Ernährung': [0, 1, 2], 'Workout': [53, 45, 54], 'Rezeptbuch': [34, 39, 40]}
sec = ''
for area in ['Ernährung', 'Workout', 'Rezeptbuch']:
    rows = ''
    for (a, fid, typ, rare), lst in cells.items():
        if a != area: continue
        rows += f'<div class="fam"><div class="fh"><b>{lst[0][0]}</b><span class="chip">{typ}</span>{"<span class=chip r>selten</span>" if rare else ""}</div><div class="fr">' + \
            ''.join(f'<figure>{s}<figcaption>{n}<small>{sig}</small></figcaption></figure>' for n, s, sig in lst) + '</div></div>'
    sec += f'<h2>{area}</h2><div class="grid">{rows}</div>'
old = ''.join(f'<figure>{sv.wrap_norm(sv.restyle(anim.build(i, 96, seed=i), "weich"), sv.norm_tf(anim.CFG[i]["kind"], json.load(open("sizes.json"))[f"t{i}"]))}<figcaption>{anim.CFG[i]["name"]}</figcaption></figure>' for i in [53, 54, 45, 46, 39, 40, 41])
S = json.load(open('sizes.json'))
def oldf(i, sz=96):
    return sv.wrap_norm(sv.restyle(anim.build(i, sz, seed=i), "weich"), sv.norm_tf(anim.CFG[i]["kind"], S[f"t{i}"]))
babies = ''.join(f'<figure>{oldf(i)}<figcaption>{anim.CFG[i]["name"]}</figcaption></figure>' for i in [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 45, 47, 49, 51, 53, 55])
babies += ''.join(f'<figure>{s.replace("width=\"120\" height=\"120\"", "width=\"96\" height=\"96\"", 1)}<figcaption>{n}</figcaption></figure>' for lst in cells.values() for n, s, sig in lst[:1])
html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neue Monsterfamilien</title>
<style>:root{{--bg:#0E1117;--card:#161A23;--line:#262B37;--tx:#E8EBF2;--mu:#8A92A6;--ac:#7BD389}}
:root[data-theme="light"]{{--bg:#F2F4F8;--card:#fff;--line:#E1E5EC;--tx:#1B1E27;--mu:#646C7E}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#F2F4F8;--card:#fff;--line:#E1E5EC;--tx:#1B1E27;--mu:#646C7E}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 -apple-system,system-ui,sans-serif;padding:20px 16px 60px}}
h1{{font-size:22px;margin:0 0 4px}}h2{{font-size:17px;margin:26px 0 8px}}p{{color:var(--mu);max-width:760px;margin:4px 0 10px}}
.bar{{display:flex;gap:8px;margin:10px 0}}button{{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font:inherit}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px}}
.fam{{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:12px}}.fh{{display:flex;gap:8px;align-items:center;margin-bottom:4px}}
.chip{{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:2px 8px;color:var(--mu)}}.chip.r{{color:#B49BEA;border-color:#B49BEA}}
.fr{{display:flex;justify-content:space-between}}figure{{margin:0;text-align:center;width:33%}}figcaption{{font-size:13px;font-weight:600}}figcaption small{{display:block;font-weight:400;color:var(--mu);font-size:11.5px}}
.old{{display:flex;flex-wrap:wrap;gap:6px}}.old figure{{width:104px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:4px}}
{anim.css_lib()}@media (prefers-reduced-motion: reduce){{*{{animation:none!important}}}}</style></head><body>
{sv.defs("weich")}
<h1>Neue Monsterfamilien · Weich-Vektor</h1>
<p>Alle 9 Familien, je 3 Formen mit eigenem Namen, mit Animation (Ruhe-Bewegung und typische Aktion alle 7–10 s). Einheitlich skaliert (Baby 34, Normal 44, Super 54); hohe, schlanke Babys bis 20 % größer. Fenni ist jetzt Spross.</p>
<div class="bar"><button onclick="document.documentElement.dataset.theme='dark'">Dunkel</button><button onclick="document.documentElement.dataset.theme='light'">Hell</button></div>
{sec}
<h2>Alle Babys nebeneinander</h2><div class="old">{babies}</div>
<h2>Zum Vergleich: bestehende Monster mit ähnlichem Gemüse</h2>
<p>Kohlix (hellgrün, Stirnband, Springer) neben Kohli (violett). Topin (rotbraun, Sonnenblume) neben Ingi. Porlo (blaugrüne breite Blätter, Zauberwirbel) neben Lauchling.</p>
<div class="old">{old}</div></body></html>'''
open(OUT, 'w', encoding='utf-8').write(html); print(len(html))
