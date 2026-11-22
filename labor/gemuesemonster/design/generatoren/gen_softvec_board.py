"""Muster-Board Weich-Vektor (Entwurf, nicht in der App): flach vs. A weich / B weich+Glanz / C weich+Kontur,
plus Vorschlag einheitlicher Größen (Baby/Normal/Super). Ausgabe: eine HTML-Seite."""
import sys, re
import anim, bonus  # bonus registriert t45–t56
import softvec as sv
import fam_romanix as rx
import measure

OUT = sys.argv[1]
VARS = [('flat', 'Heute (flach)'), ('weich', 'A · Weich'), ('glanz', 'B · Weich + Glanz'), ('kontur', 'C · Weich + feine Kontur')]
SAMPLES = [0, 8, 11, 34, 23, 50]
SIZE_FAM = [('Möhri', [0, 1, 2]), ('Tomi', [6, 7, 8]), ('Brokki', [9, 10, 11]), ('Zwibbel', [21, 22, 23]), ('Pilz', [33, 34, 35])]


def svgwrap(inner, size, cls=''):
    return f'<svg class="{cls}" viewBox="0 0 64 64" width="{size}" height="{size}" style="overflow:visible;--d:8s;--o:-3s;--b:5s">{inner}</svg>'


def existing(i, v, size=120):
    s = anim.build(i, size, seed=i)
    if v != 'flat':
        s = sv.restyle(s, v)
    return s


def romanix(fn, v, size=120):
    inner = fn()
    if v == 'flat':
        inner = inner.replace('rgba(0,0,0,0.28)', 'rgba(255,255,255,0.07)')
    else:
        inner = sv.restyle(inner, v)
    return svgwrap(inner, size)


rows = []
for i in SAMPLES:
    cells = ''.join(f'<div class="cell">{existing(i, v)}</div>' for v, _ in VARS)
    rows.append(f'<div class="row"><div class="lab">{anim.CFG[i]["name"]}<small>{anim.CFG[i]["kind"]}</small></div>{cells}</div>')
for name, kind, fn in rx.FORMS:
    cells = ''.join(f'<div class="cell">{romanix(fn, v)}</div>' for v, _ in VARS)
    rows.append(f'<div class="row new"><div class="lab">Romanix · {name}<small>{kind} · neu</small></div>{cells}</div>')

head = '<div class="row hd"><div class="lab"></div>' + ''.join(f'<div class="cell h">{t}</div>' for _, t in VARS) + '</div>'

# Größen-Vorschlag: gleiche Familie vorher / nachher (im Stil A), Skalierung vorab gemessen
KIND_H = {'baby': 34, 'normal': 44, 'super': 54}
def norm(svg, kind, bb):
    x, y, w, h = bb
    k = min(KIND_H[kind] / h, 60 / w)
    cx, by = x + w / 2, y + h
    m = re.match(r'(<svg[^>]*>)(.*)(</svg>)$', svg, re.S)
    return f'{m.group(1)}<g transform="translate({32 - cx * k:.2f} {58 - by * k:.2f}) scale({k:.3f})">{m.group(2)}</g>{m.group(3)}'
items = []
for fam, ids in SIZE_FAM:
    items.append((fam, [(existing(i, "weich", 84), anim.CFG[i]["kind"]) for i in ids]))
items.append(('Romanix', [(romanix(fn, "weich", 84), k) for _, k, fn in rx.FORMS]))
flat = [s for _, l in items for s, _ in l]
# gemessen an der flachen Fassung (gleiche Umrisse, braucht keine Verlaufs-defs)
flat = [existing(i, "flat", 84) for _, ids in SIZE_FAM for i in ids] + [romanix(fn, "flat", 84) for _, _, fn in rx.FORMS]
bbs = iter(measure.bboxes(flat, anim.css_lib()))
size_rows = []
for fam, l in items:
    before = ''.join(f'<div class="cell s">{s}</div>' for s, _ in l)
    after = ''.join(f'<div class="cell s">{norm(s, k, next(bbs))}</div>' for s, k in l)
    size_rows.append(f'<div class="srow"><div class="lab">{fam}</div><div class="grp">{before}</div><div class="arrow">→</div><div class="grp">{after}</div></div>')

defs = ''.join(sv.defs(v) for v in ('weich', 'glanz', 'kontur'))

html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weich-Vektor Muster</title>
<style>
:root{{--bg:#0E1117;--card:#161A23;--line:#262B37;--tx:#E8EBF2;--mu:#8A92A6;--ac:#7BD389}}
:root[data-theme="light"]{{--bg:#F2F4F8;--card:#FFFFFF;--line:#E1E5EC;--tx:#1B1E27;--mu:#646C7E}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#F2F4F8;--card:#FFFFFF;--line:#E1E5EC;--tx:#1B1E27;--mu:#646C7E}}}}
:root[data-theme="dark"]{{--bg:#0E1117;--card:#161A23;--line:#262B37;--tx:#E8EBF2;--mu:#8A92A6}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--tx);font:15px/1.45 -apple-system,system-ui,"Segoe UI",sans-serif;padding:20px 16px 60px}}
h1{{font-size:22px;margin:0 0 4px}}h2{{font-size:17px;margin:34px 0 6px}}p{{color:var(--mu);margin:4px 0 12px;max-width:760px}}
.bar{{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}}
button{{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font:inherit;cursor:pointer}}
button.on{{border-color:var(--ac);color:var(--ac)}}
.scroll{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
.tbl{{min-width:620px}}
.row{{display:grid;grid-template-columns:120px repeat(4,1fr);gap:8px;margin-bottom:8px;align-items:stretch}}
.row.new .lab{{color:var(--ac)}}
.lab{{display:flex;flex-direction:column;justify-content:center;font-weight:600;font-size:14px}}.lab small{{color:var(--mu);font-weight:400}}
.cell{{background:var(--card);border:1px solid var(--line);border-radius:18px;display:flex;align-items:center;justify-content:center;padding:6px;min-height:132px}}
.cell.h{{min-height:0;padding:8px;font-size:13px;font-weight:600;color:var(--mu);background:none;border:none}}
.srow{{display:flex;align-items:center;gap:10px;margin-bottom:8px;min-width:640px}}.srow .lab{{width:80px;flex:none}}
.grp{{display:flex;gap:6px}}.cell.s{{min-height:96px;width:96px;padding:2px}}.arrow{{color:var(--mu);font-size:20px}}
.note{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin:10px 0;max-width:760px}}
.note b{{color:var(--tx)}}.note li{{color:var(--mu);margin:3px 0}}
{anim.css_lib()}
@media (prefers-reduced-motion: reduce){{*{{animation:none!important}}}}
</style></head><body>
{defs}
<h1>Gemüsemonster · Weich-Vektor</h1>
<p>Entwurf für den einheitlichen Stil. Jede Zeile zeigt dasselbe Monster heute (flach) und in drei Varianten. Alle Varianten bleiben animiert, die Bewegungen sind unverändert. Romanix ist die erste neu gezeichnete Familie (Romanesco, Typ Blatt).</p>
<div class="bar"><button id="bd" class="on">Dunkel</button><button id="bl">Hell</button><button id="bm">Bewegung an</button></div>
<div class="scroll"><div class="tbl">{head}{''.join(rows)}</div></div>
<div class="note"><b>Was sich ändert</b><ul>
<li>A · Weich: jede Fläche bekommt einen sanften Verlauf, Licht oben links, Schatten unten rechts.</li>
<li>B · Glanz: wie A, dazu ein heller Glanzpunkt. Wirkt plastischer, fast wie Gummi.</li>
<li>C · Kontur: wie A, dazu eine feine Linie in einem dunkleren Ton der Fläche. Formen trennen sich besser, gerade auf hellem Grund.</li>
<li>In allen Varianten: Augen 18 % größer mit zwei Lichtpunkten, dunkler Bodenschatten statt heller.</li></ul></div>
<h2>Einheitliche Größen</h2>
<p>Links heute, rechts der Vorschlag: Baby 34, Normal 44, Super 54 von 64 Einheiten Höhe, alle auf derselben Bodenlinie. So wirkt jede Familie gleich gestaffelt.</p>
<div class="scroll">{''.join(size_rows)}</div>
<div class="note"><b>Noch offen (aus der dunklen Übersicht)</b><ul>
<li>Porlo (Porree) ähnelt Lauchling, Topin (Topinambur) ähnelt Ingi, Kohlix (Kohlrabi) ähnelt Kohli. Ich würde sie über Farbe und Silhouette klar trennen, z. B. Porlo mit violettem Ton und Zauberwirbel statt Lauchling-Grün.</li></ul></div>
<script>
const R=document.documentElement;
function th(t){{R.dataset.theme=t;bd.classList.toggle('on',t==='dark');bl.classList.toggle('on',t==='light')}}
bd.onclick=()=>th('dark');bl.onclick=()=>th('light');th('dark');
let calm=false;bm.onclick=()=>{{calm=!calm;document.body.classList.toggle('calm',calm);
  document.querySelectorAll('svg').forEach(s=>s.style.animationPlayState=calm?'paused':'');
  document.querySelectorAll('svg *').forEach(e=>e.style.animationPlayState=calm?'paused':'');bm.textContent=calm?'Bewegung aus':'Bewegung an'}};
</script></body></html>'''
open(OUT, 'w', encoding='utf-8').write(html)
print(len(html), 'bytes; gradients', {v: len(sv.used.get(v, ())) for v in sv.used})
