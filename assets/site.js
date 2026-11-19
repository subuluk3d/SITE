/* =====================================================================
   SUBULUK 3D — configuração central + consentimento de cookies (LGPD)
   + Google Analytics 4 (só carrega depois do "aceito") + eventos.
   ---------------------------------------------------------------------
   PREENCHA AQUI:
   - GA4_ID: o "ID da métrica" do Google Analytics 4 (começa com G-).
             Vazio = o Analytics não é carregado e o aviso só oferece
             cookies necessários.
   - EMAIL:  e-mail para assuntos de privacidade (opcional, recomendado).
   ===================================================================== */
window.SBK = window.SBK || {};
SBK.config = {
  GA4_ID: "",                          // ex.: "G-ABC123XYZ9"
  WHATSAPP: "5512982299331",
  WHATSAPP_LABEL: "(12) 98229-9331",
  EMAIL: "",                           // ex.: "contato@subuluk3d.com.br"
  SITE_URL: "https://subuluk3d.github.io/SITE/",
  CONSENT_VERSION: 1                   // aumente para pedir o consentimento de novo
};

(function () {
  var C = SBK.config, KEY = "sbk_consent";
  var d = document;

  /* ---------- armazenamento seguro ---------- */
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY)); return v && v.v === C.CONSENT_VERSION ? v : null; } catch (e) { return null; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  /* ---------- Google Consent Mode v2: tudo negado por padrão ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: "denied", functionality_storage: "granted", security_storage: "granted"
  });

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded || !C.GA4_ID) return;
    gaLoaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    var s = d.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.GA4_ID);
    d.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", C.GA4_ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  }
  function clearGACookies() {
    d.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (/^_ga/.test(n)) {
        var host = location.hostname, parts = host.split(".");
        [host, "." + host, "." + parts.slice(-2).join(".")].forEach(function (dom) {
          d.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + dom;
        });
        d.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });
  }

  /* ---------- eventos (só enviados se o GA estiver ativo) ---------- */
  SBK.track = function (name, params) { if (gaLoaded) gtag("event", name, params || {}); };
  d.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (/wa\.me|whatsapp/.test(a.href)) SBK.track("click_whatsapp", { link_text: (a.textContent || "").trim().slice(0, 60), page_location: location.href });
    else if (a.host && a.host !== location.host) SBK.track("click_outbound", { link_url: a.href });
  });

  /* ---------- estado ---------- */
  var state = read();
  SBK.consent = function () { return state; };
  function apply(analytics) {
    var had = state && state.analytics;
    state = { v: C.CONSENT_VERSION, analytics: !!analytics && !!C.GA4_ID, date: new Date().toISOString() };
    write(state);
    if (state.analytics) loadGA();
    else if (had) { gtag("consent", "update", { analytics_storage: "denied" }); clearGACookies(); location.reload(); }
    hideBanner();
  }

  /* ---------- UI: aviso + preferências ---------- */
  var banner, dialog, lastFocus;
  function el(html) { var t = d.createElement("div"); t.innerHTML = html.trim(); return t.firstChild; }
  var hasGA = !!C.GA4_ID;

  function buildBanner() {
    banner = el(
      '<section class="ck-banner" role="region" aria-labelledby="ck-t" aria-describedby="ck-d">' +
        '<div class="ck-in">' +
          '<div class="ck-tx"><h2 id="ck-t">Sua privacidade</h2>' +
          '<p id="ck-d">' + (hasGA
            ? 'Usamos cookies necessários para o site funcionar e, com a sua permissão, cookies de análise (Google Analytics) para entender como o site é usado. Você pode mudar sua escolha quando quiser.'
            : 'Este site usa apenas armazenamento necessário para lembrar suas preferências. Não usamos cookies de publicidade.') +
          ' <a href="cookies.html">Política de cookies</a> · <a href="privacidade.html">Privacidade</a></p></div>' +
          '<div class="ck-act">' +
            (hasGA ? '<button type="button" class="ck-btn ghost" data-ck="prefs">Preferências</button><button type="button" class="ck-btn" data-ck="reject">Recusar</button><button type="button" class="ck-btn" data-ck="accept">Aceitar</button>'
                   : '<button type="button" class="ck-btn" data-ck="reject">Entendi</button>') +
          '</div>' +
        '</div>' +
      '</section>');
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]"); if (!b) return;
      var k = b.getAttribute("data-ck");
      if (k === "accept") apply(true); else if (k === "reject") apply(false); else openPrefs();
    });
    d.body.appendChild(banner);
  }
  function showBanner() { if (!banner) buildBanner(); banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  function buildDialog() {
    dialog = el(
      '<div class="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ckm-t" hidden>' +
        '<div class="ck-box">' +
          '<h2 id="ckm-t">Preferências de cookies</h2>' +
          '<p>Escolha quais categorias você permite. Os necessários não podem ser desligados porque fazem o site funcionar.</p>' +
          '<div class="ck-row"><div><strong>Necessários</strong><span>Guardam a sua escolha de cookies e preferências de exibição. Sempre ativos.</span></div><span class="ck-on">Sempre ativo</span></div>' +
          '<div class="ck-row"><div><strong id="ck-an-l">Análise (Google Analytics)</strong><span>' + (hasGA ? 'Estatísticas anônimas de visitas, páginas vistas e cliques, para melhorar o site. Sem publicidade.' : 'Não utilizado no momento.') + '</span></div>' +
            '<label class="ck-sw"><input type="checkbox" id="ck-an" aria-labelledby="ck-an-l"' + (hasGA ? "" : " disabled") + '><span aria-hidden="true"></span></label></div>' +
          '<div class="ck-row"><div><strong>Publicidade</strong><span>Não utilizamos cookies de publicidade ou remarketing.</span></div><span class="ck-off">Não usado</span></div>' +
          '<div class="ck-foot"><button type="button" class="ck-btn ghost" data-ck="close">Cancelar</button><button type="button" class="ck-btn" data-ck="save">Salvar escolhas</button></div>' +
        '</div>' +
      '</div>');
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) return closePrefs();
      var b = e.target.closest("[data-ck]"); if (!b) return;
      if (b.getAttribute("data-ck") === "save") { apply(d.getElementById("ck-an").checked); closePrefs(); }
      else closePrefs();
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closePrefs(); }
      if (e.key === "Tab") { // prende o foco dentro do diálogo
        var f = dialog.querySelectorAll("button:not([disabled]),input:not([disabled]),a[href]");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    d.body.appendChild(dialog);
  }
  function openPrefs() {
    if (!dialog) buildDialog();
    lastFocus = d.activeElement;
    d.getElementById("ck-an").checked = !!(state && state.analytics);
    dialog.hidden = false; d.documentElement.classList.add("ck-lock");
    d.getElementById("ck-an").disabled ? dialog.querySelector('[data-ck="save"]').focus() : d.getElementById("ck-an").focus();
  }
  function closePrefs() {
    dialog.hidden = true; d.documentElement.classList.remove("ck-lock");
    var t = lastFocus && lastFocus.offsetParent ? lastFocus : (d.querySelector("main") || d.body);
    if (t === d.querySelector("main")) t.setAttribute("tabindex", "-1");
    t.focus();
  }
  SBK.openCookiePrefs = openPrefs;

  /* ---------- pausar animações (WCAG 2.2.2) ---------- */
  var PK = "sbk_pause";
  function setPaused(p) {
    d.documentElement.classList.toggle("paused", p);
    try { localStorage.setItem(PK, p ? "1" : "0"); } catch (e) {}
    d.querySelectorAll("[data-pause]").forEach(function (b) { b.setAttribute("aria-pressed", p); b.textContent = p ? "Retomar animações" : "Pausar animações"; });
    d.dispatchEvent(new CustomEvent("sbk:pause", { detail: p }));
  }
  SBK.isPaused = function () { return d.documentElement.classList.contains("paused"); };
  try { if (localStorage.getItem(PK) === "1") d.documentElement.classList.add("paused"); } catch (e) {}

  function init() {
    d.querySelectorAll("[data-cookie-prefs]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openPrefs(); }); });
    d.querySelectorAll("[data-pause]").forEach(function (b) { b.addEventListener("click", function () { setPaused(!SBK.isPaused()); }); });
    setPaused(SBK.isPaused());
    d.querySelectorAll("[data-wa-label]").forEach(function (x) { x.textContent = C.WHATSAPP_LABEL; });
    d.querySelectorAll("[data-email]").forEach(function (x) {
      if (C.EMAIL) { x.innerHTML = '<a href="mailto:' + C.EMAIL + '">' + C.EMAIL + "</a>"; } else x.closest("[data-email-wrap]") && (x.closest("[data-email-wrap]").hidden = true);
    });
    if (state) { if (state.analytics) loadGA(); }
    else showBanner();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
