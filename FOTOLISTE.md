# Fotoliste Flaconella

Automatisch erzeugt von `node build.mjs` am 2026-11-26. Originalfotos in `fotos-original/aufsatz/` legen, dann `python3 tools/fotos.py` und `node build.mjs` ausführen.

## Beispielfoto je Aufsatz (Pflicht, eins pro Aufsatz)

Dateiname = Kürzel, z. B. `fotos-original/aufsatz/lampenschirm.webp`. Wird gezeigt, solange es für eine Flasche kein eigenes Foto gibt.

| Aufsatz | Kürzel | Foto |
|---|---|---|
| Korken | `korken` | vorhanden: `/images/lampe-weinflasche-klar.webp` |
| Dekokorken | `dekokorken` | **fehlt** |
| LED-Lichterkette im Korken | `lichterkette` | vorhanden: `/images/lampe-hexagonal.webp` |
| Lampenschirm mit Licht | `lampenschirm` | **fehlt** |
| Kerzenaufsatz mit Wachskerze | `kerzenaufsatz` | vorhanden: `/images/kerzenhalter_set_3er_02.webp` |

## Eigenes Foto je Flasche und Aufsatz (empfohlen)

Dateiname `<produkt>--<kürzel>.webp`, z. B. `fotos-original/aufsatz/flasche-hexagon--lampenschirm.webp`.

| Produkt | Korken | Dekokorken | LED-Lichterkette im Korken | Lampenschirm mit Licht | Kerzenaufsatz mit Wachskerze |
|---|---|---|---|---|---|
| Flasche Elegance | – | – | ✓ | – | – |
| Flasche Hexagon | – | – | ✓ | – | – |
| Flasche Pusteblume | – | – | ✓ | – | – |
| Flasche Stella | – | – | ✓ | – | – |
| Flasche XL | ✓ | – | ✓ | – | – |
| Flasche Geriffelt | – | – | – | – | – |
| Flasche Italia | – | – | – | – | – |
| Duo-Set Flasche XL | ✓ | – | – | – | – |

## So fotografieren

- Hochformat, mindestens 1200 × 1500 Pixel, heller ruhiger Hintergrund ohne Requisiten (keine Blumen, Teller, Stoffe daneben).
- Das Produkt ganz im Bild, rundherum etwas Luft. `tools/fotos.py` schneidet zu, setzt es mittig und tauscht den hellen Hintergrund gegen den dunklen Lichtschein der Seite.
- Gleicher Abstand und gleiche Höhe wie bei den anderen Fotos, weiches Licht von vorn – harte Schatten und farbige Lichtflecken auf dem Tisch vermeiden.
- Licht-Aufsätze (Lichterkette, Lampenschirm, Kerze) zusätzlich einmal eingeschaltet im Halbdunkel.
- Als WebP oder JPG speichern; Dateiname klein, ohne Umlaute und Leerzeichen. Die Originale bleiben in `fotos-original/` unverändert liegen.
