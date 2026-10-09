// ── FLACONELLA SHOP ──
// Läuft auf jeder Seite. Produktdaten kommen aus /js/products.js (vorher eingebunden).
// Warenkorb liegt im Browser-Speicher (localStorage) und überlebt den Seitenwechsel.

// ── HELPERS ──
function fmt(n){ return n.toFixed(2).replace('.',',') + ' €'; }
function esc(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function defaultAddons(p){ return (p.addons || []).map(g => g.type === 'single' ? [0] : []); }
function chosenAddons(p, sel){
  const out = [];
  (p.addons || []).forEach((g, gi) => {
    (sel[gi] || []).forEach(oi => { const o = g.options[oi]; if(o && o.price > 0) out.push({name:o.name, price:o.price}); });
  });
  return out;
}
function unitPrice(p, addons){ return p.price + addons.reduce((s,a)=>s+a.price,0); }
function hasPaidAddons(p){ return (p.addons || []).some(g => g.options.some(o => o.price > 0)); }
function productsIn(cat){ return PRODUCTS.filter(p => p.cat === cat); }
function catOf(p){ return CATEGORIES.find(c => c.key === p.cat); }
function productUrl(p){ const c = catOf(p); return c ? `/${c.slug}/#${p.slug}` : '/'; }

function getNote(p){
  if(p.note) return p.note;
  if(p.cat === 'windlicht' || p.cat === 'kerze' || p.id === 'set-k3')
    return 'Sicherheitshinweis: Bei Verwendung mit echten Teelichtern oder Kerzen nie unbeaufsichtigt brennen lassen – das Glas wird heiß. Nicht für Kinder geeignet. Handgefertigtes Glas, Kanten können scharf sein.';
  return 'Sicherheitshinweis: Handgefertigt aus geschnittenem Glas – Kanten können scharf sein. Mit Kerzenaufsatz nie unbeaufsichtigt brennen lassen. Nicht für Kinder geeignet.';
}

// ── WARENKORB (Speicher) ──
function loadCart(){
  let raw = [];
  try { raw = JSON.parse(localStorage.getItem('flaconella_cart') || '[]'); } catch(e) { raw = []; }
  if(!Array.isArray(raw)) return [];
  const out = [];
  raw.forEach(i => {
    if(!i || typeof i !== 'object') return;
    const p = PRODUCTS.find(x => x.id === i.productId);
    if(!p) return;
    const option = (p.option && p.option.choices.indexOf(i.option) !== -1) ? i.option : (p.option ? p.option.choices[0] : '');
    const names = Array.isArray(i.addons) ? i.addons.map(a => a && a.name) : [];
    const addons = [];
    (p.addons || []).forEach(g => g.options.forEach(o => { if(o.price > 0 && names.indexOf(o.name) !== -1) addons.push({name:o.name, price:o.price}); }));
    const qty = Math.min(20, Math.max(1, Math.round(Number(i.qty) || 1)));
    const key = p.id + '|' + option + '|' + addons.map(a=>a.name).join(',');
    const existing = out.find(x => x.key === key);
    if(existing){ existing.qty = Math.min(20, existing.qty + qty); return; }
    out.push({key, productId:p.id, option, addons, qty, name:p.name, base:p.price, price:unitPrice(p, addons)});
  });
  return out;
}
let cart = loadCart();
let shippingKey = 'versand';
function saveCart(){ try { localStorage.setItem('flaconella_cart', JSON.stringify(cart)); } catch(e) {} }
function cartSubtotal(){ return cart.reduce((s,i)=>s+i.price*i.qty,0); }
function shippingCost(key){
  const opt = SHIPPING[key] || SHIPPING.versand;
  if(opt.price > 0 && FREE_SHIPPING_FROM > 0 && cartSubtotal() >= FREE_SHIPPING_FROM) return 0;
  return opt.price;
}
function cartTotal(key){ return cartSubtotal() + shippingCost(key); }
function newOrderNo(){
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'FL-' + ymd + '-' + String(Math.floor(1000 + Math.random()*9000));
}
function itemDetails(item){
  const parts = [];
  if(item.option) parts.push(item.option);
  item.addons.forEach(a => parts.push(a.name));
  return parts;
}

// ── FENSTER ──
// Alle Fenster (Produkt, Kasse, Erfolg) laufen über denselben Mechanismus: öffnen = Verlaufseintrag,
// schließen = zurück im Verlauf. So stimmen Zurück-Taste, Escape und ✕ überein.
const overlayStack = [];
function syncScrollLock(){
  const anyOpen = document.querySelector('.modal-overlay.open') || document.getElementById('cartSidebar').classList.contains('open');
  document.body.style.overflow = anyOpen ? 'hidden' : '';
}
function openOverlay(id){
  const el = document.getElementById(id);
  if(!el || el.classList.contains('open')) return;
  el.classList.add('open'); overlayStack.push(id); syncScrollLock();
  history.pushState({modal:id}, '');
}
function swapOverlay(fromId, toId){
  const from = document.getElementById(fromId), to = document.getElementById(toId);
  if(from && from.classList.contains('open')){
    from.classList.remove('open');
    const i = overlayStack.lastIndexOf(fromId); if(i !== -1) overlayStack.splice(i, 1);
  }
  to.classList.add('open'); overlayStack.push(toId); syncScrollLock();
  if(history.state && history.state.modal === fromId) history.replaceState({modal:toId}, '');
  else history.pushState({modal:toId}, '');
}
function closeOverlay(id, viaHistory){
  const el = document.getElementById(id);
  if(!el || !el.classList.contains('open')) return;
  el.classList.remove('open');
  const i = overlayStack.lastIndexOf(id); if(i !== -1) overlayStack.splice(i, 1);
  syncScrollLock();
  if(!viaHistory && history.state && history.state.modal === id) history.back();
}
window.addEventListener('popstate', function(){
  const st = history.state || {};
  document.querySelectorAll('.modal-overlay.open').forEach(el => { if(el.id !== st.modal) closeOverlay(el.id, true); });
  if(st.modal === 'productModal' && currentProduct && !document.getElementById('productModal').classList.contains('open')){
    document.getElementById('productModal').classList.add('open'); overlayStack.push('productModal'); syncScrollLock();
  }
});

// ── PRODUKT-FENSTER ──
let currentProduct = null;
let sel = {option:0, addons:[], qty:1};

function openProduct(id){
  const p = PRODUCTS.find(x => x.id === id || x.slug === id);
  if(!p) return;
  currentProduct = p;
  sel = {option:0, addons:defaultAddons(p), qty:1};
  renderModal();
  const modal = document.getElementById('productModal');
  if(modal.classList.contains('open')) document.getElementById('modalContent').scrollTop = 0;
  else openOverlay('productModal');
}
function closeModal(){ closeOverlay('productModal'); }

function renderModal(){
  const p = currentProduct;
  const imgDiv = document.getElementById('modalImg');
  imgDiv.innerHTML = '';
  const gallery = (p.gallery && p.gallery.length) ? p.gallery : (p.image ? [p.image] : []);
  if(gallery.length){
    const main = document.createElement('img');
    main.className = 'modal-main-img'; main.alt = p.name; main.src = gallery[0];
    imgDiv.appendChild(main);
    if(gallery.length > 1){
      const strip = document.createElement('div'); strip.className = 'modal-thumbs';
      gallery.forEach((src, idx) => {
        const t = document.createElement('img');
        t.className = 'modal-thumb' + (idx===0 ? ' active' : ''); t.alt = p.name + ' Ansicht ' + (idx+1); t.src = src;
        t.addEventListener('click', () => { main.src = src; strip.querySelectorAll('.modal-thumb').forEach(e=>e.classList.remove('active')); t.classList.add('active'); });
        strip.appendChild(t);
      });
      imgDiv.appendChild(strip);
    }
  }
  document.getElementById('modalInfo').innerHTML = `
    <div>
      <div class="modal-cat"><span class="eyebrow">${esc(p.label)}</span>${p.badge ? `<span class="modal-badge">${esc(p.badge)}</span>` : ''}</div>
      <h2 class="modal-name" id="modalTitle">${esc(p.name)}</h2>
    </div>
    <p class="modal-tagline">${esc(p.tagline)}</p>
    <p class="modal-desc">${esc(p.desc)}</p>
    <div id="modalOptions"></div>
    <div class="buy-row">
      <div class="qty-picker" aria-label="Anzahl">
        <button type="button" class="qty-btn" onclick="modalQty(-1)" aria-label="Weniger">−</button>
        <span class="qty-num" id="modalQty">1</span>
        <button type="button" class="qty-btn" onclick="modalQty(1)" aria-label="Mehr">+</button>
      </div>
      <div class="modal-price-box"><span class="modal-price" id="modalPrice"></span><span class="modal-breakdown" id="modalBreakdown"></span></div>
    </div>
    <button type="button" class="btn modal-add-btn" id="modalAddBtn" onclick="addToCart()">In den Warenkorb</button>
    <button type="button" class="btn-ghost modal-express-btn" onclick="buyNow()">Direkt zur Kasse</button>
    <ul class="modal-notes">
      <li>Versand ${fmt(SHIPPING.versand.price)} mit DHL · 3–5 Werktage nach Zahlungseingang</li>
      <li>Abholung im Padella Vino, Markt 8, Dieburg kostenlos</li>
      <li>Unikat: Form und Gravur weichen leicht vom Foto ab</li>
    </ul>
    <p class="modal-note">${esc(getNote(p))}</p>`;
  renderOptions();
  updateModalPrice();
}

function renderOptions(){
  const p = currentProduct;
  let html = '';
  if(p.option){
    html += `<div class="opt-group"><div class="opt-head"><span>${esc(p.option.label)}</span></div><div class="tiles">
      ${p.option.choices.map((c,i)=>`<button type="button" class="tile radio ${i===sel.option?'on':''}" onclick="pickOption(${i})" aria-pressed="${i===sel.option}"><span class="l">${esc(c)}</span><span class="mark"></span></button>`).join('')}
    </div></div>`;
  }
  (p.addons || []).forEach((g, gi) => {
    const single = g.type === 'single';
    html += `<div class="opt-group"><div class="opt-head"><span>${esc(g.label)}</span><small>${single ? 'genau eine Wahl' : 'optional'}</small></div><div class="tiles list">
      ${g.options.map((o, oi) => {
        const on = (sel.addons[gi] || []).indexOf(oi) !== -1;
        const ptxt = o.price > 0 ? '+ ' + fmt(o.price) : (o.note || 'inklusive');
        return `<button type="button" class="tile ${single?'radio':''} ${on?'on':''}" onclick="pickAddon(${gi},${oi})" aria-pressed="${on}"><span class="l"><span class="mark"></span>${esc(o.name)}</span><span class="r">${ptxt}</span></button>`;
      }).join('')}
    </div></div>`;
  });
  const box = document.getElementById('modalOptions');
  box.innerHTML = html;
  box.style.display = html ? 'flex' : 'none';
  box.style.flexDirection = 'column'; box.style.gap = '20px';
}
function pickOption(i){ sel.option = i; renderOptions(); }
function pickAddon(gi, oi){
  const g = currentProduct.addons[gi];
  if(g.type === 'single') sel.addons[gi] = [oi];
  else { const cur = sel.addons[gi] || []; sel.addons[gi] = cur.indexOf(oi) === -1 ? cur.concat([oi]) : cur.filter(i => i !== oi); }
  renderOptions(); updateModalPrice();
}
function modalQty(d){ sel.qty = Math.min(20, Math.max(1, sel.qty + d)); document.getElementById('modalQty').textContent = sel.qty; updateModalPrice(); }
function updateModalPrice(){
  const p = currentProduct;
  const addons = chosenAddons(p, sel.addons);
  const unit = unitPrice(p, addons), sum = unit * sel.qty;
  document.getElementById('modalPrice').textContent = fmt(sum);
  const parts = [`${p.label} ${fmt(p.price)}`].concat(addons.map(a => `${a.name} ${fmt(a.price)}`));
  document.getElementById('modalBreakdown').textContent = (sel.qty > 1 ? `${sel.qty} × ${fmt(unit)} · ` : '') + parts.join(' + ') + ' · inkl. MwSt.';
  document.getElementById('modalAddBtn').textContent = `In den Warenkorb · ${fmt(sum)}`;
}
function addToCart(){
  const p = currentProduct;
  addItemToCart(p, p.option ? p.option.choices[sel.option] : '', chosenAddons(p, sel.addons), sel.qty);
  showToast(sel.qty === 1 ? `${p.name} hinzugefügt` : `${sel.qty} × ${p.name} hinzugefügt`);
  closeModal();
  setTimeout(openCart, 250);
}
function buyNow(){
  const p = currentProduct;
  addItemToCart(p, p.option ? p.option.choices[sel.option] : '', chosenAddons(p, sel.addons), sel.qty);
  openCheckout('productModal');
}
function addItemToCart(product, option, addons, qty){
  const key = product.id + '|' + option + '|' + addons.map(a=>a.name).join(',');
  const existing = cart.find(i=>i.key===key);
  if(existing) existing.qty = Math.min(20, existing.qty + qty);
  else cart.push({key, productId:product.id, option, addons, qty, name:product.name, base:product.price, price:unitPrice(product, addons)});
  saveCart(); updateCartUI();
}

// ── WARENKORB (Seitenleiste) ──
function updateCartUI(){
  const total = cartSubtotal();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('.cart-badge').forEach(b => { b.textContent = count; b.classList.toggle('visible', count>0); });
  document.getElementById('cartTotal').textContent = fmt(total);
  document.getElementById('checkoutBtn').disabled = count===0;
  const sc = shippingCost('versand');
  document.getElementById('cartNote').textContent = sc > 0 ? `inkl. MwSt. · zzgl. Versand ${fmt(sc)} oder kostenlose Abholung in Dieburg` : 'inkl. MwSt. · versandkostenfrei';
  updateExpressVisibility();
  const container = document.getElementById('cartItems');
  if(cart.length===0){ container.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🍾</div><p>Noch leer</p></div>'; return; }
  container.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(x=>x.id===item.productId);
    const details = itemDetails(item);
    return `<div class="cart-item">
      <div class="cart-item-img">${p && p.image ? `<img src="${p.image}" alt="">` : '🍾'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}</div>
        ${details.length ? `<div class="cart-item-variant">${esc(details.join(' · '))}</div>` : ''}
        ${item.addons.length ? `<div class="cart-item-engraving">${fmt(item.base)} + Zubehör ${fmt(item.price - item.base)}</div>` : ''}
        <div class="cart-item-price">${fmt(item.price*item.qty)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item.key}',-1)" aria-label="Weniger">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.key}',1)" aria-label="Mehr">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeItem('${item.key}')" aria-label="Entfernen">✕</button>
    </div>`;
  }).join('');
}
function changeQty(key, delta){
  const item = cart.find(i=>i.key===key); if(!item) return;
  item.qty = Math.min(20, item.qty + delta);
  if(item.qty <= 0) cart = cart.filter(i=>i.key!==key);
  saveCart(); updateCartUI();
}
function removeItem(key){ cart = cart.filter(i=>i.key!==key); saveCart(); updateCartUI(); }
function openCart(){ document.getElementById('cartOverlay').classList.add('open'); document.getElementById('cartSidebar').classList.add('open'); syncScrollLock(); }
function closeCart(){ document.getElementById('cartOverlay').classList.remove('open'); document.getElementById('cartSidebar').classList.remove('open'); syncScrollLock(); }

// ── KASSE ──
function renderShipOptions(){
  document.getElementById('shipOptions').innerHTML = Object.keys(SHIPPING).map(k => {
    const o = SHIPPING[k]; const cost = shippingCost(k);
    return `<button type="button" class="tile radio ${k===shippingKey?'on':''}" onclick="setShipping('${k}')" aria-pressed="${k===shippingKey}">
      <span class="l"><span class="mark"></span><span>${esc(o.label)}${o.note ? `<small>${esc(o.note)}</small>` : ''}</span></span>
      <span class="r">${cost>0 ? fmt(cost) : 'kostenlos'}</span></button>`;
  }).join('');
}
function setShipping(key){
  if(!SHIPPING[key]) return;
  shippingKey = key;
  renderShipOptions();
  const pickup = key === 'abholung';
  ['co-street','co-zip','co-city'].forEach(id => {
    const el = document.getElementById(id); el.required = !pickup;
    const lab = document.getElementById(id + '-label'); if(lab) lab.textContent = lab.textContent.replace(/ \*$/, '') + (pickup ? '' : ' *');
  });
  document.getElementById('addressFields').style.opacity = pickup ? '0.55' : '';
  renderCheckoutSummary();
}
function renderCheckoutSummary(){
  const sub = cartSubtotal(), ship = shippingCost(shippingKey), total = cartTotal(shippingKey);
  const lines = cart.map(i => {
    const p = PRODUCTS.find(x=>x.id===i.productId); const details = itemDetails(i);
    return `<div class="co-line">
      ${p && p.image ? `<img src="${p.image}" alt="">` : '<span></span>'}
      <div><span class="n">${esc(i.name)}</span>${details.length ? `<span class="d">${esc(details.join(' · '))}</span>` : ''}<span class="d">${i.qty} × ${fmt(i.price)}</span></div>
      <span class="p">${fmt(i.price*i.qty)}</span></div>`;
  }).join('');
  document.getElementById('checkoutSummary').innerHTML = lines + `<div class="co-sums">
    <div><span>Zwischensumme</span><span>${fmt(sub)}</span></div>
    <div><span>${SHIPPING[shippingKey].price === 0 ? 'Abholung' : 'Versand (DHL)'}</span><span>${ship > 0 ? fmt(ship) : 'kostenlos'}</span></div></div>`;
  document.getElementById('checkoutFinal').innerHTML = `<span>Gesamt<small>inkl. MwSt.${ship > 0 ? ' und Versand' : ', Abholung'}</small></span><strong>${fmt(total)}</strong>`;
}
function openCheckout(fromId){
  closeCart();
  if(!cart.length) return;
  setShipping(shippingKey);
  if(fromId) swapOverlay(fromId, 'checkoutModal'); else openOverlay('checkoutModal');
  renderPayPalButton('paypalCheckout');
  updateExpressVisibility();
}
function closeCheckout(){ closeOverlay('checkoutModal'); }

function orderLinesText(){
  return cart.map(i => { const d = itemDetails(i); return `${i.qty}x ${i.name}${d.length ? ' (' + d.join(', ') + ')' : ''}: ${i.price.toFixed(2)}€ x ${i.qty} = ${(i.price*i.qty).toFixed(2)}€`; }).join('\n');
}
function mailtoLink(subject, body){ return 'mailto:' + SHOP_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
let lastOrderText = '';
function openMail(link){
  const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
}
function copyOrderText(){
  if(!lastOrderText) return;
  const done = () => showToast('Bestelltext kopiert');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastOrderText).then(done, () => fallbackCopy(done));
  else fallbackCopy(done);
}
function fallbackCopy(done){
  const ta = document.createElement('textarea'); ta.value = lastOrderText; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch(e) {}
  ta.remove();
}
// An order.php senden (JSON). Wirft bei Fehler – der Aufrufer zeigt dann den Mail-Fallback.
async function sendToShop(fields){
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(ORDER_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(fields), signal:ctrl.signal});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json().catch(() => ({}));
    if(data.success !== true) throw new Error(data.message || 'Senden fehlgeschlagen');
    return data;
  } finally { clearTimeout(timer); }
}
function nextStepsBlock(paid, pickup){
  const last = pickup
    ? '<li>Wir sagen dir per E-Mail Bescheid, sobald deine Bestellung im Padella Vino, Markt 8, Dieburg (Mo–Sa) abholbereit ist.</li>'
    : '<li>Nach Zahlungseingang versenden wir innerhalb von 3–5 Werktagen.</li>';
  return `<div class="next-steps"><div class="pay-method-title">So geht es weiter</div><ol>
    ${paid ? '<li>Deine Zahlung über PayPal ist bei uns eingegangen.</li><li>Du erhältst in Kürze Bestellbestätigung und Rechnung per E-Mail.</li>'
           : '<li>Wir prüfen deine Bestellung.</li><li>Du erhältst in Kürze eine Bestätigung mit den Zahlungsdaten per E-Mail.</li>'}
    ${pickup && paid ? '<li>Wir sagen dir Bescheid, sobald deine Bestellung im Padella Vino abholbereit ist.</li>' : last}
  </ol></div>`;
}
function openSuccess(title, html, boxHtml){
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successText').innerHTML = html;
  document.getElementById('successPayment').innerHTML = boxHtml;
  closeCart();
  if(document.getElementById('checkoutModal').classList.contains('open')) swapOverlay('checkoutModal', 'successModal');
  else openOverlay('successModal');
}
function mailBlock(link, label){
  return `<div class="pay-method"><div class="pay-method-title">${label}</div><div class="pay-method-body">
    <div class="mail-actions"><a class="pay-paypal-btn" href="${link}" target="_blank" rel="noopener">Bestellung per E-Mail senden</a>
    <button type="button" class="copy-btn" onclick="copyOrderText()">Bestelltext kopieren</button></div>
    <details class="order-details"><summary>Bestelltext anzeigen</summary><pre id="orderText"></pre></details></div></div>`;
}
function closeSuccess(){ closeOverlay('successModal'); }

async function submitOrder(e){
  e.preventDefault();
  const form = e.target; const btn = form.querySelector('.checkout-submit');
  const v = id => document.getElementById(id).value.trim();
  const fname = v('co-fname'), lname = v('co-lname'), email = v('co-email'), phone = v('co-phone'), street = v('co-street'), zip = v('co-zip'), city = v('co-city');
  const sub = cartSubtotal(), ship = shippingCost(shippingKey), total = cartTotal(shippingKey);
  const shipLabel = SHIPPING[shippingKey].label + (ship > 0 ? ` (${fmt(ship)})` : ' (kostenlos)');
  const pickup = shippingKey === 'abholung';
  const name = `${fname} ${lname}`; const orderNo = newOrderNo(); const lines = orderLinesText();
  const addrText = pickup ? 'Abholung – keine Lieferadresse' : `${street}\n${zip} ${city}\nDeutschland`;
  const body = `Bestellung ${orderNo} von ${name}\nE-Mail: ${email}\nTelefon: ${phone}\n\nLieferung: ${shipLabel}\nAdresse:\n${addrText}\n\nBestellung:\n${lines}\n\nZwischensumme: ${sub.toFixed(2)}€\nVersand: ${ship.toFixed(2)}€\nGesamtbetrag: ${total.toFixed(2)}€\nZahlung: Überweisung (Zahlungsdaten folgen per Bestätigungsmail)`;
  lastOrderText = `An: ${SHOP_EMAIL}\nBetreff: Bestellung ${orderNo} von ${name}\n\n${body}`;
  const link = mailtoLink(`Bestellung ${orderNo} von ${name}`, body);
  btn.disabled = true; const oldLabel = btn.textContent; btn.textContent = 'Wird gesendet …';
  try {
    await sendToShop({
      _subject: `Neue Bestellung ${orderNo} von ${name} – ${fmt(total)}`, _replyto: email,
      _autoresponse: `Danke für deine Bestellung bei Flaconella!\n\nBestellnummer: ${orderNo}\n${pickup ? 'Abholung im Padella Vino, Markt 8, Dieburg' : 'Lieferung an: ' + street + ', ' + zip + ' ' + city}\n\n${lines}\n\nGesamtbetrag: ${fmt(total)} (inkl. MwSt.${ship > 0 ? ', inkl. Versand ' + fmt(ship) : ''})\n\nWir haben deine Bestellung erhalten und melden uns in Kürze mit der Bestätigung und den Zahlungsdaten für die Überweisung.\n\nFlaconella · Padella Vino · Sonja Peters · Markt 8 · 64807 Dieburg · hallo@flaconella.de`,
      email, Bestellnummer: orderNo, Name: name, 'E-Mail': email, Telefon: phone, Lieferung: shipLabel,
      Adresse: pickup ? 'Abholung' : `${street}, ${zip} ${city}, Deutschland`, Bestellung: lines,
      Zwischensumme: fmt(sub), Versand: ship > 0 ? fmt(ship) : 'kostenlos (Abholung)', Gesamtbetrag: fmt(total),
      Zahlung: 'Überweisung – Zahlungsdaten per Bestätigungsmail'
    });
    cart = []; saveCart(); updateCartUI(); form.reset();
    openSuccess('Bestellung abgeschlossen!', `Danke, ${esc(fname)}! Deine Bestellnummer ist <span class="order-no">${orderNo}</span>. Du erhältst in Kürze eine Bestätigung mit den Zahlungsdaten an <strong>${esc(email)}</strong>.`, nextStepsBlock(false, pickup));
  } catch(err) {
    console.error('Bestellung senden', err);
    openSuccess('Fast geschafft!', 'Die automatische Übermittlung hat gerade nicht geklappt. Bitte schick uns deine Bestellung per E-Mail – der Button öffnet dein Mail-Programm mit allen Daten. Dein Warenkorb bleibt so lange erhalten.', `<div class="pay-box">${mailBlock(link, 'Bestellung abschicken')}</div>`);
    document.getElementById('orderText').textContent = lastOrderText;
  } finally { btn.disabled = false; btn.textContent = oldLabel; }
}

// ── PAYPAL EXPRESS-CHECKOUT ──
let paypalLoaded = false, paypalPreview = false, paypalShipKey = 'versand';
const paypalRendered = {};
function initPayPal(){
  if(!PAYPAL_CLIENT_ID) return;
  const sc = document.createElement('script');
  sc.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(PAYPAL_CLIENT_ID) + '&currency=EUR&locale=de_DE&intent=capture&components=buttons&disable-funding=credit,paylater';
  sc.onload = () => { paypalLoaded = true; renderPayPalButton('paypalCart'); updateExpressVisibility(); };
  sc.onerror = () => {
    paypalLoaded = false;
    if(PAYPAL_CLIENT_ID === 'sb'){
      paypalPreview = true;
      ['paypalCart','paypalCheckout'].forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = '<div class="paypal-preview"><span>PayPal Express-Checkout</span><small>Vorschau – das PayPal-Skript kann in dieser Umgebung nicht geladen werden. Auf der echten Seite erscheint hier der PayPal-Button.</small></div>'; });
    }
    updateExpressVisibility();
  };
  document.head.appendChild(sc);
}
function updateExpressVisibility(){
  const show = (paypalLoaded || paypalPreview) && cart.length > 0;
  ['expressCart','expressCheckout','checkoutOr'].forEach(id => { const el = document.getElementById(id); if(el) el.hidden = !show; });
  document.querySelectorAll('.express-test').forEach(el => { el.hidden = PAYPAL_CLIENT_ID !== 'sb'; });
}
function paypalItems(){
  return cart.map(i => { const d = itemDetails(i); return {name:(i.name + (d.length ? ' – ' + d.join(', ') : '')).slice(0,127), unit_amount:{currency_code:'EUR', value:i.price.toFixed(2)}, quantity:String(i.qty), category:'PHYSICAL_GOODS'}; });
}
function renderPayPalButton(containerId){
  if(!paypalLoaded || !window.paypal || paypalRendered[containerId]) return;
  const el = document.getElementById(containerId); if(!el) return;
  paypalRendered[containerId] = true;
  window.paypal.Buttons({
    style:{layout:'vertical', color:'gold', shape:'rect', label:'checkout', tagline:false, height:44},
    createOrder:(data, actions) => {
      const key = containerId === 'paypalCheckout' ? shippingKey : 'versand'; const pickup = key === 'abholung';
      const sub = cartSubtotal().toFixed(2), ship = shippingCost(key).toFixed(2), total = cartTotal(key).toFixed(2);
      paypalShipKey = key;
      return actions.order.create({intent:'CAPTURE', purchase_units:[{description:'Flaconella – handgefertigte Deko aus recycelten Flaschen', amount:{currency_code:'EUR', value:total, breakdown:{item_total:{currency_code:'EUR', value:sub}, shipping:{currency_code:'EUR', value:ship}}}, items:paypalItems()}],
        application_context:{brand_name:'Flaconella', shipping_preference: pickup ? 'NO_SHIPPING' : 'GET_FROM_FILE', user_action:'PAY_NOW', locale:'de-DE'}});
    },
    onApprove:(data, actions) => actions.order.capture().then(finishPayPalOrder).catch(err => {
      const code = err && err.details && err.details[0] && err.details[0].issue;
      if(code === 'INSTRUMENT_DECLINED') return actions.restart();
      console.error('PayPal capture', err); showToast('Zahlung nicht abgeschlossen – bitte erneut versuchen oder per Überweisung bestellen');
    }),
    onError:(err) => { console.error('PayPal', err); showToast('PayPal gerade nicht möglich – bitte per Überweisung bestellen'); }
  }).render('#' + containerId);
}
function finishPayPalOrder(details){
  const pu = (details.purchase_units && details.purchase_units[0]) || {}; const shipInfo = pu.shipping || {}; const addr = shipInfo.address || {};
  const payer = details.payer || {}; const pname = payer.name || {};
  const custName = (shipInfo.name && shipInfo.name.full_name) ? shipInfo.name.full_name : `${pname.given_name || ''} ${pname.surname || ''}`.trim();
  const email = payer.email_address || '';
  const key = paypalShipKey, pickup = key === 'abholung';
  const sub = cartSubtotal(), ship = shippingCost(key), total = cartTotal(key); const orderNo = newOrderNo();
  const shipLabel = SHIPPING[key].label + (ship > 0 ? ` (${fmt(ship)})` : ' (kostenlos)');
  const addrLines = pickup ? 'Abholung – keine Lieferadresse' : [addr.address_line_1, addr.address_line_2, `${addr.postal_code || ''} ${addr.admin_area_2 || ''}`.trim(), addr.country_code].filter(Boolean).join('\n');
  const lines = orderLinesText();
  const body = `PayPal-Bestellung ${orderNo} von ${custName}\nPayPal-Transaktion: ${details.id}\nE-Mail: ${email}\n\nLieferung: ${shipLabel}\nAdresse (aus PayPal):\n${addrLines}\n\nBestellung:\n${lines}\n\nZwischensumme: ${sub.toFixed(2)}€\nVersand: ${ship.toFixed(2)}€\nGesamtbetrag: ${total.toFixed(2)}€ – bezahlt via PayPal`;
  lastOrderText = `An: ${SHOP_EMAIL}\nBetreff: PayPal-Bestellung ${orderNo} von ${custName}\n\n${body}`;
  const link = mailtoLink(`PayPal-Bestellung ${orderNo} von ${custName}`, body);
  const fields = {
    _subject: `Neue PayPal-Bestellung ${orderNo} von ${custName} – ${fmt(total)} (bezahlt)`, _replyto: email,
    _autoresponse: `Danke für deine Bestellung bei Flaconella!\n\nBestellnummer: ${orderNo}\nPayPal-Transaktion: ${details.id}\n${pickup ? 'Abholung im Padella Vino, Markt 8, Dieburg' : 'Lieferung an:\n' + addrLines}\n\n${lines}\n\nGesamtbetrag: ${fmt(total)} – bezahlt via PayPal\n\nBestellbestätigung und Rechnung schicken wir dir in Kürze per E-Mail.\n\nFlaconella · Padella Vino · Sonja Peters · Markt 8 · 64807 Dieburg · hallo@flaconella.de`,
    email, Bestellnummer: orderNo, 'PayPal-Transaktion': details.id, Name: custName, 'E-Mail': email, Lieferung: shipLabel,
    'Adresse (PayPal)': addrLines.replace(/\n/g, ', '), Bestellung: lines, Zwischensumme: fmt(sub), Versand: ship > 0 ? fmt(ship) : 'kostenlos (Abholung)', Gesamtbetrag: fmt(total),
    Zahlung: `PayPal – bezahlt, Transaktion ${details.id}`
  };
  cart = []; saveCart(); updateCartUI();
  openSuccess('Bezahlt – danke!', `Deine PayPal-Zahlung ist eingegangen. Deine Bestellnummer ist <span class="order-no">${orderNo}</span>. Du erhältst in Kürze Bestellbestätigung und Rechnung per E-Mail.`, nextStepsBlock(true, pickup));
  sendToShop(fields).catch(err => {
    console.error('PayPal-Bestellung senden', err);
    document.getElementById('successText').innerHTML += ' Die automatische Benachrichtigung an uns hat gerade nicht geklappt – bitte schick uns kurz die Bestätigung per E-Mail.';
    document.getElementById('successPayment').innerHTML = `<div class="pay-box">${mailBlock(link, 'Bestellbestätigung')}</div>` + nextStepsBlock(true, pickup);
    document.getElementById('orderText').textContent = lastOrderText;
  });
}

// ── KONTAKTFORMULAR ──
async function submitContact(e){
  e.preventDefault();
  const form = e.target; const btn = form.querySelector('.form-submit');
  const f = n => (form.querySelector(`[name="${n}"]`) || {}).value || '';
  const name = `${f('vorname')} ${f('nachname')}`.trim();
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Wird gesendet …';
  try {
    await sendToShop({_subject:`Kontaktanfrage: ${f('betreff')} – ${name}`, _replyto:f('email'), _gotcha:f('_gotcha'), Name:name, 'E-Mail':f('email'), Betreff:f('betreff'), Nachricht:f('nachricht')});
    showToast('Nachricht gesendet – wir melden uns bald!'); form.reset();
  } catch(err) {
    console.error('Kontakt senden', err);
    openMail(mailtoLink(`Kontaktanfrage: ${f('betreff')}`, `Von: ${name} <${f('email')}>\n\n${f('nachricht')}`));
    showToast('Senden nicht möglich – Mail-Programm geöffnet');
  } finally { btn.disabled = false; btn.textContent = old; }
}

// ── TOAST ──
function showToast(msg){
  document.getElementById('toastMsg').textContent = msg;
  const t = document.getElementById('toast'); t.classList.add('show');
  clearTimeout(showToast._t); showToast._t = setTimeout(()=>t.classList.remove('show'), 2800);
}

// ── MOBILE NAV ──
function toggleMobileMenu(force){
  const nav = document.getElementById('siteNav'); const btn = document.querySelector('.nav-burger');
  if(!nav || !btn) return;
  const open = typeof force === 'boolean' ? force : !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  document.body.style.overflow = open ? 'hidden' : '';
}
document.querySelectorAll('#siteNav a').forEach(a => a.addEventListener('click', () => toggleMobileMenu(false)));
window.addEventListener('resize', () => { if(window.innerWidth > 900) toggleMobileMenu(false); });

// ── TASTATUR ──
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){
    if(overlayStack.length) closeOverlay(overlayStack[overlayStack.length-1]); else closeCart();
    toggleMobileMenu(false);
  }
});

// ── START ──
history.replaceState(null, '');
updateCartUI();
initPayPal();
// Direktlink auf ein Produkt: /windlichter/#windlicht-traube
(function(){
  const slug = (location.hash || '').replace(/^#/, '');
  if(slug && PRODUCTS.some(p => p.slug === slug)) openProduct(slug);
})();
window.addEventListener('hashchange', () => {
  const slug = (location.hash || '').replace(/^#/, '');
  const open = document.getElementById('productModal').classList.contains('open');
  if(slug && PRODUCTS.some(p => p.slug === slug) && !(open && currentProduct && currentProduct.slug === slug)) openProduct(slug);
});
