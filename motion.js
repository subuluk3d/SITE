/* Subuluk 3D: motion compartilhado. Carregar com <script src="motion.js" defer>.
   Sem dependências. Com prefers-reduced-motion o conteúdo aparece direto. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) html.classList.add('m');

  // Elementos que entram ao rolar. data-stagger agrupa irmãos com atraso em cascata.
  var GROUPS = [
    ['section .wrap > .head', 'rv'],
    ['.index .row', 'rv', 1],
    ['.note', 'rv'],
    ['.biz > div', 'rv', 1],
    ['.step', 'rv', 1],
    ['.about > div', 'rv rv-l'],
    ['.about li', 'rv', 1],
    ['.faq details', 'rv', 1],
    ['.contact .wrap > *', 'rv', 1],
    ['.ft, .copy', 'rv']
  ];

  var io = html.classList.contains('m') ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 }) : null;

  // API pública para conteúdo criado depois (catálogo).
  window.reveal = function (els, cls, stagger) {
    Array.prototype.forEach.call(els, function (el, i) {
      (cls || 'rv').split(' ').forEach(function (c) { el.classList.add(c); });
      if (stagger) el.style.setProperty('--d', Math.min(i, 10));
      if (io) io.observe(el); else el.classList.add('in');
    });
  };

  GROUPS.forEach(function (g) { window.reveal(document.querySelectorAll(g[0]), g[1], g[2]); });

  // Título do hero dividido em palavras (título curto, ~4 palavras).
  var h1 = document.querySelector('.hero h1');
  if (h1 && html.classList.contains('m')) {
    h1.setAttribute('aria-label', h1.textContent); h1.classList.add('split');
    h1.innerHTML = h1.textContent.trim().split(/\s+/).map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>';
    }).join(' ');
  }

  // Brilho que segue o cursor no hero (só mouse, só com movimento).
  var hero = document.querySelector('.hero');
  if (hero && html.classList.contains('m') && matchMedia('(hover:hover)').matches) {
    var spot = document.createElement('i');
    spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
    hero.insertBefore(spot, hero.firstChild);
    var pend = 0, mx = 0, my = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      if (!pend) pend = requestAnimationFrame(function () {
        pend = 0; spot.style.setProperty('--mx', mx + 'px'); spot.style.setProperty('--my', my + 'px');
      });
    }, { passive: true });
  }

  // Contato: logo flutua só quando visível.
  var ct = document.querySelector('.contact');
  if (ct && io) new IntersectionObserver(function (es) { ct.classList.toggle('in-view', es[0].isIntersecting); }).observe(ct);

  // Barra de progresso + header com sombra ao rolar (1 leitura por frame).
  var bar = document.createElement('div'); bar.className = 'scroll-bar'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var hd = document.querySelector('header'), ticking = 0;
  function onScroll() {
    ticking = 0;
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (hd) hd.classList.toggle('scrolled', y > 8);
  }
  addEventListener('scroll', function () { if (!ticking) ticking = requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();
})();
