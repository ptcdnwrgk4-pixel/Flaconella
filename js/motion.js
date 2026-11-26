// ── FLACONELLA · BEWEGUNG ──
// Alles, was sich auf der Seite bewegt und nicht zum Einkaufen gehört: Kopfzeile, Einblenden beim Scrollen,
// Lichtpunkte im Hero, Laufband, Aufsatz-Wechsler, Zeiger-Etikett. Keine fremden Bibliotheken.
// Wer im Gerät „Bewegung reduzieren“ eingestellt hat, bekommt die ruhige Fassung: Die Klasse „motion“
// am <html> fehlt dann, und dieses Skript lässt alles stehen. Bedienbar bleibt trotzdem alles.
(function(){
  'use strict';
  const root = document.documentElement;
  const MOTION = root.classList.contains('motion');
  const FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));

  // ── Kopfzeile, Fortschritt, Knopf nach oben ──
  const header = $('.site-header'), toTop = $('.to-top');
  let lastY = window.scrollY, ticking = false;
  function onScroll(){
    ticking = false;
    const y = window.scrollY, max = Math.max(1, root.scrollHeight - window.innerHeight);
    root.style.setProperty('--progress', Math.min(1, Math.max(0, y / max)).toFixed(4));
    if(header){
      header.classList.toggle('is-top', y < 8);
      header.classList.toggle('is-scrolled', y > 40);
      if(MOTION && !$('#siteNav.open')){
        if(y > lastY + 4 && y > 360) header.classList.add('is-hidden');
        else if(y < lastY - 4 || y <= 360) header.classList.remove('is-hidden');
      }
    }
    if(toTop) toTop.classList.toggle('on', y > 700);
    boostMarquee(Math.abs(y - lastY));
    lastY = y;
  }
  window.addEventListener('scroll', () => { if(!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  if(header) header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  if(toTop) toTop.addEventListener('click', () => window.scrollTo({top:0, behavior: MOTION ? 'smooth' : 'auto'}));

  // ── Einblenden beim Scrollen ──
  if(MOTION && 'IntersectionObserver' in window){
    root.classList.add('motion-ready');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -7% 0px', threshold:0.06});
    $$('[data-reveal],[data-split="scroll"],.steps,.footer-word').forEach(el => io.observe(el));
  }

  // ── Laufband: läuft von selbst (CSS) und zieht beim Scrollen kurz an ──
  let mqAnim = null, mqRate = 1, mqRaf = 0;
  function boostMarquee(delta){
    if(!MOTION || delta < 2) return;
    if(!mqAnim){
      const track = $('.marquee-track');
      mqAnim = track && track.getAnimations ? track.getAnimations()[0] : null;
      if(!mqAnim) return;
    }
    mqRate = Math.min(7, Math.max(mqRate, 1 + delta / 9));
    if(!mqRaf) mqRaf = requestAnimationFrame(easeMarquee);
  }
  function easeMarquee(){
    mqRate += (1 - mqRate) * 0.06;
    if(mqRate < 1.02) mqRate = 1;
    try { mqAnim.playbackRate = mqRate; } catch(e) {}
    mqRaf = mqRate > 1 ? requestAnimationFrame(easeMarquee) : 0;
  }

  // ── Hero: Lichtpunkte wie eine Lichterkette, dazu sanfte Verschiebung mit dem Mauszeiger ──
  const shell = $('.hero-shell'), canvas = $('.hero-lights');
  if(MOTION && shell && canvas && canvas.getContext){
    const ctx = canvas.getContext('2d');
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    const sc = sprite.getContext('2d');
    const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,238,196,1)'); grad.addColorStop(0.22, 'rgba(236,206,142,.6)'); grad.addColorStop(1, 'rgba(196,169,106,0)');
    sc.fillStyle = grad; sc.fillRect(0, 0, 64, 64);
    const count = window.innerWidth < 900 ? 14 : 32;
    const parts = [];
    let w = 0, h = 0, raf = 0, visible = false, last = 0, tx = 0, ty = 0, px = 0, py = 0;
    function resize(){
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(p, first){
      p.z = Math.random();                               // 0 = fern und klein, 1 = nah und groß
      p.r = 2.5 + p.z * p.z * 30;
      p.x = w * (Math.random() < 0.7 ? 0.38 + Math.random() * 0.62 : Math.random());
      p.y = first ? Math.random() * h : h + p.r * 2;
      p.vy = 5 + p.z * 13;
      p.sway = Math.random() * 6.283; p.swaySpeed = 0.25 + Math.random() * 0.5;
      p.tw = Math.random() * 6.283; p.twSpeed = 0.5 + Math.random() * 1.6;
      p.alpha = 0.1 + (1 - p.z) * 0.5;
    }
    function frame(now){
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      shell.style.setProperty('--px', px.toFixed(3)); shell.style.setProperty('--py', py.toFixed(3));
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for(let i = 0; i < parts.length; i++){
        const p = parts[i];
        p.y -= p.vy * dt; p.sway += p.swaySpeed * dt; p.tw += p.twSpeed * dt;
        if(p.y < -p.r * 2) spawn(p, false);
        const x = p.x + Math.sin(p.sway) * 16 * (0.3 + p.z) + px * (8 + p.z * 34);
        const y = p.y + py * (5 + p.z * 22);
        ctx.globalAlpha = p.alpha * (0.62 + 0.38 * Math.sin(p.tw));
        ctx.drawImage(sprite, x - p.r, y - p.r, p.r * 2, p.r * 2);
      }
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function start(){ if(!raf && visible && !document.hidden){ last = performance.now(); raf = requestAnimationFrame(frame); } }
    resize();
    for(let i = 0; i < count; i++){ const p = {}; spawn(p, true); parts.push(p); }
    canvas.classList.add('on');
    new IntersectionObserver(es => { visible = es[0].isIntersecting; start(); }).observe(shell);
    document.addEventListener('visibilitychange', start);
    let resizeT = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); });
    if(FINE) shell.addEventListener('pointermove', e => {
      const r = shell.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, {passive:true});
    shell.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }

  // ── Aufsatz-Wechsler: fünf Aufsätze, ein Foto-Fenster ──
  $$('[data-aufsatz]').forEach(box => {
    const rows = $$('.aufsatz-row', box), shots = $$('.aufsatz-shot', box);
    if(!rows.length) return;
    let index = 0;
    function show(n, manual){
      index = (n + rows.length) % rows.length;
      rows.forEach((r, k) => { r.classList.toggle('on', k === index); r.setAttribute('aria-selected', k === index ? 'true' : 'false'); r.tabIndex = k === index ? 0 : -1; });
      shots.forEach((s, k) => s.classList.toggle('on', k === index));
      if(manual) box.classList.remove('auto');
    }
    rows.forEach((r, k) => {
      r.addEventListener('click', () => show(k, true));
      r.addEventListener('keydown', e => {
        if(e.key === 'ArrowDown' || e.key === 'ArrowRight'){ e.preventDefault(); show(index + 1, true); rows[index].focus(); }
        if(e.key === 'ArrowUp' || e.key === 'ArrowLeft'){ e.preventDefault(); show(index - 1, true); rows[index].focus(); }
      });
      const bar = $('.bar', r);
      if(bar) bar.addEventListener('animationend', () => { if(box.classList.contains('auto') && r.classList.contains('on')) show(index + 1, false); });
    });
    if(MOTION && 'IntersectionObserver' in window){
      box.classList.add('auto', 'paused');
      new IntersectionObserver(es => box.classList.toggle('paused', !es[0].isIntersecting), {threshold:0.3}).observe(box);
    }
  });

  // ── Zeiger-Etikett über Produktfotos („Ansehen“) ──
  if(MOTION && FINE){
    const label = document.createElement('div');
    label.className = 'cursor-label'; label.setAttribute('aria-hidden', 'true');
    document.body.appendChild(label);
    let tx = 0, ty = 0, x = 0, y = 0, on = false, raf = 0;
    function loop(){
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      label.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      raf = (on || Math.abs(tx - x) + Math.abs(ty - y) > 0.5) ? requestAnimationFrame(loop) : 0;
    }
    function set(state){ on = state; label.classList.toggle('on', on); if(!raf) raf = requestAnimationFrame(loop); }
    document.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target && e.target.closest ? e.target.closest('[data-cursor]') : null;
      if(t){ label.textContent = t.getAttribute('data-cursor'); if(!on){ x = tx; y = ty; } }
      if(!!t !== on || raf === 0) set(!!t);
    }, {passive:true});
    window.addEventListener('scroll', () => { if(on) set(false); }, {passive:true});
    document.addEventListener('pointerdown', () => { if(on) set(false); });
    document.documentElement.addEventListener('pointerleave', () => { if(on) set(false); });
  }

  // ── Mauslicht auf Karten ──
  if(FINE) $$('[data-glow]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, {passive:true});
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
  });

  // ── Werkzeuge für das Shop-Skript ──
  // Zahl weich hoch- oder runterzählen (Preise)
  function tween(el, to, format){
    const from = parseFloat(el.dataset.v);
    el.dataset.v = String(to);
    cancelAnimationFrame(el._raf || 0);
    if(!MOTION || isNaN(from) || Math.abs(from - to) < 0.005){ el.textContent = format(to); return; }
    const t0 = performance.now(), dur = 450;
    (function step(now){
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = format(k < 1 ? from + (to - from) * e : to);
      if(k < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }
  // Foto fliegt vom Produktfenster in den Warenkorb
  function fly(rect, src, done){
    const btn = $('.cart-btn');
    if(!MOTION || !rect || !btn || !src || !document.body.animate){ done(); return; }
    if(header) header.classList.remove('is-hidden');
    const b = btn.getBoundingClientRect();
    const targetX = b.left + b.width / 2, targetY = Math.max(22, header ? header.offsetHeight / 2 : b.top + b.height / 2);
    const size = Math.min(rect.width, rect.height, 240);
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const img = new Image();
    img.className = 'fly-img'; img.alt = ''; img.src = src;
    img.style.cssText = 'left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px';
    document.body.appendChild(img);
    const dx = targetX - cx, dy = targetY - cy;
    const anim = img.animate([
      {transform:'translate(0,0) scale(1)', opacity:1, borderRadius:'0%'},
      {transform:'translate(' + dx * 0.55 + 'px,' + (dy * 0.25 - 50) + 'px) scale(.5)', opacity:1, borderRadius:'50%', offset:0.5},
      {transform:'translate(' + dx + 'px,' + dy + 'px) scale(.07)', opacity:0.35, borderRadius:'50%'}
    ], {duration:760, easing:'cubic-bezier(.5,0,.25,1)'});
    let finished = false;
    const end = () => { if(finished) return; finished = true; img.remove(); done(); };
    anim.onfinish = end; anim.oncancel = end; setTimeout(end, 1200);
  }
  // Bildwechsel mit Überblendung
  function swap(img, src){
    if(!img || !src) return;
    const same = img.getAttribute('src') === src;
    if(same) return;
    if(!MOTION || !img.animate){ img.src = src; return; }
    const out = img.animate([{opacity:1}, {opacity:0}], {duration:150, fill:'forwards'});
    out.onfinish = () => {
      img.src = src;
      const show = () => { out.cancel(); img.animate([{opacity:0, transform:'scale(1.05)'}, {opacity:1, transform:'none'}], {duration:520, easing:'cubic-bezier(.16,1,.3,1)'}); };
      if(img.decode) img.decode().then(show, show); else show();
    };
  }
  window.FLMotion = {on: MOTION, tween: tween, fly: fly, swap: swap};

  onScroll();
})();
