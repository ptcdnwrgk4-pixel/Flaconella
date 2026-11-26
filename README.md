# Flaconella

Webshop für handgefertigte Deko aus recycelten Flaschen – ein Projekt des Padella Vino, Dieburg.
Statische Seiten, kein Framework, gehostet bei IONOS. Deploy-Anleitung: `DEPLOY.md`.

## Aufbau

```
js/products.js      Kategorien, Produkte, Aufsätze/Zubehör, Versand, PayPal-ID – einzige Datenquelle
js/shop.js          Warenkorb, Produktfenster, Kasse, PayPal, Kontaktformular
js/motion.js        Bewegung: Kopfzeile, Einblenden beim Scrollen, Lichtpunkte im Hero, Laufband, Aufsatz-Wechsler
css/style.css       Stylesheet (Richtung „Nachtschwarz“: dunkel, Gold, Playfair Display + Montserrat)
src/pages/          Seiteninhalte: start.html, impressum.html, datenschutz.html, agb.html, widerruf.html
build.mjs           erzeugt daraus alle Seiten (index.html, flaschen/, windlichter/, kerzen/, sets/,
                    impressum/, datenschutz/, agb/, widerruf/) und sitemap.xml
order.php           Bestell- und Kontakt-Mailer (läuft auf dem IONOS-Server)
images/, fonts/     Fotos (freigestellt), Logo; Schriften selbst gehostet
fotos-original/     Originalfotos mit hellem Hintergrund – Quelle für images/, wird nicht hochgeladen
tools/fotos.py      stellt die Originalfotos für die dunkle Seite frei – wird nicht hochgeladen
brand/              Marken-Material (Logos, Kontext, Aufbauplan) – wird nicht hochgeladen
```

## Arbeiten

```
node build.mjs                                  # Seiten neu erzeugen (nach jeder Änderung an Daten, Texten, Vorlage)
python3 -m http.server 8089 --bind 127.0.0.1    # lokal ansehen: http://127.0.0.1:8089/
```

Die erzeugten HTML-Dateien sind eingecheckt; der GitHub-Workflow baut sie vor dem Upload trotzdem frisch.
Produkte, Preise und Aufsätze pflegst du nur in `js/products.js`, dann `node build.mjs` ausführen und pushen.

## Fotos

Die Seite ist dunkel, die Originalfotos haben einen hellen Hintergrund. Damit kein heller Kasten in der Seite steht,
werden die Fotos einmal freigestellt:

```
pip install rembg onnxruntime pillow numpy      # einmalig; beim ersten Lauf lädt rembg sein Modell (rund 180 MB)
python3 tools/fotos.py                          # alle Fotos aus fotos-original/ neu nach images/ schreiben
python3 tools/fotos.py lampe-hexagonal.webp     # nur ein Foto (sein Sammelbild wird mit erzeugt)
```

- `fotos-original/` enthält die unveränderten Originale, `images/` die Fassungen für die Seite. Nur `images/` geht online.
- Ein Freisteller-Modell trennt das Produkt vom Hintergrund. Das Produkt selbst bleibt Pixel für Pixel das Original
  (nicht vergrößert, nicht weichgezeichnet), nur der Hintergrund wird durchsichtig. Jedes Produkt sitzt mittig im
  Hochformat 4:5; kleine Originale werden dafür nicht stärker beschnitten, als ihre Auflösung hergibt.
- Die vier Kategoriebilder (`images/kategorie-*.webp`) setzt das Skript aus den Einzelfotos zusammen; welche Fotos
  dazugehören, steht oben im Skript unter `SAMMELBILDER`. Die gleichnamigen `.jpg` sind die Vorschaubilder beim Teilen.
- Den leisen, warmen Lichtschein hinter den Produkten macht die Seite selbst (Abschnitt „FOTOS“ im Stylesheet).
- Schärfer als das Original wird ein Foto dadurch nicht: Für große Darstellung braucht es mindestens 1200 × 1500 Pixel.

## Bewegung

Die Seite bewegt sich, bleibt aber ohne Bewegung vollständig nutzbar. Fremde Bibliotheken gibt es keine.

- Ein kleines Skript im `<head>` setzt die Klasse `motion` am `<html>`, wenn das Gerät Bewegung erlaubt.
  Bei „Bewegung reduzieren“ fehlt die Klasse und alles steht still.
- `data-intro` (auch `="fade"`, `="clip"`): Auftakt oben auf der Seite, reines CSS, läuft sofort.
- `data-reveal` (auch `="fade"`, `="clip"`): blendet ein, sobald das Element in den Bildschirm scrollt.
  Reihenfolge über `style="--i:2"`.
- `data-split="intro"` oder `="scroll"` an `h1`/`h2`: `build.mjs` zerlegt die Überschrift in Wörter, die einzeln einlaufen.
- `data-cursor="Ansehen"`: rundes Etikett am Mauszeiger. `data-glow`: Lichtschein folgt der Maus.
- Seitenwechsel laufen über View Transitions (`@view-transition` im Stylesheet). Das Kategoriebild wächst aus der
  angeklickten Kachel, das Produktfoto aus der Karte ins Fenster. Browser ohne Unterstützung wechseln normal.
- Regel im Stylesheet: Einblenden nutzt `transform`/`clip-path`/`opacity`, Hover und Scroll-Effekte nutzen
  `scale`/`translate`. So überschreibt sich nichts gegenseitig.

Adressen: `/` Startseite · `/flaschen/` `/windlichter/` `/kerzen/` `/sets/` Kategorien · Produkt-Direktlink
z. B. `/windlichter/#windlicht-traube` · `/impressum/` `/datenschutz/` `/agb/` `/widerruf/` Rechtstexte.
