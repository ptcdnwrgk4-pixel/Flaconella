#!/usr/bin/env node
// ── FLACONELLA · Seiten erzeugen ──
// Baut aus src/pages/*.html, js/products.js und der Vorlage unten alle HTML-Seiten
// (Startseite, 4 Kategorieseiten, 4 Rechtstexte) sowie sitemap.xml.
// Aufruf: node build.mjs   – läuft auch im GitHub-Workflow vor dem Upload.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {CATEGORIES, PRODUCTS, SHIPPING} = require('./js/products.js');
const SITE = 'https://flaconella.de';
const page = name => readFileSync(join(ROOT, 'src/pages', name), 'utf8');
const fmt = n => n.toFixed(2).replace('.', ',') + ' €';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const productsIn = cat => PRODUCTS.filter(p => p.cat === cat);
const ver = file => createHash('sha1').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8);
const V = {css: ver('css/style.css'), products: ver('js/products.js'), shop: ver('js/shop.js')};

// ── Bausteine ──
function header(active){
  const links = CATEGORIES.map(c => `<a href="/${c.slug}/"${active===c.key?' class="on"':''}>${c.name}</a>`).join('');
  return `<header class="site-header">
  <div class="wrap header-inner">
    <button class="nav-burger" type="button" aria-label="Menü öffnen" aria-expanded="false" aria-controls="siteNav" onclick="toggleMobileMenu()"><span></span><span></span><span></span></button>
    <a href="/" class="brand" aria-label="Flaconella Startseite"><img src="/images/logo.png" alt="" width="44" height="44"><span>Flaconella</span></a>
    <nav class="site-nav" id="siteNav" aria-label="Hauptnavigation">${links}<span class="nav-sep"></span><a href="/#story">Story</a><a href="/#kontakt">Kontakt</a></nav>
    <button class="cart-btn" type="button" onclick="openCart()" aria-label="Warenkorb öffnen">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      <span class="label">Warenkorb</span><span class="cart-badge">0</span>
    </button>
  </div>
</header>`;
}

function footer(){
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a href="/" class="brand"><img src="/images/logo.png" alt="" width="36" height="36"><span>Flaconella</span></a>
      <p>Padella Vino · Inhaberin Sonja Peters<br>Markt 8 · 64807 Dieburg<br><a href="mailto:hallo@flaconella.de">hallo@flaconella.de</a><br><a href="tel:+491733055042" style="color:inherit">0173 3055042</a> · Mo–Sa</p>
      <div class="social">
        <a href="https://instagram.com/flaconella.de" target="_blank" rel="noopener" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
        <a href="mailto:hallo@flaconella.de" aria-label="E-Mail"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></a>
      </div>
    </div>
    <div class="footer-col"><h4>Shop</h4><ul>${CATEGORIES.map(c => `<li><a href="/${c.slug}/">${c.name}</a></li>`).join('')}</ul></div>
    <div class="footer-col"><h4>Über uns</h4><ul><li><a href="/#story">Unsere Story</a></li><li><a href="/#prozess">Handwerk</a></li><li><a href="/#kontakt">Kontakt</a></li><li><a href="https://padella-vino.de" target="_blank" rel="noopener">Padella Vino</a></li></ul></div>
    <div class="footer-col"><h4>Rechtliches</h4><ul><li><a href="/impressum/">Impressum</a></li><li><a href="/datenschutz/">Datenschutz</a></li><li><a href="/agb/">AGB</a></li><li><a href="/widerruf/">Widerruf</a></li></ul></div>
  </div>
  <div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} Flaconella · Ein Projekt von <a href="https://padella-vino.de" target="_blank" rel="noopener" style="color:inherit">Padella Vino Dieburg</a></span><span>Versand ${fmt(SHIPPING.versand.price)} · Abholung kostenlos · PayPal oder Überweisung</span></div>
</footer>`;
}

// Warenkorb, Produkt-, Kassen- und Erfolgsfenster: auf jeder Seite vorhanden, Inhalt kommt aus shop.js
const overlays = `
<div class="cart-overlay" id="cartOverlay" onclick="closeCart()"></div>
<aside class="cart-sidebar" id="cartSidebar" role="dialog" aria-modal="true" aria-label="Warenkorb">
  <div class="cart-header"><h3>Warenkorb</h3><button class="cart-close" type="button" onclick="closeCart()" aria-label="Warenkorb schließen">✕</button></div>
  <div class="cart-items" id="cartItems"></div>
  <div class="cart-footer">
    <div class="cart-subtotal"><span>Zwischensumme</span><strong id="cartTotal">0,00 €</strong></div>
    <p class="cart-note" id="cartNote"></p>
    <button class="btn cart-checkout-btn" id="checkoutBtn" type="button" onclick="openCheckout()" disabled>Zur Kasse</button>
    <div class="express" id="expressCart" hidden>
      <div class="express-head"><span>Express-Checkout</span><span class="express-test" hidden>Testmodus</span></div>
      <div class="paypal-slot" id="paypalCart"></div>
      <p class="express-hint">Lieferadresse und Zahlung direkt aus deinem PayPal-Konto. Versand wird mit berechnet; Abholung wählst du über „Zur Kasse“.</p>
    </div>
  </div>
</aside>

<div class="modal-overlay" id="productModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modal" id="modalContent">
    <button class="modal-close" type="button" aria-label="Schließen" onclick="closeModal()">✕</button>
    <div class="modal-grid"><div class="modal-img" id="modalImg"></div><div class="modal-info" id="modalInfo"></div></div>
  </div>
</div>

<div class="modal-overlay" id="checkoutModal" role="dialog" aria-modal="true" aria-label="Bestellung abschließen">
  <div class="checkout-modal">
    <button class="modal-close" type="button" aria-label="Schließen" onclick="closeCheckout()">✕</button>
    <div class="checkout-grid">
      <form class="checkout-form" onsubmit="submitOrder(event)">
        <div class="checkout-header"><p class="eyebrow">Kasse</p><h3>Bestellung abschließen</h3><p>Wir melden uns innerhalb von 24 Stunden.</p></div>
        <div class="checkout-express" id="expressCheckout" hidden>
          <div class="express-head"><span>Express-Checkout <span class="express-test" hidden>· Testmodus</span></span><span>Adresse &amp; Zahlung aus deinem Konto</span></div>
          <div class="paypal-slot" id="paypalCheckout"></div>
        </div>
        <div class="checkout-or" id="checkoutOr" hidden>oder per Überweisung</div>
        <div class="opt-group"><div class="checkout-section-title">Lieferung</div><div class="tiles" id="shipOptions"></div></div>
        <div class="checkout-fields">
          <div class="checkout-section-title">Deine Daten</div>
          <div class="form-row">
            <div class="field"><label for="co-fname">Vorname *</label><input type="text" id="co-fname" name="vorname" autocomplete="given-name" required placeholder="Maria"></div>
            <div class="field"><label for="co-lname">Nachname *</label><input type="text" id="co-lname" name="nachname" autocomplete="family-name" required placeholder="Müller"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="co-email">E-Mail *</label><input type="email" id="co-email" name="email" autocomplete="email" required placeholder="maria@example.de"></div>
            <div class="field"><label for="co-phone">Telefon</label><input type="tel" id="co-phone" name="telefon" autocomplete="tel" placeholder="+49 6071 …"></div>
          </div>
          <div id="addressFields" class="checkout-fields">
            <div class="field"><label for="co-street" id="co-street-label">Straße &amp; Hausnummer *</label><input type="text" id="co-street" name="strasse" autocomplete="street-address" required placeholder="Musterstraße 12"></div>
            <div class="form-row zip">
              <div class="field"><label for="co-zip" id="co-zip-label">PLZ *</label><input type="text" id="co-zip" name="plz" autocomplete="postal-code" required placeholder="64807" pattern="[0-9]{5}" title="Fünfstellige Postleitzahl" inputmode="numeric"></div>
              <div class="field"><label for="co-city" id="co-city-label">Ort *</label><input type="text" id="co-city" name="ort" autocomplete="address-level2" required placeholder="Dieburg"></div>
            </div>
            <p class="note">Lieferung nur innerhalb Deutschlands.</p>
          </div>
        </div>
        <div class="checkout-payment-info"><h4>Zahlung &amp; Versand</h4><p>Nach dem Bestellen erhältst du von uns eine Bestätigung mit den Zahlungsdaten per E-Mail (Überweisung). Versand innerhalb von 3–5 Werktagen nach Zahlungseingang.</p></div>
        <label class="checkout-consent"><input type="checkbox" id="co-consent" required><span>Ich habe die <a href="/agb/" target="_blank">AGB</a> und die <a href="/widerruf/" target="_blank">Widerrufsbelehrung</a> gelesen und akzeptiere sie. Die <a href="/datenschutz/" target="_blank">Datenschutzerklärung</a> habe ich zur Kenntnis genommen.</span></label>
        <button type="submit" class="btn checkout-submit">Zahlungspflichtig bestellen</button>
        <p class="checkout-note">Du erhältst eine Bestätigung per E-Mail. Es gelten die gesetzlichen Gewährleistungsrechte.</p>
      </form>
      <aside class="checkout-aside">
        <div class="checkout-section-title">Deine Bestellung</div>
        <div id="checkoutSummary"></div>
        <div class="checkout-final" id="checkoutFinal"></div>
        <p class="fine">Die Bestellnummer bekommst du mit der Bestätigung per E-Mail.</p>
        <a href="#" class="link" onclick="closeCheckout();setTimeout(openCart,300);return false;">← Warenkorb bearbeiten</a>
      </aside>
    </div>
  </div>
</div>

<div class="modal-overlay" id="successModal" role="dialog" aria-modal="true" aria-label="Bestellung">
  <div class="success-modal">
    <button class="modal-close" type="button" aria-label="Schließen" onclick="closeSuccess()">✕</button>
    <div class="success-icon">🍾</div>
    <h3 id="successTitle">Bestellung eingegangen!</h3>
    <p id="successText"></p>
    <div id="successPayment" style="width:100%"></div>
    <button class="btn" type="button" onclick="closeSuccess()">Weiter einkaufen</button>
  </div>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"><span id="toastMsg"></span></div>`;

function layout({title, description, path, content, active, ogImage}){
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0d0d0d">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Flaconella">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${ogImage || '/images/og.jpg'}">
<meta property="og:locale" content="de_DE">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/PlayfairDisplay-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Montserrat-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/css/style.css?v=${V.css}">
</head>
<body>
${header(active)}
<main>
${content}
</main>
${footer()}
${overlays}
<script src="/js/products.js?v=${V.products}"></script>
<script src="/js/shop.js?v=${V.shop}"></script>
</body>
</html>
`;
}

// ── Seitenbausteine ──
const catTiles = () => CATEGORIES.map(c => `
    <a href="/${c.slug}/" class="cat-tile">
      <img src="/images/kategorie-${c.key}.jpg" alt="${esc(c.name)}" loading="lazy" width="600" height="360">
      <div class="row"><span class="name">${c.name}</span><span class="price">${c.priceHint}</span></div>
      <p class="desc">${c.desc}</p>
    </a>`).join('');

function productCard(p, small){
  const c = CATEGORIES.find(x => x.key === p.cat);
  const price = hasPaid(p) ? `${fmt(p.price)} <span style="color:var(--dim)">+ Aufsatz</span>` : fmt(p.price);
  const variants = p.option ? `<span class="product-variants">${p.option.choices.length} ${p.option.label === 'Motiv' ? 'Motive' : 'Ausführungen'}</span>` : '';
  return `
      <a href="/${c.slug}/#${p.slug}" class="product-card" data-pid="${p.id}" onclick="openProduct('${p.id}');return false;">
        <span class="product-img">${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ''}<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" width="480" height="600"></span>
        <span class="product-info">
          <span class="product-head"><span class="product-name">${esc(p.name)}</span><span class="product-price">${price}</span></span>
          ${small ? '' : `<span class="product-tagline">${esc(p.tagline)}</span>${variants}`}
        </span>
      </a>`;
}
const hasPaid = p => (p.addons || []).some(g => g.type === 'single' && g.options.some(o => o.price > 0));

function categoryPage(c){
  const items = productsIn(c.key);
  // „Passt dazu“: je ein Produkt aus den anderen Kategorien
  const related = CATEGORIES.filter(x => x.key !== c.key).map(x => productsIn(x.key)[0]).concat(
    CATEGORIES.filter(x => x.key !== c.key).map(x => productsIn(x.key)[1]).filter(Boolean)).slice(0, 4);
  const promises = [
    c.key === 'windlicht' ? ['Teelicht & Untersetzer inklusive','Warmweißes Wachsteelicht mit Batterie, kein offenes Feuer nötig.'] :
    c.key === 'kerze' ? ['Handgegossen','Bienen- oder Gelwachs, rund 35 Stunden Brenndauer.'] :
    c.key === 'set' ? ['Set-Vorteil','Günstiger als die Einzelstücke, auf Wunsch im Geschenkkarton.'] :
    ['Aufsatz nach Wahl','Korken inklusive. Dekokorken, Lichterkette, Lampenschirm oder Kerzenaufsatz dazuwählen.'],
    ['Rand von Hand geschliffen','Jede Kante wird dreimal geprüft, bevor das Stück in den Karton geht.'],
    ['In 3–5 Werktagen bei dir',`Versand mit DHL für ${fmt(SHIPPING.versand.price)} oder kostenlos abholen in Dieburg.`],
  ];
  const content = `
<section class="wrap" style="padding-top:40px">
  <p class="crumbs"><a href="/">Start</a> &nbsp;/&nbsp; <a href="/#shop">Shop</a> &nbsp;/&nbsp; <span>${c.name}</span></p>
  <div class="cat-head">
    <div><h1>${c.name}</h1><p class="intro">${c.intro}</p></div>
    <div class="price-box"><span class="big">${c.box[0]}</span><span class="sub">${c.box[1]}</span></div>
  </div>
  <div class="chips-row">${CATEGORIES.map(x => `<a href="/${x.slug}/" class="chip-link${x.key===c.key?' on':''}">${x.name}</a>`).join('')}</div>
  <div class="grid-meta"><span>${items.length} ${items.length === 1 ? 'Produkt' : 'Produkte'}</span><span>Alle Preise inkl. MwSt.</span></div>
  <div class="product-grid">${items.map(p => productCard(p)).join('')}</div>
  <div class="promises">${promises.map(([t,d]) => `<div class="promise"><span class="tick">✓</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join('')}</div>
</section>
<section class="related">
  <div class="wrap inner">
    <div class="head"><h2>Passt dazu</h2><a href="/#shop" class="link">Alle Kategorien →</a></div>
    <div class="related-grid">${related.map(p => productCard(p, true)).join('')}</div>
  </div>
</section>`;
  return layout({title:`${c.seoTitle} – Flaconella`, description:c.seoDesc, path:`/${c.slug}/`, content, active:c.key, ogImage:`/images/kategorie-${c.key}.jpg`});
}

const LEGAL = [
  {slug:'impressum', name:'Impressum', title:'Impressum – Flaconella', desc:'Impressum von Flaconella, Padella Vino, Markt 8, 64807 Dieburg.'},
  {slug:'datenschutz', name:'Datenschutz', title:'Datenschutzerklärung – Flaconella', desc:'Datenschutzerklärung des Flaconella-Shops: welche Daten wir bei Bestellung und Kontakt verarbeiten.'},
  {slug:'agb', name:'AGB', title:'Allgemeine Geschäftsbedingungen – Flaconella', desc:'AGB des Flaconella-Shops: Bestellung, Preise, Versand, Zahlung, Gewährleistung.'},
  {slug:'widerruf', name:'Widerruf', title:'Widerrufsbelehrung – Flaconella', desc:'Widerrufsbelehrung und Muster-Widerrufsformular für Bestellungen bei Flaconella.'},
];
function legalPage(l){
  const nav = LEGAL.map(x => `<a href="/${x.slug}/"${x.slug===l.slug?' class="on"':''}>${x.name}</a>`).join('') + `<a href="/#kontakt" class="gap">Kontakt</a>`;
  const content = `
<section class="wrap legal-layout">
  <nav class="legal-nav" aria-label="Rechtliches"><span class="head">Rechtliches</span>${nav}</nav>
  <article class="legal">
${page(l.slug + '.html')}
  </article>
</section>`;
  return layout({title:l.title, description:l.desc, path:`/${l.slug}/`, content, active:null});
}

// ── Schreiben ──
const out = [];
function write(path, html){
  const dir = join(ROOT, path.replace(/^\//, ''));
  mkdirSync(dir, {recursive:true});
  writeFileSync(join(dir, 'index.html'), html);
  out.push(path);
}
write('/', layout({
  title:'Flaconella – Handgefertigte Deko aus recycelten Flaschen',
  description:'Flaschen, Windlichter und Kerzen aus den Wein- und Spirituosenflaschen des Padella Vino in Dieburg. Handgeschnitten, geschliffen, graviert. Versand oder Abholung.',
  path:'/', content: page('start.html').replace('{{CAT_TILES}}', catTiles()), active:null,
}));
CATEGORIES.forEach(c => write(`/${c.slug}/`, categoryPage(c)));
LEGAL.forEach(l => write(`/${l.slug}/`, legalPage(l)));

const today = new Date().toISOString().slice(0,10);
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${out.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${p === '/' || CATEGORIES.some(c => '/'+c.slug+'/' === p) ? 'weekly' : 'yearly'}</changefreq><priority>${p === '/' ? '1.0' : CATEGORIES.some(c => '/'+c.slug+'/' === p) ? '0.8' : '0.3'}</priority></url>`).join('\n')}
</urlset>
`);
console.log('Erzeugt:', out.join(' '), '+ sitemap.xml');
