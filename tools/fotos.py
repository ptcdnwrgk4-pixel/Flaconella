#!/usr/bin/env python3
"""Flaconella · Produktfotos für die dunkle Seite freistellen.

Die Originalfotos (heller Hintergrund, oft auf einem Passepartout) liegen in fotos-original/ und bleiben
unverändert. Dieses Skript schreibt daraus die Fassungen für die Seite nach images/:

  · Ein Freisteller-Modell (rembg, Modell „isnet-general-use“) trennt das Produkt vom Hintergrund.
  · Das Produkt selbst bleibt Pixel für Pixel das Originalfoto: Es wird nicht vergrößert, nicht weichgezeichnet
    und nicht nachgefärbt. Nur der Hintergrund wird durchsichtig, die Seite scheint dahinter durch.
  · Am Rand wird der helle Saum des alten Hintergrunds herausgerechnet.
  · Jedes Produkt sitzt mittig im Hochformat 4:5. Kleine Originale werden dafür nicht stärker beschnitten,
    als ihre Auflösung hergibt (sonst würden sie auf der Seite unscharf).
  · Aus den freigestellten Einzelfotos entstehen die Sammelbilder der Kategorien (images/kategorie-*.webp,
    dazu je ein JPG auf dunklem Grund als Vorschaubild beim Teilen eines Links).

Neues Foto:  Original nach fotos-original/ legen (Aufsatz-Fotos nach fotos-original/aufsatz/), dann
             python3 tools/fotos.py            alle Fotos neu erzeugen (unter einer Minute)
             python3 tools/fotos.py name.webp  nur einzelne Fotos (ihre Sammelbilder werden mit erzeugt)
             node build.mjs                    Seiten neu erzeugen
Braucht:     Python 3 mit  pip install rembg onnxruntime pillow numpy
             Beim ersten Lauf lädt rembg das Modell (rund 180 MB) einmalig herunter.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'fotos-original')
OUT = os.path.join(ROOT, 'images')

MODELL = 'isnet-general-use'
FRAME = (1120, 1400)            # größte Ausgabe, Hochformat 4:5
FIT_H, FIT_W = 0.74, 0.70       # so viel vom Bild füllt das Produkt höchstens
MIN_W = 640                     # schmaler wird der Ausschnitt nicht, solange das Original so viel hergibt
MAX_ZOOM = 1.15                 # in den Sammelbildern wird ein Produkt höchstens so stark vergrößert

# Besonderheiten einzelner Fotos.
#   art  'produkt' (Standard: Ausschnitt 4:5 ums Produkt) oder 'szene' (Bildausschnitt des Originals bleibt)
EINSTELLUNG = {
    'story-kerzen.webp':      {'art': 'szene'},
    'story-kollektion.webp':  {'art': 'szene'},
    'story-lampen.webp':      {'art': 'szene'},
}

# Sammelbilder der Kategorien: Dateiname → Liste (Foto, Größe im Verhältnis zur Bildhöhe)
SAMMELBILDER = {
    'kategorie-flasche.webp':   [('lampe-bulgarini-classic.webp', .86), ('lampe-hexagonal.webp', .66), ('lampe-pusteblume.webp', .82), ('lampe-weinflasche.webp', .84), ('dekoflasche-aperol.webp', .76)],
    'kategorie-windlicht.webp': [('braune_flasche_windlicht_blumen_01.webp', .80), ('braunes_glas_windlicht_gravur_01.webp', .36), ('schwarze_flasche_windlicht_blumen_01.webp', .80)],
    'kategorie-kerze.webp':     [('kerze-zitrus-gruen.webp', .42), ('kerze-rosa-blume.webp', .34), ('kerze-pink-quadrat.webp', .50), ('kerze-zitrone-rund.webp', .36), ('kerze-gelb-blume.webp', .34)],
    'kategorie-set.webp':       [('kerzenhalter_set_3er_02.webp', .84), ('weinflasche-duo.webp', .80)],
}

_session = None
def maske(im):
    """Deckkraft je Pixel (0 = Hintergrund, 1 = Produkt) vom Freisteller-Modell."""
    global _session
    try:
        from rembg import new_session, remove
    except ImportError:
        sys.exit('Es fehlt der Freisteller. Bitte einmal ausführen:  pip install rembg onnxruntime pillow numpy')
    if _session is None: _session = new_session(MODELL)
    m = np.asarray(remove(im, session=_session, only_mask=True).convert('L')).astype(np.float32) / 255
    return np.clip((m - 0.04) / 0.92, 0, 1)                    # Rauschen nahe 0 und 1 abschneiden

def weich(arr, radius):
    """Gaußscher Weichzeichner für ein Feld mit Werten zwischen 0 und 1 (ein oder drei Kanäle)."""
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255

def ohne_saum(a, alpha):
    """Rechnet am Rand des Produkts den alten hellen Hintergrund heraus. Ein Randpixel ist eine Mischung aus Produkt
    und Hintergrund; ohne diesen Schritt bliebe vor Dunkel ein heller Saum stehen. Das Innere bleibt unberührt."""
    frei = (alpha < 0.02).astype(np.float32)                   # sicher Hintergrund
    bg = np.zeros_like(a); have = np.zeros(alpha.shape, bool)
    for r in (max(4, a.shape[1] // 90), max(12, a.shape[1] // 18)):
        den = weich(frei, r); num = weich(a * frei[..., None], r)
        ok = (den > 0.08) & ~have
        bg[ok] = num[ok] / den[ok][:, None]; have |= ok
    bg[~have] = np.median(a[frei > 0.5], axis=0) if (frei > 0.5).any() else 1.0
    rand = (alpha > 0.02) & (alpha < 0.98)
    out = a.copy()
    al = np.maximum(alpha[rand], 0.08)[:, None]
    out[rand] = np.clip((a[rand] - (1 - al) * bg[rand]) / al, 0, 1)
    return out

def to_img(rgba):
    return Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')

def process(name):
    """Gibt das freigestellte Foto (RGBA) und den Platz des Produkts darin zurück (Anteile: links, oben, rechts, unten)."""
    opt = EINSTELLUNG.get(name, {})
    im = Image.open(os.path.join(SRC, name)).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    h, w, _ = a.shape
    alpha = maske(im)
    rgba = np.dstack([ohne_saum(a, alpha), alpha])
    rgba[alpha <= 0] = 0
    # Wo steht das Produkt? Einzelne verirrte Pixel zählen nicht.
    solid = alpha > 0.5
    xs = np.flatnonzero(solid.sum(axis=0) > max(1, h * 0.002)); ys = np.flatnonzero(solid.sum(axis=1) > max(1, w * 0.002))
    if not len(xs) or not len(ys): xs, ys = np.array([0, w - 1]), np.array([0, h - 1])
    bx0, by0, bx1, by1 = int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1
    if opt.get('art') == 'szene':
        return to_img(rgba), [bx0 / w, by0 / h, bx1 / w, by1 / h]
    bw, bh = bx1 - bx0, by1 - by0
    fw = max(bh / FIT_H, bw / FIT_W * 1.25) * 0.8              # knapper Ausschnitt 4:5 ums Produkt
    sichtbar = min(w, h * 0.8)                                 # so breit war das Original im Hochformat zu sehen
    fw = max(fw, min(sichtbar, MIN_W), sichtbar * 0.5)         # nicht enger, als die Auflösung hergibt
    fw = int(round(fw)); fh = int(round(fw * 1.25))
    fx0 = int(round((bx0 + bx1) / 2 - fw / 2)); fy0 = int(round((by0 + by1) / 2 - fh * 0.51))
    canvas = np.zeros((fh, fw, 4), np.float32)
    sx0, sy0, sx1, sy1 = max(0, fx0), max(0, fy0), min(w, fx0 + fw), min(h, fy0 + fh)
    canvas[sy0 - fy0:sy1 - fy0, sx0 - fx0:sx1 - fx0] = rgba[sy0:sy1, sx0:sx1]
    out = to_img(canvas)
    if fw > FRAME[0]: out = out.resize(FRAME, Image.LANCZOS)   # nur verkleinern, nie vergrößern
    return out, [(bx0 - fx0) / fw, (by0 - fy0) / fh, (bx1 - fx0) / fw, (by1 - fy0) / fh]

def save(im, name):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=93, alpha_quality=100, method=6)

def collage(items, results, size=(1200, 720)):
    """Freigestellte Einzelfotos nebeneinander auf durchsichtigem Grund, gemeinsame Standlinie."""
    W, H = size
    teile = []
    for name, rel in items:
        im, pb = results[name]
        box = [int(pb[0] * im.width), int(pb[1] * im.height), int(np.ceil(pb[2] * im.width)), int(np.ceil(pb[3] * im.height))]
        prod = im.crop(box)
        teile.append((prod, min(rel * H / prod.height, MAX_ZOOM)))     # kleine Originale nicht aufblasen
    breite = sum(p.width * k for p, k in teile); hoehe = max(p.height * k for p, k in teile)
    fit = min(1.0, W * 0.80 / breite, H * 0.84 / hoehe)
    teile = [p.resize((max(1, round(p.width * k * fit)), max(1, round(p.height * k * fit))), Image.LANCZOS) for p, k in teile]
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rand = W * 0.07
    luecke = (W - 2 * rand - sum(t.width for t in teile)) / max(1, len(teile) - 1)
    if len(teile) == 1: rand = (W - teile[0].width) / 2
    x = rand; boden = H * 0.5 + max(t.height for t in teile) * 0.5
    for t in teile:
        canvas.alpha_composite(t, (int(round(x)), int(round(boden - t.height))))
        x += t.width + luecke
    return canvas

def all_sources():
    names = []
    for base, _, files in os.walk(SRC):
        for f in sorted(files):
            if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')) and 'alt-' not in base:
                names.append(os.path.relpath(os.path.join(base, f), SRC))
    return sorted(names)

if __name__ == '__main__':
    only = sys.argv[1:]
    names = only or all_sources()
    results = {}
    for n in names:
        im, pb = process(n)
        out_name = os.path.splitext(n)[0] + '.webp'
        save(im, out_name); results[n] = (im, pb)
        print('✓', n.ljust(46), '→', '%d×%d' % im.size)
    for out_name, items in SAMMELBILDER.items():
        need = [n for n, _ in items]
        if only and not any(n in only for n in need): continue
        for n in need:
            if n not in results: results[n] = process(n)
        bild = collage(items, results)
        save(bild, out_name)
        # dieselbe Zusammenstellung auf der Seitenfarbe als JPG: Vorschaubild beim Teilen des Links (dort gibt es keine Transparenz)
        dunkel = Image.new('RGB', bild.size, (13, 13, 13)); dunkel.paste(bild, (0, 0), bild)
        dunkel.save(os.path.join(OUT, os.path.splitext(out_name)[0] + '.jpg'), 'JPEG', quality=90, optimize=True, progressive=True)
        print('✓ Sammelbild', out_name)
