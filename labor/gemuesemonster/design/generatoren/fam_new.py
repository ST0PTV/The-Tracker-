"""Neun neue Gemüsemonster-Familien (Gemüsemonster 2.0, Namen und Typen nach der dunklen Übersicht), Stil Weich-Vektor.
Vorlagen t58–t84 (3 Formen je Familie). Jede Form: Funktion c -> SVG-Inhalt; c = Kostüm-Platz.
HAT: Hut-Anker [x, y, Maßstab] in Zeichen-Koordinaten (vor der Größen-Normierung)."""
import math
from fam_kit import g, eye, face, shadow, feet, sparkle, body, leaf, frond, star, mouth, cheeks
import fam_romanix as rx


# ---------------- Romanix (Romanesco, Blatt) ----------------
def _rx(fn):
    def f(c=''):
        s = fn()
        i = s.rindex('</g></g>')
        return s[:i] + c + s[i:]
    return f


# ---------------- Fenni (Fenchel, Zwiebel) ----------------
F_BULB, F_LINE, F_STALK, F_FR, F_FR2 = '#EEF3D8', '#C9DB98', '#B5DA7E', '#6FB84A', '#8FCF5E'


def _bulb(cx, cy, rx_, ry_):
    top = cy - ry_
    return (f'<path d="M{cx - rx_ * .35:.2f} {top + 1:.2f} Q{cx - rx_ * 1.15:.2f} {cy - ry_ * .2:.2f} {cx - rx_:.2f} {cy + ry_ * .35:.2f} '
            f'Q{cx - rx_ * .75:.2f} {cy + ry_:.2f} {cx:.2f} {cy + ry_:.2f} Q{cx + rx_ * .75:.2f} {cy + ry_:.2f} {cx + rx_:.2f} {cy + ry_ * .35:.2f} '
            f'Q{cx + rx_ * 1.15:.2f} {cy - ry_ * .2:.2f} {cx + rx_ * .35:.2f} {top + 1:.2f}z" fill="{F_BULB}"/>'
            f'<path d="M{cx - rx_ * .55:.2f} {top + 3:.2f} Q{cx - rx_ * .85:.2f} {cy:.2f} {cx - rx_ * .5:.2f} {cy + ry_ * .8:.2f} '
            f'M{cx + rx_ * .55:.2f} {top + 3:.2f} Q{cx + rx_ * .85:.2f} {cy:.2f} {cx + rx_ * .5:.2f} {cy + ry_ * .8:.2f}" stroke="{F_LINE}" stroke-width="1.1" fill="none" stroke-linecap="round"/>')


def _stalks(cx, y0, tops, w=3):
    d = ' '.join(f'M{cx + dx0} {y0} Q{cx + dx0 + (tx - dx0) * .3:.1f} {(y0 + ty) / 2:.1f} {cx + tx} {ty}' for dx0, tx, ty in tops)
    return f'<path d="{d}" stroke="{F_STALK}" stroke-width="{w}" fill="none" stroke-linecap="round"/>'


def _fronds(cx, tops, ln):
    out = ''
    for k, (dx0, tx, ty) in enumerate(tops):
        base = -90 + (tx - dx0) * 3.2
        for j, da in enumerate((-32, 0, 32)):
            out += frond(cx + tx, ty, base + da, ln * (1 if da == 0 else .78), F_FR if (k + j) % 2 else F_FR2, 1.15, 3)
    return out


def fenni_baby(c=''):
    tops = [(-2.5, -6, 33), (0, 0, 30), (2.5, 6, 33)]
    crown = g('i-swayfast', '32px 40px', _stalks(32, 40, tops, 2.6) + _fronds(32, tops, 7))
    inner = feet(27.5, 36.5, 57, 3.2, 1.8, '#C9DB98') + crown + _bulb(32, 47.5, 11, 9.5) + face(32, 47, 4.6, 3.3, 3.9) + c
    return shadow(13) + body('i-hop', 's-jump', inner)


def fenni_wirbel(c=''):
    tops = [(-3.5, -12, 24), (-1.2, -4, 18), (1.2, 4, 18), (3.5, 12, 24)]
    crown = g('i-sway', '32px 34px', _stalks(32, 34, tops, 3.2) + _fronds(32, tops, 9))
    arms = (g('i-swayfast', '20px 44px', '<path d="M20 44 Q12 42 10 36" stroke="#B5DA7E" stroke-width="2.8" fill="none" stroke-linecap="round"/>') +
            g('i-swayfast', '44px 44px', '<path d="M44 44 Q52 42 54 36" stroke="#B5DA7E" stroke-width="2.8" fill="none" stroke-linecap="round"/>', -.7))
    inner = feet(26, 38, 57, 3.8, 2.1, '#C9DB98') + crown + arms + _bulb(32, 44, 14, 12.5) + face(32, 44, 5.6, 3.7, 4.3, 'open', 2) + c
    return shadow(16) + body('i-breathe', 's-twirl', inner)


def fenni_feder(c=''):
    tops = [(-5, -20, 16), (-2.5, -10, 8), (0, 0, 5), (2.5, 10, 8), (5, 20, 16)]
    crown = g('i-swayslow', '32px 30px', _stalks(32, 30, tops, 3.6) + _fronds(32, tops, 12))
    arms = (g('i-swayfast', '17px 42px', '<path d="M18 42 Q9 40 7 32" stroke="#B5DA7E" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + frond(7, 32, -110, 6, F_FR, 1, 2)) +
            g('i-swayfast', '47px 42px', '<path d="M46 42 Q55 40 57 32" stroke="#B5DA7E" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + frond(57, 32, -70, 6, F_FR, 1, 2), -.6))
    inner = feet(25, 39, 57.5, 4.4, 2.3, '#C9DB98') + crown + arms + _bulb(32, 42, 16.5, 14.5) + face(32, 42, 6.2, 3.8, 4.4, 'smile', 2.6, 'soft') + c
    return shadow(19) + body('i-breathe-slow', 's-proud', inner)


# ---------------- Mizzi (Mizuna, Blatt, selten) ----------------
M_BODY, M_BODY2, M_GREEN, M_PURPLE, M_GLOW = '#B497E6', '#9C78D6', '#6CC07A', '#A77BDB', '#F1E6FF'


def serr(x, y, ang, ln, w, col, n=4):
    """Gezacktes Mizuna-Blatt vom Punkt (x, y) in Richtung ang."""
    a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
    P = lambda u, v: f'{x + u * ca - v * sa:.2f} {y + u * sa + v * ca:.2f}'
    pts = [P(0, 0)]
    for k in range(1, n + 1):
        t = k / (n + .5); ww = w * math.sin(math.pi * min(.95, t + .1))
        pts += [P(ln * (t - .08), ww * .55), P(ln * t, ww)]
    pts.append(P(ln, 0))
    for k in range(n, 0, -1):
        t = k / (n + .5); ww = w * math.sin(math.pi * min(.95, t + .1))
        pts += [P(ln * t, -ww), P(ln * (t - .08), -ww * .55)]
    return f'<path d="M{" L".join(pts)}z" fill="{col}" stroke-linejoin="round"/>'


def tipglow(x, y, r=1.7, d=0):
    return g('i-glow', f'{x}px {y}px', f'<circle cx="{x}" cy="{y}" r="{r}" fill="{M_GLOW}"/>', d)


def _tip(x, y, ang, ln):
    a = math.radians(ang)
    return x + math.cos(a) * ln, y + math.sin(a) * ln


def mizzi_keim(c=''):
    lv = serr(31, 41, -118, 17, 3.2, M_GREEN, 4) + serr(33, 41, -62, 17, 3.2, M_PURPLE, 4)
    inner = feet(28, 36, 56.8, 3, 1.7, M_BODY2) + g('i-swayfast', '32px 40px', lv) + \
        f'<ellipse cx="32" cy="48" rx="9.5" ry="8.6" fill="{M_BODY}"/>' + face(32, 47.6, 4, 3, 3.6) + c
    return shadow(11) + body('i-hop', 's-hide', inner)


def mizzi_kleid(c=''):
    skirt = ''.join(serr(32 + dx, 50, ang, 11, 3.8, col, 3) for dx, ang, col in
                    [(-5, 160, M_GREEN), (-3, 125, M_PURPLE), (3, 55, M_PURPLE), (5, 20, M_GREEN)])
    top = serr(30, 37, -122, 20, 3.6, M_GREEN, 5) + serr(32, 36, -90, 22, 3.6, M_PURPLE, 5) + serr(34, 37, -58, 20, 3.6, M_GREEN, 5)
    inner = feet(27.5, 36.5, 57, 3.2, 1.8, M_BODY2) + g('i-sway', '32px 36px', top) + g('i-swayslow', '32px 50px', skirt) + \
        f'<ellipse cx="32" cy="45" rx="11.5" ry="10.5" fill="{M_BODY}"/>' + face(32, 44.6, 4.8, 3.4, 4) + c
    return shadow(15) + body('i-breathe', 's-twirl', inner)


def mizzi_leucht(c=''):
    spec = [(-150, 20, M_GREEN), (-122, 24, M_PURPLE), (-90, 26, M_GREEN), (-58, 24, M_PURPLE), (-30, 20, M_GREEN)]
    lv = ''.join(serr(32, 34, a, ln, 3.9, col, 6) for a, ln, col in spec)
    glows = ''.join(tipglow(*_tip(32, 34, a, ln), 1.9, -k * .5) for k, (a, ln, _) in enumerate(spec))
    skirt = ''.join(serr(32 + dx, 50, ang, 13, 4.2, col, 3) for dx, ang, col in
                    [(-6, 165, M_PURPLE), (-3, 130, M_GREEN), (3, 50, M_GREEN), (6, 15, M_PURPLE)])
    sp = sparkle(10, 22, 1, '#E7D6FF', 0) + sparkle(54, 18, .9, '#E7D6FF', -1) + sparkle(56, 40, .8, '#FFE97A', -1.8)
    inner = feet(26.5, 37.5, 57.3, 3.8, 2, M_BODY2) + g('i-sway', '32px 34px', lv + glows) + g('i-swayslow', '32px 50px', skirt) + \
        f'<ellipse cx="32" cy="43.5" rx="13.5" ry="12" fill="{M_BODY}"/>' + face(32, 43, 5.4, 3.6, 4.2, 'smile', 2.2, 'soft') + c
    return shadow(18, 'float') + body('i-float', 's-proud', inner) + sp


# ---------------- Kohlix (Kohlrabi, Spross) ----------------
K_BALL, K_STEM, K_LEAF, K_LEAF2, K_BAND, K_FOOT = '#BFE07E', '#8CCB5A', '#5FB878', '#4E9A3E', '#3FB8C4', '#8CC25A'


def _kstem(x0, y0, x1, y1, lr=6, col=K_LEAF):
    a = math.degrees(math.atan2(y1 - y0, x1 - x0))
    return (f'<path d="M{x0} {y0} Q{(x0 + x1) / 2 + (x1 - x0) * .2:.1f} {(y0 + y1) / 2 - 2:.1f} {x1} {y1}" stroke="{K_STEM}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
            + leaf(x1, y1, a, lr * 1.5, lr * .62, col))


def _band(cx, y, rx_, w=3):
    return f'<path d="M{cx - rx_} {y} Q{cx} {y - 2.4} {cx + rx_} {y} L{cx + rx_} {y + w} Q{cx} {y + w - 2.4} {cx - rx_} {y + w}z" fill="{K_BAND}"/><path d="M{cx + rx_ - .5} {y + 1} l4 -2.6 l.6 3.2z" fill="{K_BAND}"/>'


def kohlix_kugel(c=''):
    st = _kstem(30, 36, 23, 25, 5.4) + _kstem(34, 36, 41, 25, 5.4, K_LEAF2)
    inner = feet(27, 37, 57, 3.4, 1.9, K_FOOT) + g('i-swayfast', '32px 36px', st) + \
        f'<circle cx="32" cy="46" r="12" fill="{K_BALL}"/>' + face(32, 46, 4.8, 3.4, 4) + c
    return shadow(13) + body('i-hop', 's-jump', inner)


def kohlix_springer(c=''):
    st = _kstem(28, 30, 18, 16, 6.2) + _kstem(32, 29, 32, 12, 6.2, K_LEAF2) + _kstem(36, 30, 46, 16, 6.2)
    legs = '<path d="M27 52 L25 56.5 M37 52 L39 56.5" stroke="#8CC25A" stroke-width="3" stroke-linecap="round"/>' + feet(24, 40, 57.3, 3.6, 1.9, K_FOOT)
    arms = (g('i-swayfast', '20px 40px', '<path d="M20 41 Q13 38 11 32" stroke="#8CC25A" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="11" cy="31.5" r="2.2" fill="#BFE07E"/>') +
            g('i-swayfast', '44px 40px', '<path d="M44 41 Q51 38 53 32" stroke="#8CC25A" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="53" cy="31.5" r="2.2" fill="#BFE07E"/>', -.6))
    inner = legs + g('i-swayfast', '32px 30px', st) + arms + f'<circle cx="32" cy="41" r="13.5" fill="{K_BALL}"/>' + \
        _band(32, 32.5, 12.6) + face(32, 42, 5.2, 3.6, 4.2, 'open', 2) + c
    return shadow(15) + body('i-hop', 's-bigjump', inner)


def kohlix_akrobat(c=''):
    st = _kstem(27, 26, 14, 8, 7) + _kstem(30, 25, 25, 4, 7, K_LEAF2) + _kstem(34, 25, 39, 4, 7) + _kstem(37, 26, 50, 8, 7, K_LEAF2)
    legs = '<path d="M26 49 Q22 53 21 57 M38 49 Q42 53 43 57" stroke="#8CC25A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' + feet(20, 44, 57.5, 4, 2, K_FOOT)
    arms = (g('i-swayfast', '18px 36px', '<path d="M18 37 Q9 34 6 24" stroke="#8CC25A" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="6" cy="23" r="2.6" fill="#BFE07E"/>') +
            g('i-swayfast', '46px 36px', '<path d="M46 37 Q55 38 58 44" stroke="#8CC25A" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="58.4" cy="45" r="2.6" fill="#BFE07E"/>', -.8))
    inner = legs + g('i-sway', '32px 26px', st) + arms + f'<circle cx="32" cy="37" r="15" fill="{K_BALL}"/>' + \
        _band(32, 27.2, 14) + face(32, 38, 5.6, 3.7, 4.3, 'grin', 2.2, 'brave') + c
    return shadow(18) + body('i-breathe', 's-roll', inner)


# ---------------- Rhabix (Rhabarber, Blatt) ----------------
R_ST, R_ST2, R_LEAF, R_LEAF2, R_VEIN = '#E2506A', '#F07A8C', '#5FB878', '#4E9A3E', '#3E8A4E'


def _rleaf(cx, cy, w, h, col=R_LEAF):
    """Großes, gewelltes Rhabarberblatt (Schirm) um (cx, cy)."""
    x0, x1 = cx - w / 2, cx + w / 2
    d = (f'M{x0} {cy} Q{x0 - 1} {cy - h * .7} {cx - w * .28} {cy - h} Q{cx - w * .1} {cy - h * 1.1} {cx} {cy - h * .9} '
         f'Q{cx + w * .1} {cy - h * 1.1} {cx + w * .28} {cy - h} Q{x1 + 1} {cy - h * .7} {x1} {cy} '
         f'Q{cx + w * .36} {cy + h * .28} {cx + w * .18} {cy + 1} Q{cx} {cy + h * .34} {cx - w * .18} {cy + 1} Q{cx - w * .36} {cy + h * .28} {x0} {cy}z')
    v = (f'M{cx} {cy + 1} L{cx} {cy - h * .8} M{cx} {cy - h * .2} L{cx - w * .32} {cy - h * .62} M{cx} {cy - h * .2} L{cx + w * .32} {cy - h * .62} '
         f'M{cx} {cy - h * .45} L{cx - w * .16} {cy - h * .82} M{cx} {cy - h * .45} L{cx + w * .16} {cy - h * .82}')
    return f'<path d="{d}" fill="{col}"/><path d="{v}" stroke="{R_VEIN}" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".7"/>'


def rhabix_stiel(c=''):
    inner = feet(29, 35, 57, 2.8, 1.7, '#C23A55') + g('i-sway', '32px 32px', _rleaf(32, 31, 26, 13)) + \
        '<path d="M25.5 34 Q24.5 46 26.5 56 L37.5 56 Q39.5 46 38.5 34z" fill="#E2506A"/><path d="M28.6 37 Q28 46 29 54" stroke="#F07A8C" stroke-width="1.4" fill="none" stroke-linecap="round"/>' + \
        face(32, 43, 3.1, 2.2, 2.7, 'smile', 1.6) + c
    return shadow(10) + body('i-swayslow', 's-nod', inner)


def rhabix_bieger(c=''):
    stalk = '<path d="M25 56 Q20.5 40 29 26 L39 27 Q32 41 36.5 56z" fill="#E2506A"/><path d="M29 52 Q26.5 41 32 29" stroke="#F07A8C" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    lv = _rleaf(33, 25, 30, 14) + g('i-swayfast', '23px 40px', '<path d="M24 41 Q16 38 13 31" stroke="#E2506A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + _rleaf(12, 31, 9, 5, R_LEAF2))
    arm2 = g('i-swayfast', '36px 42px', '<path d="M35 43 Q43 44 47 39" stroke="#E2506A" stroke-width="2.6" fill="none" stroke-linecap="round"/>', -.7)
    inner = feet(27.5, 37, 57.2, 3.2, 1.8, '#C23A55') + g('i-sway', '32px 27px', lv) + arm2 + stalk + face(31.6, 38, 2.9, 2.2, 2.7, 'open', 1.4) + c
    return shadow(13) + body('i-sway2', 's-bow', inner)


def rhabix_taenzer(c=''):
    legs = ('<path d="M30 40 Q27 48 21 56" stroke="#E2506A" stroke-width="4.4" fill="none" stroke-linecap="round"/>'
            '<path d="M34 40 Q39 47 45 50" stroke="#C23A55" stroke-width="4.4" fill="none" stroke-linecap="round"/>') + \
        '<ellipse cx="20.5" cy="57" rx="3.6" ry="1.9" fill="#C23A55"/><ellipse cx="46" cy="50.4" rx="3.2" ry="1.8" fill="#C23A55"/>'
    torso = '<path d="M25 20 Q23 32 28 42 L37 42 Q41 32 39 20z" fill="#E2506A"/><path d="M28.5 23 Q27.4 32 30 39" stroke="#F07A8C" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    arms = (g('i-swayfast', '25px 28px', '<path d="M25 29 Q15 24 10 14" stroke="#E2506A" stroke-width="3" fill="none" stroke-linecap="round"/>' + _rleaf(9, 14, 10, 6, R_LEAF2)) +
            g('i-swayfast', '39px 28px', '<path d="M39 29 Q49 30 55 24" stroke="#E2506A" stroke-width="3" fill="none" stroke-linecap="round"/>' + _rleaf(56, 24, 10, 6, R_LEAF2), -.6))
    inner = legs + g('i-sway', '32px 20px', _rleaf(32, 20, 34, 15)) + arms + torso + face(32, 31, 3.4, 2.5, 3, 'smile', 1.7, 'soft') + c
    return shadow(15) + body('i-sway', 's-twirl', inner)


# ---------------- Topin (Topinambur, Wurzel, selten) ----------------
T_TUB, T_KNOB, T_SPR, T_FL, T_FC = '#C98A55', '#DDA66E', '#6FB84A', '#F5C53A', '#8A5A2A'


def _tuber(cx, cy, r, knobs):
    s = f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r * .92:.2f}" fill="{T_TUB}"/>'
    for a, kr in knobs:
        aa = math.radians(a)
        s += f'<circle cx="{cx + math.cos(aa) * r * .9:.2f}" cy="{cy + math.sin(aa) * r * .86:.2f}" r="{kr}" fill="{T_KNOB}"/>'
    s += ''.join(f'<path d="M{cx + dx - 1.2} {cy + dy} h2.4" stroke="#A86E3E" stroke-width=".9" stroke-linecap="round"/>' for dx, dy in [(-r * .5, -r * .45), (r * .45, r * .55), (-r * .2, r * .7)])
    return s


def _sunflower(x, y, r, open_=True):
    if not open_:
        return f'<ellipse cx="{x}" cy="{y}" rx="{r * .7}" ry="{r}" fill="{T_FL}"/>'
    pet = ''.join(f'<ellipse cx="{x + math.cos(math.radians(a)) * r * .9:.2f}" cy="{y + math.sin(math.radians(a)) * r * .9:.2f}" rx="{r * .55:.2f}" ry="{r * .3:.2f}" transform="rotate({a} {x + math.cos(math.radians(a)) * r * .9:.2f} {y + math.sin(math.radians(a)) * r * .9:.2f})" fill="{T_FL}"/>' for a in range(0, 360, 40))
    return pet + f'<circle cx="{x}" cy="{y}" r="{r * .55:.2f}" fill="{T_FC}"/>'


def _sprout(x0, y0, x1, y1, r, open_=True, lf=4):
    return (f'<path d="M{x0} {y0} Q{x0 + 1} {(y0 + y1) / 2} {x1} {y1}" stroke="{T_SPR}" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
            + leaf(x0 + .4, (y0 + y1) / 2 + 1, -150, lf, lf * .5, T_SPR) + _sunflower(x1, y1, r, open_))


def topin_knolle(c=''):
    inner = feet(27.5, 36.5, 57, 3.2, 1.8, '#A86E3E') + g('i-swayfast', '32px 37px', _sprout(32, 38, 33, 29, 2.4, False, 3.4)) + \
        _tuber(32, 47, 11, [(-150, 3), (-60, 2.6), (-10, 2.8), (150, 2.6), (210, 2.4)]) + face(32, 47, 4.4, 3.2, 3.8) + c
    return shadow(13) + body('i-hop', 's-wobble', inner)


def topin_wirbler(c=''):
    arms = (g('i-swayfast', '19px 42px', '<circle cx="15" cy="40" r="3.4" fill="#C98A55"/><circle cx="11" cy="37" r="2.6" fill="#DDA66E"/>') +
            g('i-swayfast', '45px 42px', '<circle cx="49" cy="40" r="3.4" fill="#C98A55"/><circle cx="53" cy="37" r="2.6" fill="#DDA66E"/>', -.6))
    inner = feet(26, 38, 57.2, 3.8, 2, '#A86E3E') + g('i-sway', '32px 30px', _sprout(32, 31, 34, 19, 3.6, True, 4.4)) + arms + \
        _tuber(32, 44, 14, [(-160, 3.6), (-120, 3), (-60, 3.4), (-15, 3.2), (30, 2.8), (145, 3), (200, 3.2)]) + face(32, 44, 5.4, 3.6, 4.2, 'open', 1.9) + c
    return shadow(16) + body('i-breathe', 's-twirl', inner)


def topin_balance(c=''):
    leg = '<path d="M32 51 L32 56" stroke="#A86E3E" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="32" cy="57.2" rx="4.4" ry="2" fill="#A86E3E"/>'
    arms = (g('i-swayfast', '18px 40px', '<path d="M19 40 Q11 37 6 39" stroke="#C98A55" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="5" cy="39" r="2.8" fill="#DDA66E"/>') +
            g('i-swayfast', '46px 40px', '<path d="M45 40 Q53 37 58 39" stroke="#C98A55" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="59" cy="39" r="2.8" fill="#DDA66E"/>', -.8))
    top = _tuber(32, 25, 8.5, [(-150, 2.6), (-30, 2.4), (200, 2.2)])
    inner = leg + g('i-swayslow', '32px 18px', _sprout(32, 18, 33, 6, 5, True, 5)) + arms + top + \
        _tuber(32, 41, 13, [(-170, 3.2), (-20, 3.4), (20, 3), (150, 3), (100, 2.6), (60, 2.8)]) + face(32, 40, 5.2, 3.5, 4.1, 'smile', 2.2, 'soft') + c
    return shadow(14) + body('i-sway', 's-wobble', inner)


# ---------------- Shiimi (Shiitake, Pilz) ----------------
S_CAP, S_CRACK, S_STEM, S_GILL, S_SPOON = '#8A5A3A', '#C99A72', '#F3E6CF', '#E3D0B0', '#D9A96A'


def _cap(cx, top, w, h):
    x0, x1, by = cx - w / 2, cx + w / 2, top + h
    d = f'M{x0} {by} Q{x0 - 1} {top + h * .2} {cx} {top} Q{x1 + 1} {top + h * .2} {x1} {by} Q{cx} {by + h * .32} {x0} {by}z'
    cracks = ''.join(f'<path d="M{cx + dx - w * .06:.2f} {top + h * fy:.2f} l{w * .06:.2f} {-h * .1:.2f} l{w * .06:.2f} {h * .12:.2f}" stroke="{S_CRACK}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
                     for dx, fy in [(-w * .26, .45), (w * .2, .38), (-w * .02, .22), (w * .32, .7), (-w * .36, .74)])
    return f'<path d="M{x0 + 2} {by} Q{cx} {by + h * .5} {x1 - 2} {by}z" fill="{S_GILL}"/><path d="{d}" fill="{S_CAP}"/>' + cracks


def _spoon(x, y, ang, s=1):
    return (f'<g transform="translate({x} {y}) rotate({ang}) scale({s})"><path d="M-.9 0 L-.9 -12 L.9 -12 L.9 0z" fill="{S_SPOON}"/>'
            f'<ellipse cx="0" cy="-14.5" rx="2.8" ry="3.6" fill="{S_SPOON}"/></g>')


def shiimi_pilz(c=''):
    inner = feet(28, 36, 57, 3, 1.7, '#D9C7A6') + '<path d="M26 42 Q25 52 27 56 L37 56 Q39 52 38 42z" fill="#F3E6CF"/>' + \
        g('i-sway', '32px 42px', _cap(32, 28, 26, 13)) + face(32, 47.5, 3.6, 2.8, 3.3, 'smile', 1.7) + c
    return shadow(12) + body('i-hop', 's-hide', inner)


def shiimi_schirm(c=''):
    arms = (g('i-swayfast', '23px 44px', '<path d="M24 45 Q17 46 14 41" stroke="#F3E6CF" stroke-width="2.8" fill="none" stroke-linecap="round"/>') +
            g('i-swayfast', '41px 44px', '<path d="M40 45 Q47 45 49 40" stroke="#F3E6CF" stroke-width="2.8" fill="none" stroke-linecap="round"/>' + _spoon(49.5, 41, 25, .75), -.6))
    inner = feet(27, 37, 57.2, 3.4, 1.9, '#D9C7A6') + arms + '<path d="M24 37 Q22 50 25 56 L39 56 Q42 50 40 37z" fill="#F3E6CF"/>' + \
        g('i-sway', '32px 36px', _cap(32, 18, 38, 17)) + face(32, 45, 4.4, 3.2, 3.8, 'open', 1.8) + c
    return shadow(16) + body('i-breathe', 's-giggle', inner)


def shiimi_meister(c=''):
    arms = (g('i-swayfast', '22px 42px', '<path d="M23 43 Q14 44 10 38" stroke="#F3E6CF" stroke-width="3.2" fill="none" stroke-linecap="round"/>' + _spoon(10, 39, -20, .95)) +
            g('i-swayfast', '42px 42px', '<path d="M41 43 Q49 46 52 50" stroke="#F3E6CF" stroke-width="3.2" fill="none" stroke-linecap="round"/>', -.7))
    sp = sparkle(56, 16, 1, '#FFE97A', 0) + sparkle(7, 22, .8, '#FFE97A', -1.2)
    inner = feet(25.5, 38.5, 57.5, 4, 2.1, '#D9C7A6') + arms + '<path d="M22 33 Q20 50 23.5 56 L40.5 56 Q44 50 42 33z" fill="#F3E6CF"/>' + \
        '<path d="M23 50 Q32 53 41 50 L41.5 53 Q32 56 22.5 53z" fill="#E8503E"/>' + \
        g('i-swayslow', '32px 32px', _cap(32, 10, 50, 21)) + face(32, 41, 5, 3.4, 4, 'smile', 2.2, 'soft') + c
    return shadow(19) + body('i-breathe-slow', 's-proud', inner) + sp


# ---------------- Okki (Okra, Frucht) ----------------
O_POD, O_RIDGE, O_CAP = '#6FBF4A', '#4E9A3E', '#4E8A36'


def _pod(cx, tip, base, w):
    d = f'M{cx} {tip} Q{cx + w * .62} {tip + (base - tip) * .4} {cx + w / 2} {base - 4} Q{cx + w * .4} {base} {cx} {base} Q{cx - w * .4} {base} {cx - w / 2} {base - 4} Q{cx - w * .62} {tip + (base - tip) * .4} {cx} {tip}z'
    r = ' '.join(f'M{cx} {tip + 2} Q{cx + dx * 1.3:.1f} {(tip + base) / 2:.1f} {cx + dx:.1f} {base - 2}' for dx in (-w * .3, 0, w * .3))
    return f'<path d="{d}" fill="{O_POD}"/><path d="{r}" stroke="{O_RIDGE}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".75"/>'


def _ocap(cx, y, w):
    return f'<path d="M{cx - w / 2} {y} Q{cx} {y - 4} {cx + w / 2} {y} Q{cx + w * .3} {y + 2.6} {cx} {y + 1.6} Q{cx - w * .3} {y + 2.6} {cx - w / 2} {y}z" fill="{O_CAP}"/><path d="M{cx} {y - 2.6} l1.4 -3" stroke="{O_CAP}" stroke-width="1.8" stroke-linecap="round"/>'


def okki_spitze(c=''):
    inner = feet(28.5, 35.5, 57, 2.8, 1.7, O_CAP) + _pod(32, 30, 56, 17) + _ocap(32, 31, 8) + face(32, 46, 3.6, 2.8, 3.3, 'smile', 1.7) + c
    return shadow(10) + body('i-hop', 's-jump', inner)


def okki_wirbel(c=''):
    arms = (g('i-swayfast', '23px 40px', '<path d="M24 41 Q16 40 13 34" stroke="#6FBF4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>') +
            g('i-swayfast', '41px 40px', '<path d="M40 41 Q48 40 51 34" stroke="#6FBF4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>', -.6))
    inner = feet(27, 37, 57.2, 3.2, 1.8, O_CAP) + arms + _pod(32, 17, 56, 22) + _ocap(32, 19, 10) + face(32, 40, 4.4, 3.2, 3.8, 'open', 1.8) + c
    return shadow(13) + body('i-breathe', 's-twirl', inner)


def okki_stern(c=''):
    arms = (g('i-swayfast', '21px 36px', '<path d="M22 37 Q12 34 9 25" stroke="#6FBF4A" stroke-width="3" fill="none" stroke-linecap="round"/>' + star(9, 23, 3.4, 1.5, 5, -90, '#C7EE8A')) +
            g('i-swayfast', '43px 36px', '<path d="M42 37 Q52 37 55 44" stroke="#6FBF4A" stroke-width="3" fill="none" stroke-linecap="round"/>', -.7))
    belly = star(32, 47, 5.6, 2.6, 5, -90, '#C7EE8A') + '<circle cx="32" cy="47" r="1.2" fill="#E9F8C8"/>'
    inner = feet(25.5, 38.5, 57.5, 3.8, 2, O_CAP) + arms + _pod(32, 5, 56, 28) + _ocap(32, 8, 12) + belly + face(32, 31, 5, 3.4, 4, 'grin', 1.9, 'brave') + c
    return shadow(16) + body('i-breathe-slow', 's-proud', inner)


# ---------------- Porlo (Porree, Zwiebel, selten) ----------------
P_BASE, P_MID, P_LF, P_LF2, P_SWIRL, P_ROOT = '#F4F1E4', '#D7EFA8', '#4E9AA0', '#3F7F8C', '#8FE8D8', '#D9CDB0'


def _pleaf(x, y, ang, ln, w, col):
    return leaf(x, y, ang, ln, w, col)


def _roots(cx, y, n=4):
    d = ' '.join(f'M{cx + dx} {y} q{dx * .3:.1f} 2.4 {dx * .6:.1f} 3' for dx in [(-3 + 6 * k / (n - 1)) for k in range(n)])
    return f'<path d="{d}" stroke="{P_ROOT}" stroke-width="1" fill="none" stroke-linecap="round"/>'


def porlo_spross(c=''):
    lv = _pleaf(30.5, 40, -112, 12, 3.4, P_LF) + _pleaf(33.5, 40, -68, 12, 3.4, P_LF2)
    inner = _roots(32, 55.5) + g('i-swayfast', '32px 40px', lv) + \
        '<rect x="25.5" y="38" width="13" height="18" rx="6.5" fill="#F4F1E4"/><path d="M25.5 44 Q25.5 38 32 38 Q38.5 38 38.5 44z" fill="#D7EFA8"/>' + \
        face(32, 48, 3.2, 2.7, 3.2, 'smile', 1.6) + c
    return shadow(10) + body('i-hop', 's-nod', inner)


def porlo_schaft(c=''):
    lv = _pleaf(29.5, 30, -118, 17, 4.4, P_LF) + _pleaf(32, 29, -90, 19, 4.4, P_LF2) + _pleaf(34.5, 30, -62, 17, 4.4, P_LF)
    arms = (g('i-swayfast', '25px 42px', '<path d="M25 43 Q19 43 17 38" stroke="#D7EFA8" stroke-width="2.4" fill="none" stroke-linecap="round"/>') +
            g('i-swayfast', '39px 42px', '<path d="M39 43 Q45 43 47 38" stroke="#D7EFA8" stroke-width="2.4" fill="none" stroke-linecap="round"/>', -.6))
    inner = _roots(32, 55.5, 5) + g('i-sway', '32px 30px', lv) + arms + \
        '<rect x="24.5" y="28" width="15" height="28" rx="7.5" fill="#F4F1E4"/><path d="M24.5 37 Q24.5 28 32 28 Q39.5 28 39.5 37z" fill="#D7EFA8"/>' + \
        face(32, 42, 3.6, 3, 3.6, 'open', 1.6) + c
    return shadow(12) + body('i-breathe', 's-bow', inner)


def porlo_zauber(c=''):
    lv = (_pleaf(29, 26, -132, 19, 4.8, P_LF2) + _pleaf(30.5, 24, -108, 23, 5, P_LF) + _pleaf(33.5, 24, -72, 23, 5, P_LF2) + _pleaf(35, 26, -48, 19, 4.8, P_LF))
    swirl = g('i-float', '32px 40px',
              f'<path d="M12 44 Q14 50 32 51 Q50 50 52 43" stroke="{P_SWIRL}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/>'
              f'<path d="M50 34 Q46 29 32 29 Q20 29 15 33" stroke="{P_SWIRL}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/>')
    sp = sparkle(11, 42, .9, '#C9B5FF', 0) + sparkle(53, 31, 1, '#C9B5FF', -1) + sparkle(46, 12, .8, P_SWIRL, -1.7)
    arms = (g('i-swayfast', '24px 40px', '<path d="M24 41 Q16 40 13 33" stroke="#D7EFA8" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="13" cy="32" r="1.8" fill="#8FE8D8"/>') +
            g('i-swayfast', '40px 40px', '<path d="M40 41 Q48 42 51 47" stroke="#D7EFA8" stroke-width="2.8" fill="none" stroke-linecap="round"/>', -.7))
    inner = _roots(32, 55.5, 5) + g('i-sway', '32px 25px', lv) + arms + \
        '<rect x="23" y="22" width="18" height="34" rx="9" fill="#F4F1E4"/><path d="M23 33 Q23 22 32 22 Q41 22 41 33z" fill="#D7EFA8"/>' + \
        face(32, 38, 4.2, 3.2, 3.8, 'smile', 2, 'soft') + c
    return shadow(14) + swirl + body('i-breathe-slow', 's-twirl', inner) + sp


# ---------------- Register ----------------
# id, Typ, Bereich, selten, [(Name, Größe, Funktion, Hut-Anker, Ruhe, Signatur)]
FAMILIES = [
    ('romanix', 'Blatt', 'Ernährung', False, [
        ('Romanix', 'baby', _rx(rx.knospe), (32, 24.5, .5), 'wippt auf den Zehen', 'springt und zeigt die Spirale'),
        ('Spiranix', 'normal', _rx(rx.spirale), (32, 15, .62), 'wiegt die Röschen', 'dreht sich einmal um sich selbst'),
        ('Fraktalon', 'super', _rx(rx.krone), (32, 9, .75), 'atmet ruhig wie ein Gelehrter', 'brüllt seine Krone groß')]),
    ('fenni', 'Spross', 'Ernährung', False, [
        ('Fenni', 'baby', fenni_baby, (32, 38.5, .5), 'wedelt mit den Fiedern', 'hüpft über die eigenen Füße'),
        ('Fenchelo', 'normal', fenni_wirbel, (32, 32, .62), 'träumt mit offenen Augen', 'dreht sich wie ein Kreisel'),
        ('Fennarch', 'super', fenni_feder, (32, 28, .75), 'lässt die Federkrone wehen', 'richtet sich stolz auf')]),
    ('mizzi', 'Blatt', 'Ernährung', True, [
        ('Mizzi', 'baby', mizzi_keim, (32, 40, .4), 'zittert ein bisschen', 'versteckt sich hinter den Blättern'),
        ('Mizzara', 'normal', mizzi_kleid, (32, 30, .5), 'wiegt das Blätterkleid', 'tanzt eine kleine Pirouette'),
        ('Mizzuna', 'super', mizzi_leucht, (32, 18, .62), 'schwebt und leuchtet', 'lässt die Spitzen aufglühen')]),
    ('kohlix', 'Spross', 'Workout', False, [
        ('Kohlix', 'baby', kohlix_kugel, (32, 34, .5), 'federt auf der Stelle', 'macht einen Hopser'),
        ('Kohlhops', 'normal', kohlix_springer, (32, 28, .6), 'tippelt ungeduldig', 'springt besonders hoch'),
        ('Kohlrobat', 'super', kohlix_akrobat, (32, 22, .68), 'dehnt sich gemütlich', 'schlägt einen Salto')]),
    ('rhabix', 'Blatt', 'Workout', False, [
        ('Rhabix', 'baby', rhabix_stiel, (32, 19, .55), 'schwankt im Wind', 'nickt freundlich'),
        ('Rhabiega', 'normal', rhabix_bieger, (33, 12, .65), 'biegt sich langsam', 'verbeugt sich tief'),
        ('Rhabanza', 'super', rhabix_taenzer, (32, 6, .72), 'schwingt in Zeitlupe', 'tanzt eine Drehung')]),
    ('topin', 'Wurzel', 'Workout', True, [
        ('Topin', 'baby', topin_knolle, (32, 37, .45), 'kullert ein wenig', 'wackelt wie Pudding'),
        ('Topinello', 'normal', topin_wirbler, (32, 31, .55), 'ruht in sich', 'wirbelt einmal herum'),
        ('Topinambo', 'super', topin_balance, (32, 18, .45), 'balanciert auf einem Bein', 'wackelt und fängt sich')]),
    ('shiimi', 'Pilz', 'Rezeptbuch', False, [
        ('Shiimi', 'baby', shiimi_pilz, (32, 30, .55), 'lugt unter dem Hut hervor', 'duckt sich unter den Hut'),
        ('Shiitako', 'normal', shiimi_schirm, (32, 19, .75), 'rührt in Gedanken', 'kichert über ein Rezept'),
        ('Shiitakai', 'super', shiimi_meister, (32, 11, .95), 'schmeckt in Ruhe ab', 'hebt stolz den Löffel')]),
    ('okki', 'Frucht', 'Rezeptbuch', False, [
        ('Okki', 'baby', okki_spitze, (32, 30, .35), 'hüpft ungeduldig', 'springt in die Luft'),
        ('Okkro', 'normal', okki_wirbel, (32, 18, .45), 'probiert eine Idee', 'dreht sich vor Freude'),
        ('Okkastra', 'super', okki_stern, (32, 7, .55), 'zeigt den Stern', 'reckt sich stolz')]),
    ('porlo', 'Zwiebel', 'Rezeptbuch', True, [
        ('Porlo', 'baby', porlo_spross, (32, 39, .5), 'blinzelt verschlafen', 'nickt ein'),
        ('Porrlix', 'normal', porlo_schaft, (32, 29, .58), 'vergisst, was er wollte', 'verbeugt sich'),
        ('Porromagus', 'super', porlo_zauber, (32, 23, .68), 'lässt den Wirbel kreisen', 'zaubert eine Drehung')]),
]
FIRST_TPL = 58
TPL = {}  # (Familien-id, Form) -> Vorlagen-Nr.
_n = FIRST_TPL
for fid, *_r, forms in FAMILIES:
    for k in range(3):
        TPL[(fid, k)] = _n; _n += 1
