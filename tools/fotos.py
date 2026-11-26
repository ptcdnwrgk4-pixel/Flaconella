#!/usr/bin/env python3
"""Flaconella · Fotos für die dunkle Seite aufbereiten.

Die Originalfotos (heller Hintergrund, oft auf einem Passepartout) liegen in fotos-original/ und bleiben
unverändert. Dieses Skript schreibt daraus die Fassungen für die Seite nach images/:

  · Passepartout und weicher Fotorand werden weggeschnitten.
  · Der helle Hintergrund wird durch einen dunklen, warmen Lichtschein um das Produkt ersetzt, der noch vor dem
    Bildrand in die Seitenfarbe #0d0d0d ausläuft – auf der Seite ist deshalb keine Bildkante zu sehen.
  · Das Produkt bleibt, wie es ist. Klares Glas wird durchsichtig behandelt: Man sieht den dunklen Hintergrund
    durch das Glas, Kanten, Gravur und Lichter bleiben hell. Schatten auf der Tischfläche bleiben Schatten.
  · Jedes Produkt sitzt gleich groß und mittig im Hochformat 4:5.
  · Aus den fertigen Einzelfotos entstehen die Sammelbilder der Kategorien (images/kategorie-*.jpg).

Neues Foto:  Original nach fotos-original/ legen (Aufsatz-Fotos nach fotos-original/aufsatz/), dann
             python3 tools/fotos.py            alle Fotos neu erzeugen (rund eine Minute)
             python3 tools/fotos.py name.webp  nur einzelne Fotos (ihre Sammelbilder werden mit erzeugt)
             node build.mjs                    Seiten neu erzeugen
Am besten:   heller, ruhiger Hintergrund ohne Requisiten, Produkt vollständig im Bild. Sieht ein Ergebnis nicht
             sauber aus, hilft ein Eintrag unter EINSTELLUNG (siehe dort).
Braucht:     Python 3 mit Pillow und numpy (pip install pillow numpy).
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'fotos-original')
OUT = os.path.join(ROOT, 'images')

FLOOR = np.array([13, 13, 13], np.float32) / 255          # Seitenfarbe #0d0d0d
PEAK = np.array([0.30, 0.276, 0.236], np.float32)         # hellste Stelle des neuen Hintergrunds (warmes Grau)
LUMA = np.array([.299, .587, .114], np.float32)
FRAME = (1120, 1400)                                      # größte Ausgabe, Hochformat 4:5
GLASS_SHEEN = 0.19                                        # so viel Helligkeit behält klares Glas in der Fläche
FIT_H, FIT_W = 0.72, 0.68                                 # so viel vom Bild füllt das Produkt höchstens

# Besonderheiten einzelner Fotos. Alles andere erkennt das Skript selbst.
#   art   'produkt' (Standard: Ausschnitt 4:5 ums Produkt) oder 'szene' (Bildausschnitt bleibt)
#   glas  True/False erzwingt durchsichtig/deckend für alle Teile, sonst automatisch je Teil
#   rahmen 'aus' = kein Passepartout suchen
#   bereich (x0, y0, x1, y1) als Anteil des Fotos: nur dort wird Produkt gesucht (Requisiten daneben verschwinden)
#   fest  [(x0, y0, x1, y1), …]: dort ist sicher Produkt, z. B. ein weißes Etikett vor weißem Hintergrund
#   licht [(x0, y0, x1, y1), …]: dort leuchtet etwas frei vor dem Hintergrund, z. B. eine Flamme über dem Glasrand
#   schatten 'lassen' = Schatten am Produkt nicht wegrechnen (falls dabei ein heller Produktteil verloren geht)
EINSTELLUNG = {
    'story-kerzen.webp':      {'art': 'szene', 'glas': False},
    'kerze-bernstein-rund.webp':   {'bereich': (0.12, 0.25, 0.885, 0.80), 'fest': [(0.53, 0.62, 0.79, 0.77)]},
    'kerze-orange-quadrat.webp':   {'bereich': (0.145, 0.19, 0.875, 0.795), 'schatten': 'lassen'},
    'braunes_glas_windlicht_gravur_01.webp': {'bereich': (0.24, 0.20, 0.755, 0.77)},
    'braune_flasche_windlicht_blumen_02.webp': {'bereich': (0.20, 0.05, 0.715, 0.86)},
    'braune_flasche_windlicht_blumen_03.webp': {'bereich': (0.20, 0.03, 0.72, 0.90)},
    'braunes_glas_windlicht_gravur_02.webp': {'licht': [(0.44, 0.22, 0.58, 0.38)]},
    'kerzenhalter_set_3er_02.webp':          {'fest': [(0.205, 0.125, 0.24, 0.395)]},
    'story-kollektion.webp':  {'art': 'szene', 'rahmen': 'aus'},
    'story-lampen.webp':      {'art': 'szene', 'rahmen': 'aus'},
}

# Sammelbilder der Kategorien: Dateiname → Liste (Foto, Größe im Verhältnis zur Bildhöhe)
SAMMELBILDER = {
    'kategorie-flasche.jpg':   [('lampe-bulgarini-classic.webp', .86), ('lampe-hexagonal.webp', .66), ('lampe-pusteblume.webp', .82), ('lampe-weinflasche.webp', .84), ('dekoflasche-aperol.webp', .76)],
    'kategorie-windlicht.jpg': [('braune_flasche_windlicht_blumen_01.webp', .78), ('braunes_glas_windlicht_gravur_01.webp', .34), ('schwarze_flasche_windlicht_blumen_01.webp', .78)],
    'kategorie-kerze.jpg':     [('kerze-zitrus-gruen.webp', .42), ('kerze-rosa-blume.webp', .34), ('kerze-pink-quadrat.webp', .50), ('kerze-zitrone-rund.webp', .36), ('kerze-gelb-blume.webp', .34)],
    'kategorie-set.jpg':       [('kerzenhalter_set_3er_02.webp', .84), ('weinflasche-duo.webp', .80)],
}

def sstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
def to_img(arr): return Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))
def from_img(im): return np.asarray(im).astype(np.float32) / 255
def mask_img(m): return Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))
def up(arr, size, blur=0.0):
    im = mask_img(arr)
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    return from_img(im.resize(size, Image.BICUBIC))
def box1d(v, win):
    """Gleitender Mittelwert entlang der ersten Achse."""
    win = max(3, int(win) | 1); pad = win // 2
    vp = np.pad(v, ((pad, pad),) + ((0, 0),) * (v.ndim - 1), mode='edge')
    c = np.cumsum(np.concatenate([np.zeros((1,) + v.shape[1:], v.dtype), vp]), axis=0)
    return (c[win:] - c[:-win]) / win
def longest_run(flags):
    best = (0, 0); start = None
    for i, f in enumerate(list(flags) + [False]):
        if f and start is None: start = i
        if not f and start is not None:
            if i - start > best[1] - best[0]: best = (start, i)
            start = None
    return best

# ── 1) Das eigentliche Foto auf dem Passepartout finden ─────────────────────────────────────────
def find_photo(a):
    """Schneidet das Foto aus seinem Passepartout. Als Rahmen zählt nur eine gerade Kante, an der es auf fast der
    ganzen Höhe (oder Breite) in dieselbe Richtung heller oder dunkler wird – auch wenn sie weich ist.
    Bildrauschen wechselt die Richtung, die Seite einer Flasche läuft nicht über die ganze Höhe.
    Links und rechts ist ein Passepartout gleich breit: Fehlt eine Seite, wird sie gespiegelt."""
    h, w, _ = a.shape
    sig = np.concatenate([a @ LUMA[:, None], a[..., 2:3]], axis=2)          # Helligkeit und Blau (Creme gegen Grau)
    def cand(arr, lo, hi, n, need):
        st = max(1, n // 500)
        d = arr[lo:hi, 2 * st:] - arr[lo:hi, :-2 * st]
        sc = np.maximum((d > 0.004).mean(axis=0), (d < -0.004).mean(axis=0)).max(axis=1)
        groups = []
        for x in np.flatnonzero(sc >= need):
            if groups and x - groups[-1][1] <= 4: groups[-1][1] = x
            else: groups.append([x, x])
        return [(g[0] + st, g[1] + st) for g in groups]
    vx = cand(sig, int(h * .08), int(h * .92), w, 0.80)
    left = [g for g in vx if g[1] < w * 0.3]; right = [g for g in vx if g[0] > w * 0.7]
    pairs = [(l, r) for l in left for r in right if abs(l[1] - (w - r[0])) <= w * 0.025]
    x0, x1 = 0, w
    if pairs:
        l, r = max(pairs, key=lambda pr: pr[0][1]); x0, x1 = l[1], r[0]
    else:
        single = [g[1] for g in left if g[1] <= w * 0.22] + [w - g[0] for g in right if w - g[0] <= w * 0.22]
        if single: m = max(single); x0, x1 = m, w - m
    y0, y1 = 0, h
    if x0:                                                                  # oben/unten nur, wenn es einen Rahmen gibt
        vy = cand(np.swapaxes(sig[:, x0:x1], 0, 1), int((x1 - x0) * .04), int((x1 - x0) * .96), h, 0.93)
        top = [g[1] for g in vy if g[1] < h * 0.22]; bottom = [g[0] for g in vy if g[0] > h * 0.78]
        if top: y0 = max(top)
        if bottom: y1 = min(bottom)
    ins = max(3, int(min(w, h) * 0.014))
    return (x0 + (ins if x0 else 0), y0 + (ins if y0 else 0), x1 - (ins if x1 < w else 0), y1 - (ins if y1 < h else 0))

# ── 2) Hintergrund schätzen: glatte helle Fläche, robust gegen Produkt, Requisiten und Lichtverlauf ──
def gauss(arr, sigma):
    """Weichzeichner für Fließkomma-Felder (drei Kastenfilter hintereinander ergeben fast eine Glockenkurve)."""
    win = max(3, int(round((12 * sigma * sigma / 3 + 1) ** 0.5)) | 1)
    out = arr.astype(np.float32)
    for _ in range(3):
        out = box1d(out, win)
        out = np.swapaxes(box1d(np.swapaxes(out, 0, 1), win), 0, 1)
    return out

def backdrop(lo):
    """lo: kleines Bild. Gibt den Hintergrund ohne Produkt zurück (weiche Schatten gehören zum Hintergrund)."""
    h, w, _ = lo.shape; L = max(h, w)
    b = max(2, int(L * 0.04))
    border = np.concatenate([lo[:b].reshape(-1, 3), lo[-b:].reshape(-1, 3), lo[:, :b].reshape(-1, 3), lo[:, -b:].reshape(-1, 3)])
    ref = np.median(border, axis=0); ref_l = float(ref @ LUMA); ref_s = float((ref.max() - ref.min()) / (ref.max() + 1e-3))
    lum = lo @ LUMA
    sat = (lo.max(axis=2) - lo.min(axis=2)) / (lo.max(axis=2) + 1e-3)
    gy, gx = np.gradient(lum); tex = gauss(np.abs(gx) + np.abs(gy), 1.2)
    base = (tex < 0.028) & (lum > ref_l - 0.30) & (sat < ref_s + 0.13)
    wgt = base.astype(np.float32)
    B = np.broadcast_to(ref, lo.shape).astype(np.float32)
    for it in range(5):
        est = np.zeros_like(lo); have = np.zeros((h, w), bool)
        for sig in (0.035, 0.09, 0.22, 0.6):
            den = gauss(wgt, L * sig)
            num = gauss(lo * wgt[..., None], L * sig)
            ok = (den > 0.12) & ~have
            est[ok] = num[ok] / den[ok][:, None]; have |= ok
        est[~have] = ref
        B = est
        dark = (B - lo).max(axis=2)
        wgt = (base & (np.abs(lo - B).max(axis=2) < 0.065) & (dark < (0.05 if it < 1 else 0.028))).astype(np.float32)
    return np.maximum(B, 0.06), tex

def matte_of(a, B, soft=None):
    """Wie sehr gehört ein Pixel zum Produkt (1) statt zum Hintergrund (0)?"""
    dd = np.clip(B - a, 0, 1).max(axis=2)                               # dunkler als der Hintergrund
    dl = np.clip((a @ LUMA) - (B @ LUMA), 0, 1)                         # heller als der Hintergrund
    sa = (a.max(axis=2) - a.min(axis=2)) / (a.max(axis=2) + 1e-3)
    sb = (B.max(axis=2) - B.min(axis=2)) / (B.max(axis=2) + 1e-3)
    ds = np.clip(sa - sb, 0, 1)                                         # farbiger als der Hintergrund
    dark = np.clip(dd / 0.17, 0, 1) ** 0.85
    m = np.maximum.reduce([dark, sstep((dl - 0.025) / 0.08), sstep((ds - 0.06) / 0.2)])
    if soft is not None:                                                # im klaren Glas: Lichtschein stufenlos statt mit Schwelle
        room = np.clip(0.97 - (B @ LUMA), 0.07, 0.22)                    # so viel heller kann ein Pixel hier überhaupt werden
        glow = np.maximum.reduce([dark, np.clip(dl / room, 0, 1) ** 1.3, np.clip((ds - 0.03) / 0.4, 0, 1)])
        m = m * (1 - soft) + glow * soft
    return m, dd, dl, ds

def flood_from_border(passable):
    """Alles, was vom Bildrand aus erreichbar ist (4er-Nachbarschaft)."""
    reach = np.zeros_like(passable)
    reach[0], reach[-1], reach[:, 0], reach[:, -1] = passable[0], passable[-1], passable[:, 0], passable[:, -1]
    n = reach.sum()
    while True:
        g = reach.copy()
        g[1:] |= reach[:-1]; g[:-1] |= reach[1:]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
        g &= passable
        m = g.sum()
        if m == n: return g
        reach, n = g, m

def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; stack = [(y0, x0)]; lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1), (y - 1, x - 1), (y - 1, x + 1), (y + 1, x - 1), (y + 1, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; stack.append((yy, xx))
    return lab, n

def vignette(h, w, band):
    """1 in der Mitte, 0 am Rand – mit runden Ecken, damit der Lichtkegel nie wie ein Kasten aussieht."""
    yy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h))[:, None] / (h * band), 0, 1)
    xx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w))[None, :] / (w * band), 0, 1)
    return sstep(1 - np.hypot(1 - yy, 1 - xx))

# ── 3) Ein Foto aufbereiten ─────────────────────────────────────────────────────────────────────
def process(name, opt=None, debug=None):
    opt = dict(EINSTELLUNG.get(name, {}), **(opt or {}))
    a = from_img(Image.open(os.path.join(SRC, name)).convert('RGB'))
    H0, W0, _ = a.shape
    if opt.get('rahmen') != 'aus':
        x0, y0, x1, y1 = find_photo(a); a = a[y0:y1, x0:x1]
    h, w, _ = a.shape
    if debug is not None: debug['schnitt'] = '%d×%d von %d×%d' % (w, h, W0, H0)

    # Analyse in kleiner Auflösung
    s = 300 / max(h, w); lw, lh = max(16, round(w * s)), max(16, round(h * s)); L = max(lw, lh)
    lo = from_img(to_img(a).resize((lw, lh), Image.LANCZOS))
    Blo, tex = backdrop(lo)
    m_lo, dd, dl, ds = matte_of(lo, Blo)
    dark_t = np.clip(dd / 0.17, 0, 1) ** 0.85
    prod = (dark_t > 0.30) | ((ds > 0.12) & (dd > 0.10)) | (dl > 0.09) | (tex > 0.05)
    lum_d = (Blo @ LUMA) - (lo @ LUMA)
    dil = lambda m, k=3: from_img(mask_img(m.astype(np.float32)).filter(ImageFilter.MaxFilter(k))) > 0.5
    # Schatten und farbiger Lichtschein auf der Tischfläche: glatt, nicht tiefschwarz und mit weichem Rand.
    # Ein Produktteil hat dagegen ringsum eine scharfe Kante.
    soft = prod & (tex < 0.03) & (lum_d < 0.6)
    slab, sn = components(soft)
    sharp = tex > 0.045
    for i in range(1, sn + 1):
        reg = slab == i
        if reg.sum() < lh * lw * 0.0015: continue
        ringpx = dil(reg, 5) & ~reg
        if ringpx.any() and sharp[ringpx].mean() < 0.5: prod &= ~reg
    bpx = max(2, int(L * 0.012)); prod[:bpx] = False; prod[-bpx:] = False; prod[:, :bpx] = False; prod[:, -bpx:] = False
    box = lambda b: (slice(int(b[1] * lh), int(np.ceil(b[3] * lh))), slice(int(b[0] * lw), int(np.ceil(b[2] * lw))))
    inside = np.ones((lh, lw), bool)
    if 'bereich' in opt:                                                 # nur hier darf Produkt sein (Requisiten daneben bleiben Hintergrund)
        inside[:] = False; inside[box(opt['bereich'])] = True; prod &= inside
    fest = np.zeros((lh, lw), bool)
    for b in opt.get('fest', []): fest[box(b)] = True                    # hier ist sicher Produkt (z. B. weißes Etikett vor weißem Hintergrund)
    prod |= fest
    # Was vom Bildrand aus über weiche Übergänge erreichbar und schattenfarben ist, ist Schatten – kein Produkt.
    grad = np.zeros((lh, lw), np.float32)
    for c in range(3):
        gy, gx = np.gradient(lo[..., c]); grad = np.maximum(grad, np.hypot(gx, gy))
    cand = prod & ~fest & (lum_d < 0.5) & (dl < 0.05) & (ds < 0.45)        # so sieht Schatten aus: nicht tiefdunkel, höchstens warm getönt
    reached = flood_from_border((grad < 0.035) & (~prod | cand))
    shade0 = reached & cand
    shade = shade0.copy()
    for _ in range(14):                                                  # vom Hintergrund aus in den Schatten hinein, solange es nur allmählich dunkler wird
        ref = from_img(mask_img(np.where(reached, dd, 0)).filter(ImageFilter.MaxFilter(3)))
        more = cand & ~reached & dil(reached) & (dd <= ref + 0.05)
        if not more.any(): break
        reached |= more; shade |= more
    shadow_like = ((ds < 0.05) & (dd < 0.30) & (dl < 0.02)) | \
                  ((tex < 0.03) & (lum_d < 0.22) & (ds < 0.33) & (dl < 0.09))      # auch getönter Lichtschein auf der Tischfläche
    neutral = (ds < 0.045) & (np.abs(lo - Blo).max(axis=2) < 0.07)       # sieht aus wie Hintergrund
    clearish = (dd < 0.22) & (ds < 0.28)                                 # hell und kaum farbig: klares Glas, auch beleuchtet

    def analyse(prod):
        grown = dil(prod)                                                # Umrisse schließen
        outside = flood_from_border(~grown)
        holes_all = ~grown & ~outside                                    # vom Produkt umschlossene Flächen
        # weiche Schatten (grau, nur etwas dunkler) gehören zum Hintergrund – außer direkt am Produkt oder an Glaskanten
        strong = prod & ~shadow_like
        grown &= ~shadow_like | dil(holes_all | strong, 5)
        lab, n = components(grown)
        hlab, hn = components(holes_all)
        A = {k: np.zeros((lh, lw), bool) for k in ('solid_fill', 'glass_fill', 'keep', 'main', 'edge_touch', 'zone')}
        infos = []; stats = []
        for i in range(1, n + 1):
            comp = lab == i; area = int(comp.sum())
            if area < lh * lw * 0.0005: continue
            ys, xs = np.nonzero(comp)
            bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            if (bw <= L * 0.025 and bh >= lh * 0.5) or (bh <= L * 0.025 and bw >= lw * 0.5): continue     # Reste eines Rahmens
            near = dil(comp)
            whole = comp.copy(); my = []
            for hi in np.unique(hlab[near & holes_all]):
                if hi: hole = hlab == hi; my.append(hole); whole |= hole
            total = int(whole.sum())
            glassy = neutral[whole].mean() >= 0.42 or clearish[whole].mean() >= 0.62
            if 'glas' in opt: glassy = opt['glas']
            stats.append((total, round(float(neutral[whole].mean()), 2), round(float(clearish[whole].mean()), 2), glassy))
            for hole in my:
                see_through = glassy or (neutral[hole].mean() >= 0.5 and hole.sum() >= total * 0.2)
                if 'glas' in opt: see_through = opt['glas']
                A['glass_fill' if see_through else 'solid_fill'][hole] = True
                if see_through: A['zone'] |= hole
            if glassy: A['zone'] |= whole
            A['keep'] |= comp
            touches = ys.min() <= bpx + 1 or ys.max() >= lh - bpx - 2 or xs.min() <= bpx + 1 or xs.max() >= lw - bpx - 2
            infos.append((total, whole, touches))
            if touches: A['edge_touch'] |= whole
        if infos:
            biggest = max(i[0] for i in infos)
            for area, whole, touches in infos:
                if area >= biggest * 0.12 and (not touches or opt.get('art') == 'szene' or area == biggest): A['main'] |= whole
        # Kleinkram weit weg vom Hauptprodukt (Schattenmuster an der Wand) bleibt Hintergrund
        if A['main'].any():
            reach = dil(A['main'], int(L * 0.09) | 1)
            for area, whole, touches in infos:
                if not (whole & reach).any():
                    for k in ('keep', 'solid_fill', 'glass_fill', 'edge_touch', 'zone'): A[k] &= ~whole
        A['stats'] = stats
        return A

    A = analyse(prod)
    if opt.get('schatten') != 'lassen':
        cut = shade & ~dil(A['zone'], 5)                                 # klares Glas behält seinen Umriss, dort wird nur weich gerechnet
        if cut.any(): A = analyse(prod & ~cut)
    keep, solid_fill, glass_fill, main, edge_touch, zone = (A[k] for k in ('keep', 'solid_fill', 'glass_fill', 'main', 'edge_touch', 'zone'))
    licht = np.zeros((lh, lw), bool)
    for b in opt.get('licht', []): licht[box(b)] = True                   # hier leuchtet etwas frei vor dem Hintergrund (Flamme)
    if not main.any():                                                   # nichts erkannt → Mitte beleuchten
        yy, xx = np.mgrid[0:lh, 0:lw]
        main = ((xx - lw / 2) / (lw * .26)) ** 2 + ((yy - lh * .52) / (lh * .36)) ** 2 < 1
        keep = main.copy(); solid_fill = main.copy()

    # volle Auflösung: Deckkraft je Pixel
    B = np.stack([up(Blo[..., c], (w, h)) for c in range(3)], axis=2); B = np.maximum(B, 0.06)
    T = np.clip(a / B, 0, 1.1)
    region = keep | solid_fill | glass_fill | zone | licht
    in_glass = sstep(up(dil(zone | licht).astype(np.float32), (w, h), blur=1.0) * 1.5)
    m_full = matte_of(a, B, soft=in_glass)[0]
    # Schatten direkt am Produkt: bleibt Schatten auf dem neuen Hintergrund statt heller Fleck
    shade_r = (shade & ~dil(zone, 5)) | (shade0 & (ds < 0.10))           # im klaren Glas nur glatte graue Flächen: Gravur und Korken bleiben
    if opt.get('schatten') == 'lassen': shade_r[:] = False
    sup = sstep(up(dil(shade_r).astype(np.float32), (w, h), blur=1.5) * 1.5) * sstep((T.mean(axis=2) - 0.22) / 0.2)
    S = sstep(up(dil(region & ~licht, 5).astype(np.float32), (w, h), blur=1.0) * 1.6)
    if licht.any():                                                      # Kasten läuft weich aus, damit man ihn nicht sieht
        S = np.maximum(S, up(sstep((gauss(licht.astype(np.float32), L * 0.03) - 0.5) / 0.45), (w, h)))
    S_fill = sstep(up((solid_fill | fest).astype(np.float32), (w, h), blur=0.8) * 1.5)
    sheen = GLASS_SHEEN * up(np.clip(gauss((zone & ~shade).astype(np.float32), L * 0.012), 0, 1), (w, h))
    alpha = np.clip(np.maximum.reduce([m_full * (1 - sup), S_fill, sheen]) * S, 0, 1)
    if not inside.all():                                                 # Rand des Bereichs läuft weich aus statt hart abzuschneiden
        alpha *= up(sstep((gauss(inside.astype(np.float32), L * 0.007) - 0.5) / 0.45), (w, h))

    # neuer Hintergrund: Lichtkegel um das Hauptprodukt, zu den Fotorändern hin dunkel (runde Ecken, kein Kasten)
    # Beim Produktfoto richtet sich seine Größe nach dem späteren Ausschnitt: Er ist vor dem Bildrand ganz ausgelaufen.
    reach = L
    if opt.get('art') != 'szene':
        ys, xs = np.flatnonzero(main.any(axis=1)), np.flatnonzero(main.any(axis=0))
        reach = float(max((ys[-1] - ys[0] + 1) / FIT_H, (xs[-1] - xs[0] + 1) / FIT_W * 1.25)) * 0.36
    pool = mask_img(main.astype(np.float32)).filter(ImageFilter.MaxFilter(max(3, int(reach * 0.05) | 1))).filter(ImageFilter.GaussianBlur(reach * 0.15))
    P = sstep(np.clip(from_img(pool.resize((w, h), Image.BICUBIC)) * 1.5, 0, 1))
    E = vignette(h, w, 0.24)
    Bnew = FLOOR + (PEAK - FLOOR) * (P * E)[..., None]
    touch = sstep(up(edge_touch.astype(np.float32), (w, h), blur=1.0) * 1.5)          # am Rand Abgeschnittenes läuft weich aus
    alpha = alpha * (1 - touch * (1 - sstep(vignette(h, w, 0.10) * 1.6)))
    out = alpha[..., None] * a + (1 - alpha[..., None]) * T * Bnew
    out = np.maximum(out, FLOOR)
    if debug is not None:
        debug.update(lo=lo, B=Blo, prod=prod, keep=keep, fill=solid_fill, glass=glass_fill, main=main, zone=zone, shade=shade, teile=A.get('stats'))

    if opt.get('art') == 'szene':
        return to_img(out), None
    ys = np.flatnonzero(main.any(axis=1)); xs = np.flatnonzero(main.any(axis=0))
    bbox = [xs[0] / s, ys[0] / s, (xs[-1] + 1) / s, (ys[-1] + 1) / s]
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    fh = max(bh / FIT_H, bw / FIT_W * 1.25); fw = fh * 0.8
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    fx0, fy0 = int(round(cx - fw / 2)), int(round(cy - fh * 0.51)); fw, fh = int(round(fw)), int(round(fh))
    canvas = np.broadcast_to(FLOOR, (fh, fw, 3)).copy()
    sx0, sy0, sx1, sy1 = max(0, fx0), max(0, fy0), min(w, fx0 + fw), min(h, fy0 + fh)
    canvas[sy0 - fy0:sy1 - fy0, sx0 - fx0:sx1 - fx0] = out[sy0:sy1, sx0:sx1]
    canvas = FLOOR + (canvas - FLOOR) * vignette(fh, fw, 0.12)[..., None]
    im = to_img(canvas)
    if fw > FRAME[0]: im = im.resize(FRAME, Image.LANCZOS)
    pb = [(bbox[0] - fx0) / fw, (bbox[1] - fy0) / fh, (bbox[2] - fx0) / fw, (bbox[3] - fy0) / fh]
    return im, pb

def save(im, name):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if name.lower().endswith('.webp'): im.save(path, 'WEBP', quality=88, method=6)
    else: im.save(path, 'JPEG', quality=88, optimize=True, progressive=True)

# ── 4) Sammelbilder: fertige Einzelfotos nebeneinander, die Lichtkegel verschmelzen ─────────────
def collage(items, results, size=(1200, 720)):
    W, H = size
    canvas = np.broadcast_to(FLOOR, (H, W, 3)).copy()
    placed = []
    for name, rel in items:
        im, pb = results[name]
        ph = (pb[3] - pb[1]) * im.height                       # Produkthöhe im Einzelbild
        k = rel * H / ph
        im2 = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        placed.append((from_img(im2), [pb[0] * im2.width, pb[1] * im2.height, pb[2] * im2.width, pb[3] * im2.height]))
    widths = [p[1][2] - p[1][0] for p in placed]
    fit = min(W * 0.78 / sum(widths), H * 0.80 / max(p[1][3] - p[1][1] for p in placed))
    if abs(fit - 1) > 0.02:
        placed = [(from_img(to_img(arr).resize((max(1, round(arr.shape[1] * fit)), max(1, round(arr.shape[0] * fit))), Image.LANCZOS)), [v * fit for v in pb]) for arr, pb in placed]
        widths = [p[1][2] - p[1][0] for p in placed]
    rand = W * 0.07                                            # außen etwas Luft, damit kein Lichtkegel am Bildrand abgeschnitten wird
    gap = (W - 2 * rand - sum(widths)) / max(1, len(placed) - 1)
    if len(placed) == 1: rand = (W - widths[0]) / 2
    tallest = max(p[1][3] - p[1][1] for p in placed)
    x = rand; base = H * 0.5 + tallest * 0.5                    # gemeinsame Standlinie, Gruppe mittig
    for arr, pb in placed:
        ox = int(round(x - pb[0])); oy = int(round(base - pb[3]))
        x += (pb[2] - pb[0]) + gap
        ah, aw, _ = arr.shape
        sx0, sy0, sx1, sy1 = max(0, ox), max(0, oy), min(W, ox + aw), min(H, oy + ah)
        if sx1 <= sx0 or sy1 <= sy0: continue
        canvas[sy0:sy1, sx0:sx1] = np.maximum(canvas[sy0:sy1, sx0:sx1], arr[sy0 - oy:sy1 - oy, sx0 - ox:sx1 - ox])
    return to_img(FLOOR + (canvas - FLOOR) * vignette(H, W, 0.07)[..., None])

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
        dbg = {}
        im, pb = process(n, debug=dbg)
        out_name = os.path.splitext(n)[0] + '.webp'
        save(im, out_name); results[n] = (im, pb)
        print('✓', n.ljust(46), 'Foto', dbg.get('schnitt', '').ljust(24), '→', '%d×%d' % im.size)
    for out_name, items in SAMMELBILDER.items():
        need = [n for n, _ in items]
        if only and not any(n in only for n in need): continue
        for n in need:
            if n not in results: results[n] = process(n)
        save(collage(items, results), out_name)
        print('✓ Sammelbild', out_name)
