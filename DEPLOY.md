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

## Automatischer Upload (GitHub Actions)

Der Workflow `.github/workflows/deploy.yml` lädt bei jedem Push auf `main` alles außer den Repo-internen
Dateien (siehe `.deployignore`) per SFTP in den IONOS-Webspace. Nur geänderte Dateien werden übertragen,
auf dem Server wird nichts gelöscht.

Einmalig einrichten:

1. IONOS → Hosting → Webhosting Plus → **SFTP/SSH-Zugang**: Zugangsdaten anzeigen (Host, Benutzer) und ein Passwort setzen.
2. GitHub → Repository `Flaconella` → **Settings → Secrets and variables → Actions → New repository secret**:
   - `IONOS_SFTP_HOST` – der Host aus IONOS, z. B. `access-5017xxxxxx.webspace-host.com`
   - `IONOS_SFTP_USER` – der SFTP-Benutzername
   - `IONOS_SFTP_PASSWORD` – das Passwort
   - `IONOS_TARGET_DIR` – nur nötig, wenn die Domain nicht auf das Hauptverzeichnis `/` zeigt
3. Branch in `main` mergen oder unter **Actions → Deploy zu IONOS → Run workflow** manuell starten.
4. Im Lauf steht die Liste der hochgeladenen Dateien und am Ende die Antwort von `https://flaconella.de`.

## Upload von Hand (Alternative)

Mit einem SFTP-Programm (z. B. Cyberduck, FileZilla) auf denselben Host (Port 22) verbinden und die oben
genannten Dateien und Ordner in das Webspace-Verzeichnis legen, das der Domain zugeordnet ist.

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
