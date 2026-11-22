"""Bausteine für neu gezeichnete Gemüsemonster (Weich-Vektor-Familien, ab 2026-10-19).
Jede Form ist eine Funktion c -> SVG-Inhalt (ohne <svg>-Hülle); c ist der Kostüm-Platz (%C%) innerhalb der Körper-Animation.
Augen/Lichtpunkte im Format, das softvec._eyes erkennt (dunkle Ellipse, danach zwei weiße Kreise)."""
import math, random


def g(cls, origin, inner, x=0):
    return f'<g class="{cls}" style="transform-origin:{origin};--x:{x}s">{inner}</g>'


def eye(cx, cy, rx=3.6, ry=4.2, col='#1B1E27'):
    return g('i-blink', f'{cx}px {cy}px',
             f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{col}"/>'
             f'<circle cx="{cx + rx * .36:.2f}" cy="{cy - ry * .38:.2f}" r="{rx * .4:.2f}" fill="#fff"/>'
             f'<circle cx="{cx - rx * .36:.2f}" cy="{cy + ry * .3:.2f}" r="{rx * .2:.2f}" fill="#fff"/>')


def closed_eye(cx, cy, w=3.4):
    return f'<path d="M{cx - w} {cy} Q{cx} {cy + 2.6} {cx + w} {cy}" stroke="#1B1E27" stroke-width="1.5" fill="none" stroke-linecap="round"/>'


def mouth(x, y, kind='smile', w=2.2):
    if kind == 'smile':
        return f'<path d="M{x - w} {y} Q{x} {y + w * 1.1} {x + w} {y}" stroke="#1B1E27" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    if kind == 'open':
        return f'<path d="M{x - w * 1.5} {y - .4} Q{x} {y + w * 1.9} {x + w * 1.5} {y - .4}z" fill="#7A2E2E"/><path d="M{x - w * .7} {y + w * .9} Q{x} {y + w * .5} {x + w * .7} {y + w * .9}" stroke="#E9707A" stroke-width="1" fill="none" stroke-linecap="round"/>'
    if kind == 'o':
        return f'<ellipse cx="{x}" cy="{y + .8}" rx="{w * .55}" ry="{w * .7}" fill="#7A2E2E"/>'
    if kind == 'grin':
        return f'<path d="M{x - w * 1.6} {y - .6} Q{x} {y + w * 1.5} {x + w * 1.6} {y - .6} Q{x} {y + .5} {x - w * 1.6} {y - .6}z" fill="#7A2E2E"/><path d="M{x - w * 1.1} {y - .1} h{w * 2.2}" stroke="#fff" stroke-width=".9"/>'
    return ''


def cheeks(x1, x2, y, col='#E99AD0'):
    return (f'<ellipse cx="{x1}" cy="{y}" rx="2.4" ry="1.4" fill="{col}" opacity=".65"/>'
            f'<ellipse cx="{x2}" cy="{y}" rx="2.4" ry="1.4" fill="{col}" opacity=".65"/>')


def face(cx, y, gap, rx=3.6, ry=4.2, m='smile', mw=2.2, brows=None, closed=False):
    e = (closed_eye(cx - gap, y) + closed_eye(cx + gap, y)) if closed else (eye(cx - gap, y, rx, ry) + eye(cx + gap, y, rx, ry))
    b = ''
    if brows == 'brave':
        b = (f'<path d="M{cx - gap - 3} {y - ry - 1.6} L{cx - gap + 2.6} {y - ry - .2}" stroke="#1B1E27" stroke-width="1.5" stroke-linecap="round"/>'
             f'<path d="M{cx + gap + 3} {y - ry - 1.6} L{cx + gap - 2.6} {y - ry - .2}" stroke="#1B1E27" stroke-width="1.5" stroke-linecap="round"/>')
    elif brows == 'soft':
        b = (f'<path d="M{cx - gap - 2.4} {y - ry - 1.2} Q{cx - gap} {y - ry - 2.6} {cx - gap + 2.4} {y - ry - 1.4}" stroke="#1B1E27" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
             f'<path d="M{cx + gap + 2.4} {y - ry - 1.2} Q{cx + gap} {y - ry - 2.6} {cx + gap - 2.4} {y - ry - 1.4}" stroke="#1B1E27" stroke-width="1.1" fill="none" stroke-linecap="round"/>')
    return e + cheeks(cx - gap - 3.2, cx + gap + 3.2, y + ry + .6) + mouth(cx, y + ry + 1.6, m, mw) + b


def shadow(rx, idle='hop'):
    el = f'<ellipse cx="32" cy="59" rx="{rx}" ry="2.6" fill="rgba(0,0,0,0.28)"/>'
    cls = {'hop': 'i-shadowhop', 'float': 'i-shadowfloat'}.get(idle)
    return g(cls, '32px 59px', el) if cls else el


def feet(x1, x2, y=57, rx=3.6, ry=2, col='#6FA83A'):
    return f'<ellipse cx="{x1}" cy="{y}" rx="{rx}" ry="{ry}" fill="{col}"/><ellipse cx="{x2}" cy="{y}" rx="{rx}" ry="{ry}" fill="{col}"/>'


def sparkle(x, y, s=1, col='#FFE97A', d=0):
    return g('i-twinkle', f'{x}px {y}px', f'<path transform="translate({x} {y}) scale({s})" d="M0 -3 L.9 -.9 3 0 .9 .9 0 3 -.9 .9 -3 0 -.9 -.9z" fill="{col}"/>', d)


def body(idle, act, inner):
    """Körper: Ruhe-Animation innen, typische Bewegung (sg) außen."""
    core = g(idle, '32px 58px', inner)
    return g(f'sg {act}', '32px 58px', core) if act else core


def tap(content):
    return f'<g class="tapw">{content}</g>'


def svg(content, seed, size=100):
    r = random.Random(seed)
    d = r.uniform(7.2, 9.8); o = -r.uniform(0, d); b = r.uniform(4.2, 6.4)
    return (f'<svg viewBox="0 0 64 64" width="{size}" height="{size}" aria-hidden="true" '
            f'style="overflow:visible;flex:none;--d:{d:.2f}s;--o:{o:.2f}s;--b:{b:.2f}s">{tap(content)}</svg>')


def leaf(x, y, ang, ln, w, col):
    """Blatt (Tropfenform) mit Stiel am Punkt (x, y), Richtung ang (Grad, 0 = rechts, -90 = oben)."""
    return (f'<path transform="translate({x} {y}) rotate({ang})" d="M0 0 C{ln * .3:.2f} {-w:.2f} {ln * .75:.2f} {-w * .9:.2f} {ln} 0 '
            f'C{ln * .75:.2f} {w * .9:.2f} {ln * .3:.2f} {w:.2f} 0 0z" fill="{col}"/>')


def frond(x, y, ang, ln, col, w=1.2, n=4):
    """Fenchel-Fiederblatt: Mittellinie mit feinen Seitenstrichen (nur Linien)."""
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * ln, y + math.sin(a) * ln
    d = f'M{x:.2f} {y:.2f} L{ex:.2f} {ey:.2f}'
    for k in range(1, n + 1):
        t = k / (n + .6)
        px, py = x + math.cos(a) * ln * t, y + math.sin(a) * ln * t
        sl = ln * .32 * (1 - t * .5)
        for s in (-1, 1):
            b = a + s * .75
            d += f' M{px:.2f} {py:.2f} l{math.cos(b) * sl:.2f} {math.sin(b) * sl:.2f}'
    return f'<path d="{d}" stroke="{col}" stroke-width="{w}" fill="none" stroke-linecap="round"/>'


def star(cx, cy, r1, r2, n=5, rot=-90, col='#FFE97A'):
    pts = []
    for k in range(n * 2):
        a = math.radians(rot + k * 180 / n)
        r = r1 if k % 2 == 0 else r2
        pts.append(f'{cx + math.cos(a) * r:.2f} {cy + math.sin(a) * r:.2f}')
    return f'<path d="M{" L".join(pts)}z" fill="{col}"/>'
