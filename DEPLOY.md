# Flaconella – Launch auf IONOS Webhosting Plus

## Was hochgeladen wird

Alles aus diesem Repository außer `.git`, `README.md`, `version.txt`, `DEPLOY.md` und `.nojekyll`:

```
index.html      die Seite
order.php       Bestell-, Kontakt- und Bewertungs-Mailer
.htaccess       HTTPS-Weiterleitung, Caching, Sicherheits-Header
favicon.png
robots.txt
sitemap.xml
images/         Produktfotos, Collagen, Logo, og.jpg
fonts/          Schriften (lokal, kein Google-Fonts-Aufruf)
```

## Vor dem ersten Upload

1. **Postfach anlegen:** In IONOS → E-Mail → `hallo@flaconella.de` als echtes Postfach (Mail Basic) anlegen.
   `order.php` sendet mit dieser Adresse als Absender; IONOS verwirft Mails mit fremdem Absender.
2. **PayPal-Live-Client-ID eintragen:** In `index.html` die Zeile `const PAYPAL_CLIENT_ID = 'sb';` durch die
   Live-Client-ID aus dem PayPal-Business-Konto ersetzen (developer.paypal.com → Apps & Credentials → Live).
   Solange `'sb'` eingetragen ist, läuft PayPal im Testmodus und zeigt das im Shop an.
3. **Versandpauschale prüfen:** `const SHIPPING = {...}` in `index.html` (aktuell 6,90 € Versand, Abholung kostenlos).
   Der Betrag erscheint automatisch in Warenkorb, Kasse, PayPal und AGB.

## Upload per SFTP

1. IONOS → Hosting → Webhosting Plus → **SFTP/SSH-Zugang** → Zugangsdaten anlegen oder anzeigen.
2. Mit einem SFTP-Programm (z. B. Cyberduck, FileZilla) verbinden: Host `access-…ionos.de` (steht im Kundenkonto), Port 22.
3. In das Webspace-Verzeichnis wechseln, das der Domain zugeordnet ist (Standard: Hauptverzeichnis, siehe Schritt „Domain verbinden“).
4. Alle oben genannten Dateien und Ordner hochladen. Beim Aktualisieren reicht es, geänderte Dateien zu ersetzen.

## Domain verbinden

1. IONOS → Domains & SSL → `flaconella.de` → **Verwendung / Ziel** → „Webspace“ des Webhosting-Plus-Vertrags → Verzeichnis `/` (oder das Verzeichnis, in das hochgeladen wurde).
2. Dasselbe für `flaconella.com`; die `.htaccess` leitet alles auf `https://flaconella.de` um. Alternativ `.com` in IONOS als Weiterleitung auf `https://flaconella.de` einrichten.
3. SSL-Zertifikat ist bei Webhosting Plus enthalten: unter Domains & SSL für `flaconella.de` aktivieren. Die `.htaccess` erzwingt HTTPS.

## Testen nach dem Upload

1. `https://flaconella.de` öffnen – Seite, Bilder, Schriften, Kategorie-Kacheln prüfen.
2. Testbestellung per Überweisung: Bestellung muss im Postfach `hallo@flaconella.de` ankommen, Kundin erhält Eingangsbestätigung.
3. Kontaktformular und Bewertung einmal absenden.
4. PayPal: mit Sandbox (`'sb'`) einen Durchlauf machen, dann Live-ID eintragen und mit 1 € Testprodukt real testen oder direkt den ersten echten Kauf beobachten.
5. Kommt keine Mail an: in `order.php` prüfen, dass `SHOP_FROM` exakt das angelegte Postfach ist. IONOS-Hilfe: „Keine Zusendung von E-Mails mit abweichender Absenderadresse“.

## Spätere Änderungen

Produkte, Preise, Texte und Zubehör stehen in `index.html` im Abschnitt `PRODUCTS` bzw. den Konstanten darüber.
Neue Fotos als WebP in `images/` legen und im Produkt eintragen. Danach `index.html` (und ggf. Bilder) erneut hochladen.
