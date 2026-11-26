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
images/, fonts/     Fotos (dunkel aufbereitet), Logo; Schriften selbst gehostet
fotos-original/     Originalfotos mit hellem Hintergrund – Quelle für images/, wird nicht hochgeladen
tools/fotos.py      bereitet die Originalfotos für die dunkle Seite auf – wird nicht hochgeladen
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
werden die Fotos einmal aufbereitet:

```
python3 tools/fotos.py                          # alle Fotos aus fotos-original/ neu nach images/ schreiben
python3 tools/fotos.py lampe-hexagonal.webp     # nur ein Foto (sein Sammelbild wird mit erzeugt)
```

- `fotos-original/` enthält die unveränderten Originale, `images/` die Fassungen für die Seite. Nur `images/` geht online.
- Das Skript schneidet das Passepartout weg, setzt das Produkt mittig ins Hochformat 4:5 und tauscht den hellen
  Hintergrund gegen einen dunklen, warmen Lichtschein, der in die Seitenfarbe ausläuft. Klares Glas wird durchsichtig,
  Schatten bleiben Schatten.
- Die vier Kategoriebilder (`images/kategorie-*.jpg`) setzt es aus den Einzelfotos zusammen; welche Fotos dazugehören,
  steht oben im Skript unter `SAMMELBILDER`.
- Sieht ein Foto nicht sauber aus (Requisiten neben dem Produkt, weißes Etikett vor weißem Hintergrund), hilft ein
  Eintrag unter `EINSTELLUNG` im Skript. Am einfachsten sind Fotos vor ruhigem, hellem Hintergrund ohne Deko.
- Im Stylesheet steht dazu der Abschnitt „FOTOS“: Auf den etwas helleren Flächen hellt das Foto die Fläche nur auf
  (`mix-blend-mode: lighten`), deshalb ist nirgends eine Bildkante zu sehen.

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
