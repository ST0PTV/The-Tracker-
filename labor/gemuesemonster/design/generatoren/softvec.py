"""Weich-Vektor: einheitlicher Stil für alle Gemüsemonster (Entwurf 2026-10-18).
Wird auf die flachen Vorlagen (anim.T) angewendet, bevor anim.build die Animationsgruppen baut:
- jede Farbfläche bekommt einen radialen Verlauf (Licht oben links, Schatten unten rechts) -> weich, plastisch
- Variante 'glanz': zusätzlich ein heller Glanzpunkt im Verlauf
- Variante 'kontur': zusätzlich eine feine, dunklere Kontur in der Flächenfarbe
- Augen: dunkle Augen + Lichtpunkte um 18 % größer, zweiter Lichtpunkt wo nur einer ist
- Bodenschatten dunkel statt hell (trägt auf hellem und dunklem Grund)
Die Verläufe stehen als gemeinsame <defs> einmal pro Seite (defs()), nicht in jeder Grafik."""
import colorsys, re

SKIP = {'#1B1E27', '#2A0E08', '#2A1408', '#FFF', '#FFFFFF', '#E6FFE0', '#F4F6FA', '#E6E9EF'}
NOSTROKE = {'#E99AD0', '#7A2E2E', '#C4404A', '#FF8FA3'}
used = {}  # Variante -> Menge der Farben


def _rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def _hex(r, g, b):
    return '#' + ''.join(f'{max(0, min(255, round(v * 255))):02X}' for v in (r, g, b))


def shade(h, dl, ds=0.0):
    r, g, b = _rgb(h)
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return _hex(*colorsys.hls_to_rgb(hh, max(0, min(1, l + dl)), max(0, min(1, s + ds))))


def gid(variant, col):
    return f'sv{variant[0]}{col.lstrip("#").upper()}'


def grad(variant, col):
    i = gid(variant, col)
    if variant == 'glanz':
        stops = [(0, shade(col, .38, -.1)), (.16, shade(col, .2)), (.55, col), (1, shade(col, -.24, .04))]
    else:
        stops = [(0, shade(col, .2)), (.5, col), (1, shade(col, -.24, .04))]
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{i}" cx=".36" cy=".3" r=".9" fx=".32" fy=".24">{s}</radialGradient>'


def defs(variant):
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + ''.join(grad(variant, c) for c in sorted(used.get(variant, ()))) + '</defs></svg>'


def _eyes(svg, k=1.18):
    """Dunkle Augen-Ellipsen samt Lichtpunkten um ihren Mittelpunkt vergrößern."""
    eyes = []
    for m in re.finditer(r'<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" fill="(#1B1E27|#2A0E08|#2A1408)"/>', svg):
        cx, cy, rx, ry = map(float, m.group(1, 2, 3, 4))
        if rx >= 1.4 and rx <= 7:
            eyes.append((m.start(), m.end(), cx, cy, rx, ry, m.group(5)))
    if not eyes:
        return svg
    out, pos = [], 0
    for st, en, cx, cy, rx, ry, col in eyes:
        out.append(svg[pos:st])
        out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx * k:.2f}" ry="{ry * k:.2f}" fill="{col}"/>')
        # folgende Lichtpunkte (bis zu 2) mitskalieren
        rest = svg[en:]
        hl = list(re.finditer(r'^<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#fff"/>', rest))
        n = 0
        while n < 2:
            mm = re.match(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#fff"/>', rest)
            if not mm:
                break
            hx, hy, hr = map(float, mm.group(1, 2, 3))
            if abs(hx - cx) > rx + 1 or abs(hy - cy) > ry + 1:
                break
            out.append(f'<circle cx="{cx + (hx - cx) * k:.2f}" cy="{cy + (hy - cy) * k:.2f}" r="{hr * k:.2f}" fill="#fff"/>')
            rest = rest[mm.end():]; en += mm.end(); n += 1
            if n == 1 and not re.match(r'<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+" fill="#fff"/>', rest):
                # zweiter, kleiner Lichtpunkt unten links (nur wenn keiner da ist)
                out.append(f'<circle cx="{cx - rx * .42 * k:.2f}" cy="{cy + ry * .38 * k:.2f}" r="{max(.45, hr * .48) * k:.2f}" fill="#fff" opacity=".85"/>')
        pos = en
    out.append(svg[pos:])
    return ''.join(out)


def restyle(svg, variant='weich'):
    """svg: flache Vorlage. variant: 'weich' | 'glanz' | 'kontur'."""
    s = used.setdefault(variant, set())
    svg = svg.replace('fill="rgba(255,255,255,0.07)"', 'fill="rgba(0,0,0,0.28)"')
    svg = _eyes(svg)

    def fill(m):
        tag, col = m.group(1), m.group(2)
        if col.upper() in SKIP or col.upper() == '#FFF':
            return m.group(0)
        s.add(col.upper())
        extra = ''
        el = m.group(0)
        small = tag == 'circle' and float(re.search(r' r="([\d.]+)"', el).group(1) if re.search(r' r="([\d.]+)"', el) else 9) < 2
        if variant == 'kontur' and 'stroke=' not in el and 'opacity=' not in el and not small and col.upper() not in NOSTROKE:
            extra = f' stroke="{shade(col, -.28, .05)}" stroke-width=".9" stroke-linejoin="round"'
        return m.group(0).replace(f'fill="{col}"', f'fill="url(#{gid(variant, col.upper())})"{extra}')
    # nur gefüllte Flächen (path/ellipse/circle/rect/polygon) – Linien (fill="none") bleiben
    svg = re.sub(r'<(path|ellipse|circle|rect|polygon)\b[^>]*?fill="(#[0-9A-Fa-f]{3,6})"[^>]*?/?>', fill, svg)
    return svg


# ---------- einheitliche Größen (Baby/Normal/Super/Legende), Bodenlinie y=58 ----------
KIND_H = {'baby': 34, 'normal': 44, 'super': 54, 'legend': 56}


def norm_tf(kind, bb, maxw=60):
    """bb = sichtbare Ausdehnung (x, y, w, h) ohne Schatten -> transform-Attribut, das auf Zielhöhe skaliert."""
    x, y, w, h = bb
    t = KIND_H[kind]
    if kind == 'baby':  # hohe/schlanke Babys (Kopfschmuck aus Blättern, Sprossen) bis 20 % größer, sonst wirken sie winzig
        t *= max(1, min(1.2, 1 + (h / w - 1.2) * .25))
    k = min(t / h, maxw / w)
    cx, by = x + w / 2, y + h
    return f'translate({32 - cx * k:.2f} {58 - by * k:.2f}) scale({k:.3f})'


def wrap_norm(svg, tf):
    m = re.match(r'(<svg[^>]*>)(.*)(</svg>)\s*$', svg, re.S)
    return f'{m.group(1)}<g transform="{tf}">{m.group(2)}</g>{m.group(3)}'
