/* Subuluk 3D: intro em que o logo é "impresso" camada por camada.
   Uso: <script src="logo-print.js"></script> dentro do <head> do index.html. */
(function () {
  'use strict';

  // Respeita quem prefere menos movimento: não mostra a animação.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DURATION = 4200;            // tempo da impressão (ms). Aumente para ficar mais lento.
  var TEXT = 'SUBULUK 3D';        // texto do logo
  var GREEN_CHARS = 7;            // quantas letras ficam verdes ("SUBULUK"); o resto fica branco
  var GREEN = '#39ff14', WHITE = '#f4f7f2';

  var css =
    '#print-intro{position:fixed;inset:0;z-index:9999;background:#090c09;transition:opacity .6s ease}' +
    '#print-intro canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '.pi-bed{position:absolute;height:2px;background:#2b372b;box-shadow:0 0 18px rgba(57,255,20,.25)}' +
    '.pi-gantry{position:absolute;left:0;top:0;width:100%;height:3px;background:linear-gradient(90deg,transparent,#3a4a3a 12%,#3a4a3a 88%,transparent);transition:opacity .4s}' +
    '.pi-nozzle{position:absolute;left:0;top:0;width:16px;height:28px;filter:drop-shadow(0 0 6px #39ff14);transition:opacity .4s}' +
    '.pi-status{position:absolute;left:0;right:0;bottom:64px;text-align:center;font:700 .72rem Arial,Helvetica,sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#aab4a8}' +
    '.pi-skip{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);background:none;border:1px solid #2b372b;color:#aab4a8;border-radius:7px;padding:8px 16px;font:700 .8rem Arial,Helvetica,sans-serif;cursor:pointer}' +
    '.pi-skip:hover,.pi-skip:focus-visible{border-color:#39ff14;color:#39ff14;outline:none}' +
    '#print-intro.done .pi-gantry,#print-intro.done .pi-nozzle{opacity:0}' +
    '#print-intro.out{opacity:0;pointer-events:none}';

  var style = document.createElement('style');
  style.textContent = css;
  document.documentElement.appendChild(style);

  var root = document.createElement('div');
  root.id = 'print-intro';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Abertura: o logo da Subuluk 3D sendo impresso');
  root.innerHTML =
    '<canvas></canvas><div class="pi-bed"></div><div class="pi-gantry"></div>' +
    '<svg class="pi-nozzle" viewBox="0 0 16 28" aria-hidden="true">' +
    '<rect x="2" y="0" width="12" height="14" rx="2" fill="#1b231b" stroke="#3a4a3a"/>' +
    '<polygon points="3,14 13,14 8,27" fill="#39ff14"/></svg>' +
    '<div class="pi-status"><span class="pi-pct">0%</span> imprimindo</div>' +
    '<button type="button" class="pi-skip">Pular</button>';
  document.documentElement.appendChild(root);

  var html = document.documentElement;
  var prevOverflow = html.style.overflow;
  html.style.overflow = 'hidden';

  var cv = root.querySelector('canvas');
  var bed = root.querySelector('.pi-bed');
  var gantry = root.querySelector('.pi-gantry');
  var nozzle = root.querySelector('.pi-nozzle');
  var pct = root.querySelector('.pi-pct');
  var skipBtn = root.querySelector('.pi-skip');

  var W = window.innerWidth, H = window.innerHeight;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  // ---- 1. Desenha o logo numa máscara invisível e mede o tamanho ----
  var chars = TEXT.split('');
  var m = document.createElement('canvas').getContext('2d');
  var FONT = 'bold 100px Arial, Helvetica, sans-serif';
  m.font = FONT;
  var LS = 8; // espaçamento entre letras (a 100px)
  var adv = chars.map(function (c) { return m.measureText(c).width; });
  var total100 = adv.reduce(function (a, b) { return a + b; }, 0) + LS * (chars.length - 1);
  var targetW = Math.min(W * 0.84, 780);
  var fs = 100 * targetW / total100;
  var sc = fs / 100;

  var mw = Math.ceil(targetW) + 4, mh = Math.ceil(fs * 0.9);
  var mask = document.createElement('canvas');
  mask.width = mw; mask.height = mh;
  var mc = mask.getContext('2d', { willReadFrequently: true });
  mc.font = 'bold ' + fs + 'px Arial, Helvetica, sans-serif';
  mc.textBaseline = 'alphabetic';
  var base = Math.round(fs * 0.8), cursor = 2;
  chars.forEach(function (c, i) {
    mc.fillStyle = i < GREEN_CHARS ? GREEN : WHITE;
    mc.fillText(c, cursor, base);
    cursor += adv[i] * sc + LS * sc;
  });
  var px = mc.getImageData(0, 0, mw, mh).data;

  var ox = (W - mw) / 2, oy = (H - mh) / 2 - 10;

  // ---- 2. "Fatia" o logo em camadas e monta o caminho do bico ----
  var LH = Math.max(2.5, fs / 34);       // altura de cada camada
  var capTop = base - fs * 0.76;
  var ops = [], cost = 0;
  var curX = ox, curY = oy + base;

  function mk(x0, y0, x1, y1, draw, color) {
    var len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
    var o = { x0: x0, y0: y0, x1: x1, y1: y1, draw: draw, c: color, drawn: 0, c0: cost };
    cost += draw ? len : len / 4;        // deslocamento sem extrudar é mais rápido
    o.c1 = cost;
    return o;
  }

  var k = 0;
  for (var y = base - LH / 2; y > capTop; y -= LH, k++) {
    var row = Math.floor(y), segs = [], start = -1, col = null;
    for (var xx = 0; xx <= mw; xx++) {
      var on = false, c = null;
      if (xx < mw) {
        var idx = (row * mw + xx) * 4;
        on = px[idx + 3] > 110;
        if (on) c = px[idx] > 200 ? WHITE : GREEN;
      }
      if (start >= 0 && (!on || c !== col)) { segs.push({ a: start, b: xx, c: col }); start = -1; }
      if (on && start < 0) { start = xx; col = c; }
    }
    var rev = k % 2 === 1;               // vai e volta, como o bico de verdade
    if (rev) segs.reverse();
    for (var s = 0; s < segs.length; s++) {
      var sg = segs[s];
      var xa = ox + (rev ? sg.b : sg.a), xb = ox + (rev ? sg.a : sg.b), yy = oy + y;
      var dx = xa - curX, dy = yy - curY;
      if (Math.sqrt(dx * dx + dy * dy) > 0.5) ops.push(mk(curX, curY, xa, yy, false, null));
      if (Math.abs(xb - xa) >= 1) ops.push(mk(xa, yy, xb, yy, true, sg.c));
      curX = xb; curY = yy;
    }
  }

  if (!ops.length) { cleanup(); return; }

  // mesa de impressão
  bed.style.left = (ox - 24) + 'px';
  bed.style.width = (mw + 48) + 'px';
  bed.style.top = (oy + base + 1) + 'px';

  // ---- 3. Animação ----
  var raf = 0, t0 = 0, cur = 0, closed = false;

  function paint(o, f) {
    if (f <= o.drawn) return;
    var xa = o.x0 + (o.x1 - o.x0) * o.drawn, xb = o.x0 + (o.x1 - o.x0) * f;
    var l = Math.min(xa, xb), w = Math.abs(xb - xa) + 0.6;
    ctx.fillStyle = o.c;
    ctx.fillRect(l - 0.3, o.y0 - LH / 2, w, LH);
    ctx.fillStyle = 'rgba(0,0,0,.3)';   // linha escura no fundo da camada
    ctx.fillRect(l - 0.3, o.y0 + LH / 2 - 1, w, 1);
    o.drawn = f;
  }

  function place(x, y) {
    nozzle.style.transform = 'translate(' + (x - 8) + 'px,' + (y - 27) + 'px)';
    gantry.style.transform = 'translateY(' + (y - 20) + 'px)';
  }

  function frame(now) {
    if (closed) return;
    if (!t0) t0 = now;
    var prog = Math.min((now - t0) / DURATION, 1), p = prog * cost;
    var nx = ops[0].x0, ny = ops[0].y0;

    while (cur < ops.length && ops[cur].c1 <= p) {
      var o = ops[cur];
      if (o.draw) paint(o, 1);
      nx = o.x1; ny = o.y1; cur++;
    }
    if (cur < ops.length) {
      var o2 = ops[cur];
      var f = (p - o2.c0) / Math.max(o2.c1 - o2.c0, 1e-6);
      if (o2.draw) paint(o2, f);
      nx = o2.x0 + (o2.x1 - o2.x0) * f;
      ny = o2.y0 + (o2.y1 - o2.y0) * f;
    }
    place(nx, ny);
    pct.textContent = Math.round(prog * 100) + '%';

    if (prog < 1) raf = requestAnimationFrame(frame);
    else finish();
  }

  function finish() {
    root.classList.add('done');          // bico e eixo somem
    pct.textContent = '100%';
    setTimeout(fadeOut, 800);            // segura a peça pronta por um instante
  }

  function fadeOut() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    root.classList.add('out');
    setTimeout(cleanup, 650);
  }

  function cleanup() {
    if (root.parentNode) root.parentNode.removeChild(root);
    if (style.parentNode) style.parentNode.removeChild(style);
    html.style.overflow = prevOverflow;
  }

  skipBtn.addEventListener('click', fadeOut);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fadeOut(); });
  window.addEventListener('resize', fadeOut);

  place(ops[0].x0, ops[0].y0);
  raf = requestAnimationFrame(frame);
})();
