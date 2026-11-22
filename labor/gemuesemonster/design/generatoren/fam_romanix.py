"""Neue Familie Romanix (Romanesco, Typ Blatt) – Entwurf im Weich-Vektor-Stil, 3 Formen.
Liefert fertige animierte SVG-Inhalte (ohne <svg>-Hülle) mit den Klassen aus anim.css_lib()."""
import math

BODY, FLO, FLO2, LEAF, LEAF2, FEET = '#9CD35A', '#B8E46F', '#86BF45', '#5FB878', '#4E9A3E', '#6FA83A'


def floret(x, y, w, h, col=FLO):
    return (f'<path d="M{x - w / 2:.2f} {y:.2f} Q{x - w * .18:.2f} {y - h * .9:.2f} {x:.2f} {y - h:.2f} '
            f'Q{x + w * .18:.2f} {y - h * .9:.2f} {x + w / 2:.2f} {y:.2f} Q{x:.2f} {y + h * .18:.2f} {x - w / 2:.2f} {y:.2f}z" fill="{col}"/>')


def spiral(cx, top, bottom, half, n, s0, s1):
    """Florets auf einer Kegelfläche: Spirale vom Fuß zur Spitze."""
    out = []
    for k in range(n):
        t = k / (n - 1)
        y = bottom - (bottom - top) * t
        a = k * 2.399  # goldener Winkel
        r = half * (1 - t) * .82
        x = cx + math.sin(a) * r
        if math.cos(a) < -.2:  # Rückseite nicht zeichnen
            continue
        s = s0 + (s1 - s0) * t
        out.append(floret(x, y, s, s * .95, FLO if k % 2 else FLO2))
    return ''.join(out)


def eye(cx, cy, rx=3.6, ry=4.2):
    return (f'<g class="i-blink" style="transform-origin:{cx}px {cy}px"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#1B1E27"/>'
            f'<circle cx="{cx + rx * .36:.2f}" cy="{cy - ry * .38:.2f}" r="{rx * .4:.2f}" fill="#fff"/>'
            f'<circle cx="{cx - rx * .36:.2f}" cy="{cy + ry * .3:.2f}" r="{rx * .2:.2f}" fill="#fff"/></g>')


def face(y, gap, rx=3.6, ry=4.2, mouth='smile'):
    m = (f'<path d="M{32 - 2.2} {y + 6} Q32 {y + 8.4} {32 + 2.2} {y + 6}" stroke="#1B1E27" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
         if mouth == 'smile' else
         f'<path d="M{32 - 3.4} {y + 5.6} Q32 {y + 9.6} {32 + 3.4} {y + 5.6}z" fill="#7A2E2E"/>')
    return (eye(32 - gap, y, rx, ry) + eye(32 + gap, y, rx, ry) +
            f'<ellipse cx="{32 - gap - 3.4}" cy="{y + 5}" rx="2.4" ry="1.4" fill="#E99AD0" opacity=".65"/>'
            f'<ellipse cx="{32 + gap + 3.4}" cy="{y + 5}" rx="2.4" ry="1.4" fill="#E99AD0" opacity=".65"/>' + m)


SHADOW = '<g class="i-shadowhop" style="transform-origin:32px 59px"><ellipse cx="32" cy="59" rx="{rx}" ry="2.6" fill="rgba(0,0,0,0.28)"/></g>'


def knospe():
    body = '<path d="M19 52 Q17 40 24 32 Q32 22 40 32 Q47 40 45 52 Q32 57 19 52z" fill="#9CD35A"/>'
    tips = ''.join(floret(x, y, w, w, c) for x, y, w, c in
                   [(26, 33, 7, FLO2), (38, 33, 7, FLO2), (32, 29, 8, FLO), (29, 26, 5, FLO), (35, 26, 5, FLO2), (32, 22.5, 5.5, FLO)])
    leaves = ('<path d="M20 48 Q12 46 10 40 Q17 40 21 44z" fill="#5FB878"/>'
              '<path d="M44 48 Q52 46 54 40 Q47 40 43 44z" fill="#4E9A3E"/>')
    feet = '<ellipse cx="26.5" cy="56.5" rx="3.6" ry="2" fill="#6FA83A"/><ellipse cx="37.5" cy="56.5" rx="3.6" ry="2" fill="#6FA83A"/>'
    return (SHADOW.format(rx=14) + '<g class="sg s-jump" style="transform-origin:32px 58px"><g class="i-hop" style="transform-origin:32px 58px">' + feet +
            f'<g class="i-swayfast" style="transform-origin:32px 54px">{leaves}</g>' + body +
            f'<g class="i-sway" style="transform-origin:32px 34px">{tips}</g>' + face(42, 5.2) + '</g></g>')


def spirale():
    body = '<path d="M15 53 Q13 38 22 26 Q32 12 42 26 Q51 38 49 53 Q32 59 15 53z" fill="#9CD35A"/>'
    flor = spiral(32, 13, 33, 17, 22, 7.5, 3.6)
    arms = ('<g class="i-swayfast" style="transform-origin:16px 42px"><path d="M17 42 Q8 40 5 32 Q12 33 18 38z" fill="#5FB878"/></g>'
            '<g class="i-swayfast" style="transform-origin:48px 42px;--x:-.6s"><path d="M47 42 Q56 40 59 32 Q52 33 46 38z" fill="#4E9A3E"/></g>')
    feet = '<ellipse cx="25" cy="57" rx="4" ry="2.2" fill="#6FA83A"/><ellipse cx="39" cy="57" rx="4" ry="2.2" fill="#6FA83A"/>'
    return (SHADOW.format(rx=17) + '<g class="sg s-twirl" style="transform-origin:32px 40px"><g class="i-breathe" style="transform-origin:32px 58px">' + feet + arms + body +
            f'<g class="i-sway" style="transform-origin:32px 32px">{flor}</g>' + face(41, 5.8, 3.8, 4.4) + '</g></g>')


def krone():
    cape = '<path d="M14 50 Q4 44 6 30 Q14 36 20 34 Q16 44 22 54z" fill="#4E9A3E"/><path d="M50 50 Q60 44 58 30 Q50 36 44 34 Q48 44 42 54z" fill="#4E9A3E"/>'
    body = '<path d="M16 54 Q12 40 20 28 Q32 14 44 28 Q52 40 48 54 Q32 60 16 54z" fill="#9CD35A"/>'
    crown = ''.join(floret(32 + dx, y + 5, w, w * 1.15, c) for dx, y, w, c in
                    [(-13, 24, 9, FLO2), (13, 24, 9, FLO2), (-7, 18, 10, FLO), (7, 18, 10, FLO), (0, 13, 11, FLO2)])
    crown += ''.join(floret(32 + dx, y + 5, 4, 4, FLO) for dx, y in [(-13, 19.5), (13, 19.5), (-7, 12.5), (7, 12.5), (0, 6.5)])
    flor = spiral(32, 26, 36, 15, 12, 6, 4)
    brows = ('<path d="M24 34.6 L30 36.2" stroke="#1B1E27" stroke-width="1.5" stroke-linecap="round"/>'
             '<path d="M40 34.6 L34 36.2" stroke="#1B1E27" stroke-width="1.5" stroke-linecap="round"/>')
    feet = '<ellipse cx="24" cy="57.5" rx="4.6" ry="2.4" fill="#6FA83A"/><ellipse cx="40" cy="57.5" rx="4.6" ry="2.4" fill="#6FA83A"/>'
    return (SHADOW.format(rx=20) + '<g class="sg s-roar" style="transform-origin:32px 58px"><g class="i-breathe-slow" style="transform-origin:32px 58px">' + feet +
            f'<g class="i-swayslow" style="transform-origin:20px 34px">{cape}</g>' + body + flor +
            f'<g class="i-sway" style="transform-origin:32px 26px">{crown}</g>' + face(41, 6, 3.6, 4.2, 'open') + brows + '</g></g>')


FORMS = [('Knospe', 'baby', knospe), ('Spirale', 'normal', spirale), ('Krone', 'super', krone)]
