// ── FLACONELLA PRODUKTDATEN ──
// Einzige Quelle für Kategorien, Produkte, Zubehör und Versand.
// Wird im Browser (Shop-Skript) und beim Erzeugen der Seiten (build.mjs) gleichermaßen geladen.
// Preise hier zentral pflegen.

const SHOP_EMAIL = 'hallo@flaconella.de';
const ORDER_ENDPOINT = '/order.php';

// Express-Checkout (PayPal). 'sb' = Sandbox zum Testen, '' = aus.
// Vor dem Launch die Live-Client-ID eintragen: developer.paypal.com → Apps & Credentials → Live → Client ID.
const PAYPAL_CLIENT_ID = 'sb';

// Versand: Pauschale innerhalb Deutschlands; Abholung im Café ist kostenlos.
const SHIPPING = {
  versand:  {label:'Versand innerhalb Deutschlands (DHL)', price:6.90},
  abholung: {label:'Abholung im Padella Vino, Markt 8, Dieburg', price:0, note:'Mo–Sa nach Absprache'},
};
const FREE_SHIPPING_FROM = 0; // Warenwert, ab dem der Versand entfällt (0 = nie)

// Preis-Prinzip: Jede Flasche kostet gleich viel. Der Aufsatz (Verschluss, Licht oder Kerze)
// hat seinen eigenen Preis und wird im Produkt-Fenster dazugewählt.
const BOTTLE_BASE = 24.90;

const BOTTLE_ADDONS = [
  {label:'Aufsatz · Verschluss, Licht oder Kerze', type:'single', options:[
    {key:'korken', name:'Korken', price:0, note:'inklusive'},
    {key:'dekokorken', name:'Dekokorken', price:4},
    {key:'lichterkette', name:'LED-Lichterkette im Korken', price:10},
    {key:'lampenschirm', name:'Lampenschirm mit Licht', price:14},
    {key:'kerzenaufsatz', name:'Kerzenaufsatz mit Wachskerze', price:14},
  ]},
];
// Set aus zwei Flaschen: Aufsatz gilt für beide, Preis doppelt.
const BOTTLE_DUO_ADDONS = [
  {label:'Aufsatz für beide Flaschen', type:'single', options:[
    {key:'korken', name:'Korken', price:0, note:'inklusive'},
    {key:'dekokorken', name:'Dekokorken', price:8},
    {key:'lichterkette', name:'LED-Lichterkette im Korken', price:20},
    {key:'lampenschirm', name:'Lampenschirm mit Licht', price:28},
    {key:'kerzenaufsatz', name:'Kerzenaufsatz mit Wachskerze', price:28},
  ]},
];

// ── FOTOS ZU DEN AUFSÄTZEN ──
// Beispielfoto je Aufsatz (an irgendeiner Flasche). Wird im Produktfenster gezeigt, wenn es für
// die gewählte Flasche noch kein eigenes Foto mit diesem Aufsatz gibt – dann mit dem Hinweis „Beispielfoto“.
// Neue Fotos einfach in images/aufsatz/ legen, Dateiname = Aufsatz-Kürzel, z. B. images/aufsatz/lampenschirm.webp.
// Eigene Fotos je Flasche: images/aufsatz/<produkt-slug>--<kürzel>.webp, z. B. flasche-hexagon--lampenschirm.webp.
// build.mjs findet die Dateien selbst und schreibt eine Liste der noch fehlenden Fotos nach FOTOLISTE.md.
const AUFSATZ_BEISPIEL = {
  korken:        '/images/lampe-weinflasche-klar.webp',
  lichterkette:  '/images/lampe-hexagonal.webp',
  kerzenaufsatz: '/images/kerzenhalter_set_3er_02.webp',
};

// Kleine Strichzeichnungen der Aufsätze (für Auswahlkacheln und Startseite)
const AUFSATZ_ICONS = {
  korken:        '<path d="M9.5 2.5h5v5h-5z"/><path d="M9 7.5h6l1.5 3.5V21.5h-9V11z"/>',
  dekokorken:    '<circle cx="12" cy="4.2" r="2.2"/><path d="M10.2 6.4h3.6v3h-3.6z"/><path d="M9 9.4h6l1.5 3V21.5h-9v-9z"/>',
  lichterkette:  '<path d="M10 2.5h4v4h-4z"/><path d="M9.5 6.5h5l2 4v11h-9v-11z"/><path d="M9 12c2 1 4-1 6 0M9 16c2 1 4-1 6 0" stroke-dasharray="1 1.6"/>',
  lampenschirm:  '<path d="M7 2.5h10l3.5 7.5h-17z"/><path d="M12 10v2.5"/><path d="M10 12.5h4l2 3v6H8v-6z"/>',
  kerzenaufsatz: '<path d="M12 1.8c1.3 1.6 1.3 2.8 0 3.8-1.3-1-1.3-2.2 0-3.8z"/><path d="M10.6 6h2.8v6h-2.8z"/><path d="M8 12h8"/><path d="M10.2 12v2.2L8.5 17v4.5h7V17l-1.7-2.8V12"/>',
};

// ── KATEGORIEN ── (slug = Adresse der Seite, z. B. flaconella.de/windlichter/)
const CATEGORIES = [
  {key:'flasche',   slug:'flaschen',    name:'Flaschen',    priceHint:'je 24,90 € + Aufsatz',
   desc:'Karaffe, Lampe oder Kerzenhalter – je nach Aufsatz.',
   intro:'Gravierte Flaschen aus dem Padella Vino. Jede kostet 24,90 €. Den Aufsatz wählst du dazu: Korken, Dekokorken, LED-Lichterkette, Lampenschirm oder Kerzenaufsatz mit Wachskerze.',
   box:['24,90 €','Fester Preis für jede Flasche · Korken inklusive · Aufsätze ab 4 € · 7 Modelle, viele mit zwei Ausführungen'],
   seoTitle:'Gravierte Flaschen als Karaffe, Lampe oder Kerzenhalter',
   seoDesc:'Handgravierte Flaschen aus dem Padella Vino Dieburg, je 24,90 €. Mit Korken, LED-Lichterkette, Lampenschirm oder Kerzenaufsatz. Versand oder Abholung.'},
  {key:'windlicht', slug:'windlichter', name:'Windlichter', priceHint:'39,00 €',
   desc:'Geschnitten, graviert, Teelicht und Untersetzer inklusive.',
   intro:'Geschnittene Weinflaschen mit geschliffenem Rand und Gravur. Das Teelicht bringt das Motiv zum Leuchten. Warmweißes Wachsteelicht mit Batterie und Untersetzer sind dabei.',
   box:['39,00 €','Fester Preis für jedes Windlicht · Teelicht und Untersetzer inklusive · 3 Modelle, je nach Flasche in zwei Motiven'],
   seoTitle:'Windlichter aus Weinflaschen mit Gravur',
   seoDesc:'Windlichter aus geschnittenen Weinflaschen, von Hand geschliffen und graviert. 39 € inklusive Teelicht und Untersetzer. Aus dem Padella Vino Dieburg.'},
  {key:'kerze',     slug:'kerzen',      name:'Kerzen',      priceHint:'ab 25,00 €',
   desc:'Handgegossen aus Bienen- und Gelwachs im Glas.',
   intro:'Handgegossene Kerzen aus natürlichem Bienenwachs und Gelwachs in Glasgefäßen. Warme, ruhige Flamme, rund 35 Stunden Brenndauer.',
   box:['ab 25,00 €','Kerzen im Glas 25 € · Gelwachs-Kerzen 29 € · 9 Farben und Formen'],
   seoTitle:'Handgegossene Kerzen aus Bienenwachs und Gelwachs',
   seoDesc:'Handgegossene Kerzen im Glas aus Bienen- und Gelwachs, ab 25 €. Rund 35 Stunden Brenndauer. Aus der Flaconella-Werkstatt im Padella Vino Dieburg.'},
  {key:'set',       slug:'sets',        name:'Sets',        priceHint:'ab 44,90 €',
   desc:'Paare und Trios mit Set-Vorteil, zum Beispiel drei Kerzenhalter-Flaschen.',
   intro:'Kuratierte Paare und Trios mit Set-Vorteil. Als Geschenk oder für den gedeckten Tisch.',
   box:['ab 44,90 €','Duo-Set Flasche XL 44,90 € · Kerzenhalter 3er-Set 109 €'],
   seoTitle:'Sets aus gravierten Flaschen',
   seoDesc:'Flaconella-Sets mit Set-Vorteil: Duo-Set Flasche XL und 3er-Set Kerzenhalter aus gravierten Flaschen. Handgemacht in Dieburg.'},
];

// ── PRODUKTE ── (slug = Anker auf der Kategorieseite, z. B. /windlichter/#windlicht-traube)
const PRODUCTS = [
  // ── FLASCHEN ──
  {
    id:'l1', cat:'flasche', slug:'flasche-elegance', label:'Flasche',
    name:'Flasche Elegance',
    tagline:'Lugana-Flasche, mediterran graviert – klassisch oder mit Blütenrelief',
    desc:'Elegante, mediterran gravierte Lugana-Flasche mit schlankem Hals. Wahlweise mit klassischer Gravur oder feinem Blütenrelief, das im Licht erst richtig zur Geltung kommt. Mit Korken eine edle Karaffe – mit Lichterkette oder Lampenschirm ein Hingucker auf Regal, Sideboard, Esstisch, Terrasse und Garten, mit Kerzenaufsatz ein Kerzenhalter.',
    badge:'Bestseller',
    image:'/images/lampe-bulgarini-classic.webp',
    gallery:['/images/lampe-bulgarini-classic.webp','/images/lampe-bulgarini-blueten.webp','/images/dekoflasche-botanik.webp'],
    option:{label:'Ausführung', choices:['Klassische Gravur','Blütenrelief']},
    aufsatzBilder:{lichterkette:'/images/lampe-bulgarini-classic.webp'},
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'l3', cat:'flasche', slug:'flasche-hexagon', label:'Flasche',
    name:'Flasche Hexagon',
    tagline:'Achteckige Flasche mit Botanik-Gravur – klar oder bernstein',
    desc:'Die außergewöhnliche Achteck-Flasche mit feiner Botanik-Gravur – Blätter, Ranken, Blüten. Die vielen Flächen brechen das Licht und schaffen ein warmes Spiel im Raum, sobald eine Lichterkette oder Kerze darin leuchtet. Wahlweise in klarem oder bernsteinfarbenem Glas.',
    badge:'Neu',
    image:'/images/lampe-hexagonal.webp',
    gallery:['/images/lampe-hexagonal.webp','/images/lampe-hexagonal-stimmung.webp','/images/lampe-eckig-botanik.webp'],
    option:{label:'Glas', choices:['Klarglas','Bernsteinglas']},
    aufsatzBilder:{lichterkette:'/images/lampe-hexagonal.webp'},
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'l6', cat:'flasche', slug:'flasche-pusteblume', label:'Flasche',
    name:'Flasche Pusteblume',
    tagline:'Schlanke Flasche, poetische Gravur',
    desc:'Eine schlanke Flasche mit einer feinen Pusteblumen-Gravur – mit Lichterkette leuchten die einzelnen Samen auf. Poesie als Dekoobjekt, Karaffe oder Lampe.',
    image:'/images/lampe-pusteblume.webp',
    aufsatzBilder:{lichterkette:'/images/lampe-pusteblume.webp'},
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'l7', cat:'flasche', slug:'flasche-stella', label:'Flasche',
    name:'Flasche Stella',
    tagline:'Schlanke, hohe Flasche mit markanter Form',
    desc:'Eine schlanke, hohe Flasche mit markanter Form – mit warmweißer Lichterkette leuchtet sie im Glas wie ein kleiner Sternenhimmel. Elegant, ruhig, unaufdringlich.',
    image:'/images/lampe-ramazotti.webp',
    aufsatzBilder:{lichterkette:'/images/lampe-ramazotti.webp'},
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'l8', cat:'flasche', slug:'flasche-xl', label:'Flasche',
    name:'Flasche XL',
    tagline:'Große Weinflasche – hell oder dunkel',
    desc:'Die große Weinflasche mit üppigem Körper. Wahlweise in klarem Glas (heller, direkter Lichteffekt) oder in dunklem Olivglas (erdig und warm). Beide Ausführungen zusammen gibt es als Duo-Set unter „Sets“.',
    image:'/images/lampe-weinflasche.webp',
    gallery:['/images/lampe-weinflasche.webp','/images/lampe-weinflasche-klar.webp','/images/lampe-rotwein.webp'],
    option:{label:'Ausführung', choices:['Hell (klar)','Dunkel (olivgrün)']},
    aufsatzBilder:{lichterkette:'/images/lampe-weinflasche.webp', korken:'/images/lampe-weinflasche-klar.webp'},
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'d2', cat:'flasche', slug:'flasche-geriffelt', label:'Flasche',
    name:'Flasche Geriffelt',
    tagline:'Geriffelte Oberfläche, Rose, zeitlos',
    desc:'Eine geriffelte Flasche mit einer eingravierten Rose – die unregelmäßige Oberfläche gibt der Gravur eine besondere Tiefe. Klassische Romantik in modernem Gewand.',
    image:'/images/dekoflasche-geriffelt.webp',
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },
  {
    id:'d3', cat:'flasche', slug:'flasche-italia', label:'Flasche',
    name:'Flasche Italia',
    tagline:'Ikonische italienische Flaschenform mit Botanik-Gravur',
    desc:'Eine ikonische italienische Flaschenform mit unverwechselbarem Design – mit feiner Botanik-Gravur veredelt. Ein Stück italienisches Lebensgefühl als Deko.',
    badge:'Kultig',
    image:'/images/dekoflasche-aperol.webp',
    price:BOTTLE_BASE, addons:BOTTLE_ADDONS
  },

  // ── WINDLICHTER ──
  {
    id:'w1', cat:'windlicht', slug:'windlicht-traube', label:'Windlicht',
    name:'Windlicht Traube',
    tagline:'Geschnittene Flasche mit Frucht-Dekor, Wachsteelicht',
    desc:'Geschnittene Weinflasche mit geschliffenem Rand und feinem Frucht-Dekor – wahlweise als braune Flasche mit Trauben-Ranken oder als schwarze Flasche mit zartem Beerenmotiv (Holunder, Brombeere, wilde Früchte). Warmweißes Wachsteelicht mit Batterie und Untersetzer inklusive.',
    badge:'Bestseller',
    image:'/images/braune_flasche_windlicht_blumen_01.webp',
    gallery:['/images/braune_flasche_windlicht_blumen_01.webp','/images/schwarze_flasche_windlicht_beeren_01.webp','/images/braune_flasche_windlicht_blumen_02.webp','/images/braune_flasche_windlicht_blumen_03.webp'],
    option:{label:'Motiv', choices:['Trauben-Motiv (braun)','Beeren-Motiv (schwarz)']},
    price:39
  },
  {
    id:'w2', cat:'windlicht', slug:'windlicht-noir', label:'Windlicht',
    name:'Windlicht Noir',
    tagline:'Schwarze Flasche, florale Gravur',
    desc:'Dunkle Bordeaux-Flasche mit geschliffenem Rand und eingraviertem Blütenmuster – das Licht des Teelichts bringt die Gravur erst richtig zur Geltung. Elegante Optik für einen Esstisch mit Stil. Warmweißes Wachsteelicht mit Batterie und Untersetzer inklusive.',
    image:'/images/schwarze_flasche_windlicht_blumen_01.webp',
    gallery:['/images/schwarze_flasche_windlicht_blumen_01.webp','/images/schwarze_flasche_windlicht_blumen_02.webp','/images/schwarze_flasche_windlicht_blumen_03.webp'],
    price:39
  },
  {
    id:'w4', cat:'windlicht', slug:'windlicht-ambra', label:'Windlicht',
    name:'Windlicht Ambra',
    tagline:'Bernsteinglas mit zarter floraler Gravur',
    desc:'Ein warmes Bernsteinglas mit feiner floraler Gravur – ruhig, edel, zeitlos. Das Kerzenlicht bringt die Gravur zum Leuchten und setzt einen behaglichen Akzent, ohne laut zu sein.',
    image:'/images/braunes_glas_windlicht_gravur_01.webp',
    gallery:['/images/braunes_glas_windlicht_gravur_01.webp','/images/braunes_glas_windlicht_gravur_02.webp'],
    price:39
  },

  // ── KERZEN ──
  {id:'c1', cat:'kerze', slug:'kerze-zitrus-gruen', label:'Kerze', name:'Kerze Zitrus Grün', tagline:'Grünes Glas, natürliches Bienenwachs', badge:'Neu',
   desc:'Handgegossene Kerze aus natürlichem Bienenwachs im grünen Glasgefäß mit Zitrus-Dekor. Warme, ruhige Flamme, ca. 35 Stunden Brenndauer.', image:'/images/kerze-zitrus-gruen.webp', price:25},
  {id:'c2', cat:'kerze', slug:'kerze-rosa-blume', label:'Kerze', name:'Kerze Rosa Blume', tagline:'Bienenwachs, rosafarbene Eleganz',
   desc:'Handgegossene Kerze aus natürlichem Bienenwachs. Das rosafarbene Gefäß mit sanftem Blütendekor macht sie auch optisch zum Geschenk. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-rosa-blume.webp', price:25},
  {id:'c3', cat:'kerze', slug:'kerze-gelb-blume', label:'Kerze', name:'Kerze Gelb Blume', tagline:'Bienenwachs, sonniges Gelb',
   desc:'Sonniges Gelb mit feinem Blütendekor – handgegossen aus natürlichem Bienenwachs. Bringt Frühling ins Zimmer. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-gelb-blume.webp', price:25},
  {id:'c4', cat:'kerze', slug:'kerze-gruen-rotblumen', label:'Kerze', name:'Kerze Grün Rotblumen', tagline:'Bienenwachs, rote Blüten auf Grün',
   desc:'Grünes Glasgefäß mit roten Blütenmotiven – handgegossen aus natürlichem Bienenwachs. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-gruen-rotblumen.webp', price:25},
  {id:'c5', cat:'kerze', slug:'kerze-orange-quadrat', label:'Kerze', name:'Kerze Orange Quadrat', tagline:'Gelwachs, quadratisches Glas',
   desc:'Klare Gelwachs-Kerze im quadratischen Glas mit orangefarbenem Dekor – das Licht scheint durch das Wachs hindurch. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-orange-quadrat.webp', price:29},
  {id:'c6', cat:'kerze', slug:'kerze-bernstein-rund', label:'Kerze', name:'Kerze Bernstein Rund', tagline:'Gelwachs, warmes Bernstein',
   desc:'Gelwachs-Kerze im runden Glas in warmem Bernsteinton. Ruhig, elegant, rund 35 Stunden Brenndauer.', image:'/images/kerze-bernstein-rund.webp', price:29},
  {id:'c7', cat:'kerze', slug:'kerze-zitrone-rund', label:'Kerze', name:'Kerze Zitrone Rund', tagline:'Bienenwachs, frisches Gelb',
   desc:'Rundes Glas mit Zitronen-Dekor – handgegossen aus natürlichem Bienenwachs. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-zitrone-rund.webp', price:25},
  {id:'c8', cat:'kerze', slug:'kerze-pink-quadrat', label:'Kerze', name:'Kerze Pink Quadrat', tagline:'Gelwachs, kräftiges Pink',
   desc:'Gelwachs-Kerze im quadratischen Glas mit pinkfarbenem Dekor. Ein Farbtupfer für Regal und Tisch. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-pink-quadrat.webp', price:29},
  {id:'c9', cat:'kerze', slug:'kerze-pink-herz', label:'Kerze', name:'Kerze Pink Herz', tagline:'Gelwachs, Herzform',
   desc:'Gelwachs-Kerze in Herzform mit pinkfarbenem Dekor – als Geschenk oder für den besonderen Abend. Ca. 35 Stunden Brenndauer.', image:'/images/kerze-pink-herz.webp', price:29},

  // ── SETS ──
  {
    id:'set-k3', cat:'set', slug:'kerzenhalter-3er-set', label:'Set',
    name:'Kerzenhalter 3er-Set',
    tagline:'Drei Flaschen mit Kerzenaufsatz – Wachskerzen inklusive',
    desc:'Drei gravierte Flaschen mit Kerzenaufsatz und Wachskerze – als Trio auf dem Esstisch, der Fensterbank oder dem Sideboard. Im Set 7,70 € günstiger als drei einzelne Flaschen mit Kerzenaufsatz.',
    badge:'Set-Vorteil',
    image:'/images/kerzenhalter_set_3er_02.webp',
    price:109
  },
  {
    id:'set-duo', cat:'set', slug:'duo-set-flasche-xl', label:'Set',
    name:'Duo-Set Flasche XL',
    tagline:'Zwei große Weinflaschen – hell und dunkel',
    desc:'Die große Weinflasche XL in beiden Ausführungen: einmal klares Glas, einmal dunkles Olivglas. Zusammen ein Paar mit Kontrast. Den Aufsatz wählst du für beide Flaschen gemeinsam.',
    image:'/images/weinflasche-duo.webp',
    aufsatzBilder:{korken:'/images/weinflasche-duo.webp'},
    price:44.90, addons:BOTTLE_DUO_ADDONS
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {SHOP_EMAIL, ORDER_ENDPOINT, PAYPAL_CLIENT_ID, SHIPPING, FREE_SHIPPING_FROM, BOTTLE_BASE, CATEGORIES, PRODUCTS, AUFSATZ_BEISPIEL, AUFSATZ_ICONS, BOTTLE_ADDONS};
}
