// Выбор посетителя по cookie аналитики. Яндекс Метрика загружается ТОЛЬКО после «Принять».
// Подключается на всех страницах, если в tools/build.js задан METRIKA_ID (window.BV_METRIKA).
// Решение хранится в localStorage (belovet-analytics: yes | no); изменить — ссылка «Настройки cookie» в подвале.
(function () {
  var ID = window.BV_METRIKA;
  if (!ID) return;
  var KEY = 'belovet-analytics';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    // Официальный код счётчика Яндекс Метрики (параметры — как в коде из интерфейса Метрики), запуск только после согласия
    window.dataLayer = window.dataLayer || [];
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + ID, 'ym');
    window.ym(ID, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest("a[href^='tel:']");
      if (a) window.ym(ID, 'reachGoal', 'phone');
    });
  }

  // Старое уведомление на главной больше не нужно: его заменяет выбор ниже
  var old = document.getElementById('cookie'); if (old) old.remove();

  var css = '.bv-ck{position:fixed;z-index:60;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:760px;margin-inline:auto;background:#0F2B45;color:#fff;border-radius:18px;padding:16px 18px;display:flex;gap:12px 16px;align-items:center;flex-wrap:wrap;box-shadow:0 12px 36px rgba(15,43,69,.3);font:14px/1.45 Roboto,Arial,sans-serif}'
    + '.bv-ck[hidden]{display:none!important}'
    + '.bv-ck p{flex:1 1 320px;margin:0;color:#E3EBF3}.bv-ck a{color:#fff;text-decoration:underline}'
    + '.bv-ck button{min-height:44px;padding:0 20px;border-radius:999px;border:1px solid #fff;font:500 15px Roboto,Arial,sans-serif;cursor:pointer}'
    + '.bv-ck .yes{background:#FBFF2C;border-color:#FBFF2C;color:#0F2B45}.bv-ck .no{background:transparent;color:#fff}'
    + '.bv-ck button:focus-visible{outline:3px solid #59B6F7;outline-offset:2px}'
    + '@media (max-width:700px){.bv-ck{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = null;
  function privacyHref() {
    var a = document.querySelector('a[href$="privacy.html"]');
    return a ? a.getAttribute('href') + '#cookie' : 'privacy.html#cookie';
  }
  function show() {
    if (box) { box.hidden = false; return; }
    box = document.createElement('div');
    box.className = 'bv-ck'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Выбор cookie');
    box.innerHTML = '<p>Сайт работает без сбора данных. С вашего разрешения подключим Яндекс Метрику: она помогает понять, какие страницы полезны. <a href="' + privacyHref() + '">Подробнее</a></p>'
      + '<button type="button" class="yes">Принять</button><button type="button" class="no">Отказаться</button>';
    box.querySelector('.yes').addEventListener('click', function () { set('yes'); box.hidden = true; load(); });
    box.querySelector('.no').addEventListener('click', function () {
      var was = get() === 'yes'; set('no'); box.hidden = true;
      if (was) location.reload(); // уже загруженная Метрика выгружается перезагрузкой страницы
    });
    document.body.appendChild(box);
  }

  function start() {
    document.querySelectorAll('[data-cookie-settings]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function (e) { e.preventDefault(); show(); });
    });
    var v = get();
    if (v === 'yes') load();
    else if (v !== 'no') show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
