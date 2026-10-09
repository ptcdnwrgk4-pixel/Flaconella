# Flaconella

Webshop für handgefertigte Deko aus recycelten Flaschen – ein Projekt des Padella Vino, Dieburg.
Statische Seiten, kein Framework, gehostet bei IONOS. Deploy-Anleitung: `DEPLOY.md`.

## Aufbau

```
js/products.js      Kategorien, Produkte, Aufsätze/Zubehör, Versand, PayPal-ID – einzige Datenquelle
js/shop.js          Warenkorb, Produktfenster, Kasse, PayPal, Kontaktformular
css/style.css       Stylesheet (Richtung „Nachtschwarz“: dunkel, Gold, Playfair Display + Montserrat)
src/pages/          Seiteninhalte: start.html, impressum.html, datenschutz.html, agb.html, widerruf.html
build.mjs           erzeugt daraus alle Seiten (index.html, flaschen/, windlichter/, kerzen/, sets/,
                    impressum/, datenschutz/, agb/, widerruf/) und sitemap.xml
order.php           Bestell- und Kontakt-Mailer (läuft auf dem IONOS-Server)
images/, fonts/     Fotos, Logo; Schriften selbst gehostet
brand/              Marken-Material (Logos, Kontext, Aufbauplan) – wird nicht hochgeladen
```

## Arbeiten

```
node build.mjs                                  # Seiten neu erzeugen (nach jeder Änderung an Daten, Texten, Vorlage)
python3 -m http.server 8089 --bind 127.0.0.1    # lokal ansehen: http://127.0.0.1:8089/
```

Die erzeugten HTML-Dateien sind eingecheckt; der GitHub-Workflow baut sie vor dem Upload trotzdem frisch.
Produkte, Preise und Aufsätze pflegst du nur in `js/products.js`, dann `node build.mjs` ausführen und pushen.

Adressen: `/` Startseite · `/flaschen/` `/windlichter/` `/kerzen/` `/sets/` Kategorien · Produkt-Direktlink
z. B. `/windlichter/#windlicht-traube` · `/impressum/` `/datenschutz/` `/agb/` `/widerruf/` Rechtstexte.
