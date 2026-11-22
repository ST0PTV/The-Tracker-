"""Sichtbare Ausdehnung von Monster-SVGs messen (ohne Animation, ohne Bodenschatten), in viewBox-Einheiten.
Pixelbasiert, weil unsichtbare Effekt-Elemente (Dampf, Funken mit opacity 0) die getBBox verfälschen."""
import re
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright

PX = 256


def bboxes(svgs, css=''):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': PX, 'height': PX})
        out = []
        for s in svgs:
            s = re.sub(r'width="\d+" height="\d+"', f'width="{PX}" height="{PX}"', s, 1)
            s = re.sub(r'<ellipse[^>]*fill="rgba\((?:0,0,0|255,255,255),0\.(?:28|07)\)"/>', '', s)
            pg.set_content(f'<style>{css}*{{animation:none!important}}body{{margin:0;background:transparent}}svg{{display:block}}</style>{s}')
            im = Image.open(BytesIO(pg.screenshot(omit_background=True))).getchannel('A').point(lambda a: 255 if a > 40 else 0)
            x0, y0, x1, y1 = im.getbbox()
            k = 64 / PX
            out.append((x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k))
        b.close()
    return out
