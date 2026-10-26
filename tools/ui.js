// Общие компоненты внутренних страниц по макету Figma «BELOVET.RU» (страницы операций).
// Каждый компонент — один визуальный шаблон; меняется только содержание.
// Размеры заданы в пикселях макета (ширина 1613): стили в assets/site.css, --fs/--lh — размер и межстрочный из макета.

module.exports = function ui(ctx) {
  const { SITE, esc, rub, cap, ver, PHONE, PHONE_HREF } = ctx;
  const T = (fs, lh) => `--fs:${fs};--lh:${lh}`;
  const lines = s => esc(s).replace(/\n/g, ' <br>');
  const yearNow = new Date().getFullYear();

  // ---------- <head> ----------
  function head({ title, desc, url, prefix, type = 'article', ld = [], ogTags, iconTags, robots = 'noindex, nofollow', preload }) {
    return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Прототип: убрать noindex перед запуском -->
<meta name="robots" content="${robots}">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">\n` : ''}${url ? `<link rel="canonical" href="${url}">\n` : ''}${ogTags ? ogTags + '\n' : ''}${iconTags}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat&family=Oswald:wght@700&family=Roboto:wght@400;500;700&display=swap">
<link rel="stylesheet" href="${prefix}assets/site.css?v=${ver('assets/site.css')}">
${preload ? `<link rel="preload" as="image" href="${preload}">\n` : ''}${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head>`;
  }

  // Заголовки Oswald с длинными словами («Восстановление», «конфиденциальности») на телефоне не влезают в строку:
  // дописываем в style длину самого длинного слова (--wl), CSS по ней ужимает кегль
  function fitWords(html) {
    return html.replace(/<(h1|h2|h3|p|b)( class="[^"]*\bo\b[^"]*"[^>]*?) style="([^"]*)">([\s\S]*?)<\/\1>/g, (m, tag, cls, st, inner) => {
      if (st.includes('--wl') || /<(?!br>)/.test(inner)) return m;
      const wl = Math.max(...inner.replace(/<br>/g, ' ').replace(/&[a-z]+;/g, 'x').split(/[\s-]+/).map(w => w.length));
      return wl < 9 ? m : `<${tag}${cls} style="${st};--wl:${wl}">${inner}</${tag}>`;
    });
  }

  // ---------- шапка внутренних страниц (лежит на фоне первого экрана) ----------
  function header(prefix, crumbs) {
    const nav = `<a href="${prefix}index.html#prices">Операции и цены</a><a href="${prefix}blog/index.html">Блог</a><a href="${prefix}index.html#urgent">Экстренно</a><a href="${prefix}index.html#contacts">Контакты</a>`;
    return `<header class="ih">
      <a class="ih-logo" href="${prefix}index.html"><img src="${prefix}assets/logo-wordmark.png" width="640" height="224" alt="beloVET, ветеринарный врач-хирург"></a>
      <nav class="ih-nav" aria-label="Разделы">${nav}</nav>
      <a class="ih-phone" href="${PHONE_HREF}">${PHONE}</a>
      <a class="cta ih-cta" href="${prefix}index.html?form=book">Записаться</a>
      <details class="ih-menu"><summary aria-label="Меню"><span></span></summary><nav aria-label="Разделы">${nav}<a href="${PHONE_HREF}">${PHONE}</a><a class="cta" href="${prefix}index.html?form=book">Записаться на приём</a></nav></details>
    </header>
    ${crumbs ? `<nav class="crumbs t" style="${T(20, 27)}" aria-label="Навигация">${crumbs.map(c => c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : `<span>${esc(c[0])}</span>`).join('<i>/</i>')}</nav>` : ''}`;
  }

  // ---------- подвал (как на главной) ----------
  // Первый экран страниц без фото: блог, служебные страницы
  const pageHero = (pre, crumbs, title, lead, meta) => {
    const L = title.length, fs = L <= 30 ? 132 : L <= 50 ? 110 : L <= 70 ? 96 : 84;
    return `<section class="fx" style="--bg:var(--sky2)">
  <div class="sx ph-in">
    ${header(pre, crumbs)}
    <h1 class="ph-title t o up" style="${T(fs, Math.round(fs * 1.08))};--wl:${Math.max(...title.split(' ').map(w => w.length))}">${esc(title)}</h1>
    ${lead ? `<p class="ph-lead t" style="${T(28, 40)}">${esc(lead)}</p>` : ''}
    ${meta ? `<p class="ph-meta t" style="${T(22, 30)}">${meta.map(m => `<span>${m}</span>`).join('')}</p>` : ''}
  </div>
</section>`;
  };
  function footer(prefix) {
    return `<footer class="fx s-foot" style="--bg:var(--milk)">
  <div class="sx foot">
    <img class="foot-logo" src="${prefix}assets/logo-wordmark.png" width="640" height="224" alt="beloVET, ветеринарный врач-хирург" loading="lazy">
    <div class="foot-text">
      <p class="t" style="${T(24, 33)}">Владислав Белорыбец, ветеринарный врач-хирург.<br>Цены на сайте не являются публичной офертой:<br>итоговая стоимость согласуется после осмотра.</p>
      <a class="t" style="${T(25, 34)}" href="mailto:vladislav@belovet.ru">vladislav@belovet.ru</a>
      <p class="foot-links t" style="${T(23, 31)}"><a href="${prefix}blog/index.html">Блог</a><a href="${prefix}privacy.html">Политика конфиденциальности</a></p>
    </div>
  </div>
</footer>`;
  }

  // ---------- картинка с прозрачностью: JPEG + маска ----------
  const cut = (prefix, name, cls, style, alt = '', w, h) =>
    `<img class="${cls} cutout" style="${style};-webkit-mask-image:url(${prefix}assets/op/${name}-mask.png);mask-image:url(${prefix}assets/op/${name}-mask.png)" src="${prefix}assets/op/${name}.jpg" width="${w}" height="${h}" alt="${esc(alt)}" loading="lazy">`;
  const PHOTOS = { // натуральные размеры файлов в assets/op
    'dachshund-nose': [900, 1600], 'ginger-cat': [1416, 1111], 'black-dog': [1042, 1509], terrier: [1024, 1536], 'cat-tongue': [1254, 1254],
    'dalmatian-up': [1080, 1476], 'dachshund-full': [1080, 1350], 'dachshund-head': [1448, 1086], 'black-cat': [1543, 1019], pinscher: [1054, 1492], 'pinscher-squint': [684, 968]
  };
  const photo = (prefix, name, cls, style, alt) => cut(prefix, name, cls, style, alt, PHOTOS[name][0], PHOTOS[name][1]);
  const doodle = (prefix, file, style) => `<img class="dd" style="${style}" src="${prefix}assets/op/${file}" alt="" loading="lazy">`;

  // ---------- 1. первый экран операции ----------
  // h: { title, sub, lead, price, priceFrom, photo:{name, x, y, w, clip:{x,y,w,h}}, fs, lh, variant:'sky'|'split', crumbs }
  function hero(prefix, h) {
    const ph = h.photo;
    const img = ph.clip
      ? `<div class="oh-clip" style="--x:${ph.clip.x};--y:${ph.clip.y};--w:${ph.clip.w};--hh:${ph.clip.h};--cw:${ph.clip.w};--ch:${ph.clip.h}">${photo(prefix, ph.name, 'oh-photo', `--x:${ph.x};--y:${ph.y};--w:${ph.w}`, h.alt)}</div>`
      : photo(prefix, ph.name, 'oh-photo', `--x:${ph.x};--y:${ph.y};--w:${ph.w}${ph.flip ? ';scale:-1 1' : ''}`, h.alt);
    const priceHtml = `<p class="oh-price t o" style="${T(46, 54)}">${h.priceFrom ? 'от ' : ''}${rub(h.price)}</p>`;
    if (h.variant === 'split') {
      const [w1, ...rest] = h.title.split(' ');
      return `<section class="fx oh oh-split" style="--bg:var(--milk)">
  <div class="sx oh-in">
    ${header(prefix, h.crumbs)}
    <h1 class="oh-title o up"><span class="oh-w1 t" style="${T(155, 171)}">${esc(w1)}</span> <span class="oh-w2 t" style="${T(200, 220)}">${esc(rest.join(' '))}</span></h1>
    ${img}
    <div class="oh-text">
      <p class="oh-sub t o" style="${T(45, 57)}">${esc(h.sub)}</p>
      <p class="oh-lead t" style="${T(28, 40)}">${esc(h.lead)}</p>
      <div class="oh-row"><a class="cta" href="${prefix}index.html?form=book">Записаться на приём</a>${priceHtml}</div>
      <p class="oh-doc t" style="${T(22, 30)}">Хирург: Владислав Белорыбец</p>
    </div>
  </div>
</section>`;
    }
    return `<section class="fx oh" style="--bg:var(--sky2)">
  <div class="sx oh-in">
    ${header(prefix, h.crumbs)}
    <h1 class="oh-title t o up" style="${T(h.fs, h.lh)}">${lines(h.titleLines || h.title)}</h1>
    ${img}
    <div class="oh-text"${h.tw ? ` style="--tw:${h.tw}"` : ''}>
      <p class="oh-sub t o" style="${T(50, 64)}">${esc(h.sub)}</p>
      <p class="oh-lead t" style="${T(28, 40)}">${esc(h.lead)}</p>
      <p class="oh-doc t" style="${T(23, 31)}">Хирург: Владислав Белорыбец</p>
      <div class="oh-row${h.priceBelow ? ' below' : ''}"><a class="cta" href="${prefix}index.html?form=book">Записаться на приём</a>${priceHtml}</div>
    </div>
  </div>
</section>`;
  }

  // ---------- 2. ключевые параметры ----------
  function params(items) {
    return `<section class="fx" style="--bg:#fff" aria-label="Ключевые параметры">
  <dl class="sx params">${items.map(([label, val]) => `<div><dt class="t" style="${T(22, 30)}">${esc(label)}</dt><dd class="t o" style="${T(34, 43)}">${esc(cap(val))}</dd></div>`).join('')}</dl>
</section>`;
  }

  // ---------- 3. смысловой блок «что это» ----------
  // o: { bg, heading, headColor, paras[], card:{title,text}, note:{text, bg, rot}, doodle:{file,w}, foot, cols }
  function intro(prefix, o) {
    const right = o.card
      ? `<div class="in-card"><p class="t o up" style="${T(37, 47)}">${esc(o.card.title)}</p><p class="t" style="${T(25, 36)}">${esc(o.card.text)}</p></div>`
      : o.note ? `<div class="in-note cv-note" style="--nb:${o.note.bg};--r:${o.note.rot}"><p class="t cv" style="${T(42, 51)}">${lines(o.note.text)}</p></div>` : '';
    return `<section class="fx" style="--bg:${o.bg}">
  <div class="sx intro${o.cols ? ' intro-cols' : ''}${o.compact ? ' intro-compact' : ''}">
    <h2 class="t o up" style="${T(o.hfs || 100, o.hlh || 110)};${o.headColor ? 'color:' + o.headColor : ''}">${lines(o.heading)}</h2>
    <div class="in-row">
      <div class="in-text"${o.tw ? ` style="--tw:${o.tw}"` : ''}>${o.paras.map(t => `<p class="t" style="${T(o.pfs || 28, o.plh || 40)}">${esc(t)}</p>`).join('')}</div>
      ${right}
    </div>
    ${o.foot ? `<p class="in-foot t" style="${T(27, 38)}">${esc(o.foot)}</p>` : ''}
    ${o.doodle ? doodle(prefix, o.doodle.file, `--x:${o.doodle.x};--y:${o.doodle.y};--w:${o.doodle.w}`) : ''}
  </div>
</section>`;
  }

  // ---------- 4. когда нужна операция ----------
  // w: { heading, intro, items:[{title?, text}], variant:'rows'|'mosaic'|'cards3', foot, side:{photo...} }
  function when(prefix, w) {
    const n = i => String(i + 1).padStart(2, '0');
    let body;
    if (w.variant === 'mosaic') {
      const BG = ['#fff', 'var(--ice)', 'var(--sky2)', '#fff', '#fff'];
      body = `<div class="wh-mosaic">${w.items.map((it, i) => `<div class="wh-card" style="--cb:${BG[i % 5]}"><p class="t o up" style="${T(37, 45)}">${lines(it.title)}</p><p class="t" style="${T(26, 37)}">${esc(it.text)}</p></div>`).join('')}</div>`;
    } else if (w.variant === 'cards3') {
      const BG = ['var(--sky2)', '#fff', 'var(--ice)'];
      body = `<div class="wh-cards3">${w.items.map((it, i) => `<div class="wh-card" style="--cb:${BG[i % 3]}"><p class="t o" style="${T(40, 46)}">${n(i)}</p><p class="t o up" style="${T(i ? 32 : 40, i ? 37 : 45)}">${lines(it.title)}</p><p class="t" style="${T(24, 33)}">${esc(it.text)}</p></div>`).join('')}</div>`;
    } else {
      body = `<ol class="wh-rows${w.items.some(x => x.title) ? '' : ' plain'}">${w.items.map((it, i) => `<li><b class="t o" style="${T(62, 72)}">${n(i)}</b>${it.title ? `<span class="wh-t t o up" style="${T(34, 43)}">${lines(it.title)}</span>` : ''}<span class="t" style="${T(28, 40)}">${esc(it.title ? it.text : cap(it.text))}</span></li>`).join('')}</ol>`;
    }
    const side = w.side ? `<div class="wh-side"><i></i>${photo(prefix, w.side, 'wh-photo', '', '')}</div>` : '';
    return `<section class="fx" style="--bg:${w.bg || 'var(--milk)'}">
  <div class="sx when when-${w.variant}${w.big ? ' wh-big' : ''}">
    ${side}
    <h2 class="t o up" style="${T(w.hfs || 95, w.hlh || 105)}">${lines(w.heading)}</h2>
    ${w.intro ? `<p class="wh-intro t" style="${T(w.variant === 'cards3' ? 25 : 27, w.variant === 'cards3' ? 35 : 39)}">${esc(w.intro)}</p>` : ''}
    ${body}
    ${w.foot ? `<p class="wh-foot t cv" style="${T(32, 42)}">${esc(w.foot)}</p>` : ''}
    ${w.after || ''}
  </div>
</section>`;
  }

  // ---------- 5. срочно к врачу ----------
  function alertBox(symptoms) {
    return `<div class="alert">
      <div class="al-left">
        <p class="t o up" style="${T(52, 62)}">Срочно к врачу</p>
        <p class="t" style="${T(29, 38)}">${symptoms.map(s => esc(cap(s))).join('<br>')}</p>
        <p class="t" style="${T(29, 30)}">По экстренной записи — буду в клинике за 15 минут, даже ночью.<br>Тяжёлых пациентов принимаем без очереди.</p>
      </div>
      <div class="al-right">
        <a class="t" style="${T(30, 41)}" href="${PHONE_HREF}">${PHONE}</a>
        <a class="cta cta-lg" href="${PHONE_HREF}">Позвонить врачу</a>
      </div>
    </div>`;
  }
  const alert = (symptoms, bg = 'var(--milk)') => `<section class="fx" style="--bg:${bg}">
  <div class="sx alert-wrap">${alertBox(symptoms)}</div>
</section>`;

  // ---------- 6. стоимость ----------
  function cost(prefix, rows, note) {
    return `<section class="fx" style="--bg:var(--ice)" id="ceny">
  <div class="sx cost">
    <h2 class="t o up" style="${T(76, 88)}">Одна операция.<br>Понятная стоимость.</h2>
    <div class="cost-body">
      <table class="cost-table"><caption class="vh">Стоимость</caption><tbody>${rows.map(r => `<tr><th class="t" style="${T(32, 43)}" scope="row">${esc(r[0])}</th><td class="t o" style="${T(42, 50)}">${rub(r[1])}</td></tr>`).join('')}</tbody></table>
      <div class="cost-foot"><p class="t" style="${T(26, 37)}">${lines(note)}</p><a class="cta" href="${prefix}index.html?form=book">Записаться</a></div>
    </div>
  </div>
</section>`;
  }

  // ---------- 7. эмоциональные акценты (утверждённые варианты) ----------
  const ACCENTS = {
    ponyatno: (prefix, a) => `<section class="fx acc acc-ponyatno" style="--bg:var(--sky2)">
  <div class="sx"><p class="acc-h t o up" style="${T(176, 194)}">${esc(a.heading || 'Понятно')}</p>
    ${photo(prefix, 'terrier', 'acc-photo', '', '')}
    <div class="acc-note" style="--nb:var(--coral);--r:7.44"><p class="t cv" style="${T(47, 57)};color:var(--milk)">${lines(a.note || 'Смета и план операции —\nдо её начала.')}</p></div>
  </div>
</section>`,
    dvizhenie: (prefix, a) => `<section class="fx acc acc-dvizhenie" style="--bg:var(--sky2)">
  <div class="sx"><div class="acc-pclip">${photo(prefix, 'dalmatian-up', 'acc-photo', '', '')}</div>
    <p class="acc-h t o up" style="${T(108, 120)}">${lines(a.heading || 'Снова\nв движении')}</p>
    <div class="acc-note" style="--nb:var(--sun);--r:4"><p class="t cv" style="${T(40, 49)}">${lines(a.note || 'Восстановление.\nАдаптация.\nВозвращение к жизни.')}</p></div>
    ${doodle(prefix, 'p01-paws.png', '')}
  </div>
</section>`,
    lechim: (prefix, a) => `<section class="fx acc acc-lechim" style="--bg:var(--sun)">
  <div class="sx"><p class="acc-h t o up" style="${T(112, 124)}">${lines(a.heading)}</p>
    <p class="acc-text t" style="${T(30, 43)}">${esc(a.text)}</p>
    ${photo(prefix, 'dachshund-head', 'acc-photo', '', '')}
    <div class="acc-note" style="--nb:#fff;--r:3"><p class="t cv" style="${T(37, 43)}">${esc(a.note)}</p></div>
    ${doodle(prefix, 'm17-lines.png', '')}
  </div>
</section>`,
    domoj: (prefix, a) => `<section class="fx acc acc-domoj" style="--bg:var(--sky2)">
  <div class="sx"><p class="acc-h t o up" style="${T(235, 256)}">${esc(a.heading || 'Домой')}</p>
    <div class="acc-card"><p class="t o up" style="${T(42, 53)}">${esc(a.title)}</p><p class="t" style="${T(28, 40)}">${esc(a.text)}</p></div>
    ${photo(prefix, 'black-cat', 'acc-photo', '', '')}
  </div>
</section>`
  };
  const accent = (prefix, a) => ACCENTS[a.type](prefix, a);

  // ---------- 8. подготовка ----------
  function prep(prefix, items) {
    return `<section class="fx" style="--bg:#fff">
  <div class="prep">
    <div class="sx prep-top">
      <p class="t o up" style="${T(34, 44)}">До операции —</p>
      <h2 class="t o up" style="${T(124, 133)}">Всё<br>по плану</h2>
      <img class="prep-diag" src="${prefix}assets/op/diag.svg" width="170" height="365" alt="">
      <p class="prep-num t o" style="${T(212, 232)}">8–12</p>
      <p class="prep-cap t o" style="${T(32, 42)}">часов голода<br>перед наркозом</p>
      ${doodle(prefix, 'l18-flash.png', '')}
    </div>
    <div class="sx prep-body">
      <ul>${items.map(t => `<li><i class="t" style="${T(32, 38)}">×</i><span class="t" style="${T(27, 38)}">${esc(cap(t))}</span></li>`).join('')}</ul>
      <p class="prep-water t" style="${T(27, 38)}">Воду —<br>по рекомендации<br>врача.</p>
    </div>
    <p class="sx prep-foot t cv" style="${T(44, 54)}">Смета и план операции — до её начала.</p>
  </div>
</section>`;
  }

  // ---------- 9. как проходит операция ----------
  function how(prefix, steps, heading, draftNote) {
    const SLOTS = 5;
    const s = steps.slice(0, SLOTS);
    if (steps.length > SLOTS) s[SLOTS - 1] = steps.slice(SLOTS - 1).join('; ');
    return `<section class="fx" style="--bg:var(--ink)">
  <div class="how how-n${s.length}">
    <h2 class="t o up" style="${T(112, 122)}">${lines(heading)}</h2>
    <img class="how-route" src="${prefix}assets/op/route.svg" width="1469" height="1020" alt="">
    ${doodle(prefix, 'm06-thermo.png', '')}
    <ol>${s.map((t, i) => `<li class="how-s${i + 1}"><b class="t o" style="${T(156, 170)}">${String(i + 1).padStart(2, '0')}</b><span class="t" style="${T(29, 40)}">${esc(cap(t))}</span></li>`).join('')}</ol>
    ${draftNote ? `<p class="how-draft t" style="${T(24, 34)}">${esc(draftNote)}</p>` : ''}
  </div>
</section>`;
  }

  // ---------- 10. восстановление ----------
  function recovery(prefix, introText, rows) {
    const split = label => {
      const m = label.match(/^([\d–\-]+)\s+(.+)$/);
      return m ? [m[1], m[2], false] : [label.split(' ')[0], label.split(' ').slice(1).join(' '), true];
    };
    return `<section class="fx" style="--bg:var(--milk)">
  <div class="rec">
    <div class="sx rec-top">
      <h2 class="t o up" style="${T(106, 116)}">Восстановление</h2>
      <div class="rec-intro"><p class="t o up" style="${T(67, 77)}">Шаг за шагом</p><p class="t" style="${T(25, 35)}">${esc(introText)}</p></div>
    </div>
    <ol class="rec-line">
      <img class="rec-curve" src="${prefix}assets/op/timeline.svg" width="26" height="1008" alt="">
      ${rows.map((r, i) => { const [big, small, word] = split(r[0]); return `<li class="rec-r${i % 4}"><span class="rec-when"><b class="t o" style="${word ? T(64, 74) : T(100, 110)}">${esc(cap(big))}</b><small class="t o" style="${T(29, 38)}">${esc(small)}</small></span><img class="rec-dot" src="${prefix}assets/op/dot.svg" width="18" height="18" alt=""><span class="rec-what t" style="${T(28, 40)}">${esc(r[1])}</span></li>`; }).join('')}
    </ol>
    <div class="sx rec-foot"><p class="t" style="${T(22, 31)}">Сроки ориентировочные: врач скорректирует их по ходу восстановления.</p>${doodle(prefix, 'p01-paws.png', '')}</div>
  </div>
</section>`;
  }

  // ---------- 11. теперь вы дома ----------
  function home(prefix, items) {
    return `<section class="fx" style="--bg:var(--sky2)">
  <div class="homec">
    <div class="sx home-top">
      <h2 class="t o up" style="${T(112, 122)};color:var(--milk)">Теперь вы дома.</h2>
      <p class="t cv" style="${T(40, 49)}">Забота — в простых вещах.</p>
      <p class="home-h t o up" style="${T(47, 57)}">Что важно помнить</p>
    </div>
    <ol class="home-list">${items.map((t, i) => `<li><b class="t o" style="${T(24, 36)}">${String(i + 1).padStart(2, '0')}</b><span class="t" style="${T(26, 36)}">${esc(cap(t))}</span></li>`).join('')}</ol>
    <p class="home-foot t cv" style="${T(43, 53)}">По схеме врача.</p>
    ${photo(prefix, 'pinscher', 'home-photo', '', '')}
    ${doodle(prefix, 'h01-bowl.png', '')}
  </div>
</section>`;
  }

  // ---------- 12. когда нужен контроль врача ----------
  function control(prefix, risks) {
    return `<section class="fx" style="--bg:#fff">
  <div class="sx ctrl">
    <h2 class="t o up" style="${T(104, 114)}">Когда нужен<br>контроль врача</h2>
    ${doodle(prefix, 'm12-excl.png', '')}
    ${risks ? `<p class="ctrl-risks t" style="${T(27, 38)}">${esc(risks)}</p>` : ''}
    <p class="ctrl-h t o" style="${T(32, 43)}">Покажите питомца врачу, если заметили:</p>
    <div class="ctrl-frame">
      <div class="ctrl-l"><b class="t o" style="${T(96, 108)}">39,5 °C</b><p class="t" style="${T(27, 38)}">Температура выше 39,5 °C.</p><p class="t" style="${T(27, 38)}">Отказ от еды больше суток, повторная рвота.</p></div>
      <ul class="ctrl-r">${['Кровотечение из раны или повязки.', 'Шов разошёлся или из него выделяется гной.', 'Выраженная вялость, бледные дёсны, тяжёлое дыхание.'].map(t => `<li class="t" style="${T(29, 41)}">${t}</li>`).join('')}</ul>
    </div>
    <div class="ctrl-foot"><a class="t" style="${T(35, 48)}" href="${PHONE_HREF}">${PHONE}</a><a class="t cv" style="${T(29, 38)}" href="${PHONE_HREF}">Свяжитесь с врачом</a></div>
  </div>
</section>`;
  }

  // ---------- 13. прогноз (утверждённые варианты) ----------
  const PROGNOSIS = {
    igrat: (prefix, g) => `<section class="fx pg pg-igrat" style="--bg:var(--milk)">
  <div class="sx"><p class="pg-h t o up" style="${T(143, 154)}">${lines(g.heading || 'Играть.\nГулять.\nЖить.')}</p>
    ${doodle(prefix, 'd03-dog-play.png', '')}
    <div class="pg-card"><p class="t o up" style="${T(48, 58)}">${lines(g.title || 'Прогноз')}</p><p class="t" style="${T(28, 41)}">${esc(g.text)}</p></div>
    <p class="pg-note t cv" style="${T(38, 47)}">${esc(g.note || 'У каждого питомца — свой темп.')}</p>
  </div>
</section>`,
    bezboli: (prefix, g) => `<section class="fx pg pg-bezboli" style="--bg:var(--sky2)">
  <div class="sx"><p class="pg-h t o up" style="${T(300, 218)}">${esc(g.heading)}</p>
    ${photo(prefix, 'dachshund-full', 'pg-photo', '', '')}
    <div class="pg-card"><p class="t o" style="${T(32, 42)}">${esc(g.title)}</p><p class="t" style="${T(28, 40)}">${esc(g.text)}</p></div>
  </div>
</section>`,
    ritm: (prefix, g) => `<section class="fx pg pg-ritm" style="--bg:var(--sky2)">
  <div class="sx">${photo(prefix, 'pinscher-squint', 'pg-photo', '', '')}
    <p class="pg-h t o up" style="${T(137, 149)}">${esc(g.heading)}</p>
    <div class="pg-card"><p class="t" style="${T(28, 40)}">${esc(g.text)}</p></div>
  </div>
</section>`,
    prichina: (prefix, g) => `<section class="fx pg pg-prichina" style="--bg:var(--coral)">
  <div class="sx"><p class="pg-h t o up" style="${T(119, 130)}">${lines(g.heading)}</p>
    <div class="pg-card"><p class="t o up" style="${T(38, 41)}">${esc(g.title)}</p><p class="t" style="${T(29, 42)}">${esc(g.text)}</p></div>
    ${doodle(prefix, 'd03-dog-play.png', '')}
    <p class="pg-note t cv" style="${T(38, 44)}">${esc(g.note)}</p>
  </div>
</section>`,
    zazhivat: (prefix, g) => `<section class="fx pg pg-zazhivat" style="--bg:var(--coral)">
  <div class="sx"><p class="pg-h t o up" style="${T(192, 208)};color:#fff">${esc(g.heading)}</p>
    ${photo(prefix, 'dachshund-head', 'pg-photo', '', '')}
    <div class="pg-card"><p class="t cv" style="${T(49, 61)}">${lines(g.note)}</p></div>
    <p class="pg-text t" style="${T(29, 41)}">${esc(g.text)}</p>
  </div>
</section>`
  };
  const prognosis = (prefix, g) => PROGNOSIS[g.type](prefix, g);

  // ---------- 14. FAQ ----------
  function faq(items, heading = 'Важно знать') {
    return `<section class="fx" style="--bg:#fff" id="voprosy">
  <div class="sx faq">
    <h2 class="t o up" style="${T(88, 96)}">${esc(heading)}</h2>
    <div class="faq-list">${items.map(q => `<div class="faq-row"><h3 class="t o" style="${T(34, 44)}">${esc(q[0])}</h3><p class="t" style="${T(26, 37)}">${esc(q[1])}</p></div>`).join('')}</div>
  </div>
</section>`;
  }

  // ---------- 15. больше по теме / другие операции ----------
  function more(prefix, post, ops, minPrice) {
    return `<section class="fx" style="--bg:var(--ice)">
  <div class="sx more">
    <h2 class="t o up" style="${T(88, 96)}">Больше по теме</h2>
    <div class="more-row">
      <a class="more-post" href="${prefix}blog/${post.slug}.html"><b class="t o" style="${T(48, 59)}">${esc(post.title)}</b><span class="t" style="${T(26, 37)}">${esc(post.lead)}</span><span class="more-read t" style="${T(25, 34)}">Читать статью →</span></a>
      <ul class="more-ops">${ops.map(o => `<li><a class="t" style="${T(38, 52)}" href="${prefix}operations/${o.slug}.html">${esc(o.title)}</a><p class="t" style="${T(24, 34)}">${esc(o.short)}</p><b class="t o" style="${T(28, 36)}">от ${rub(minPrice(o))}</b></li>`).join('')}</ul>
    </div>
  </div>
</section>`;
  }
  function others(prefix, heading, ops, minPrice) {
    return `<section class="fx" style="--bg:var(--milk)">
  <div class="sx others">
    <h2 class="t o up" style="${T(85, 95)}">${lines(heading)}</h2>
    <div class="others-row">${ops.map(o => `<a class="others-op" href="${prefix}operations/${o.slug}.html"><b class="t o" style="${T(39, 49)}">${esc(o.title)}</b><span class="t" style="${T(24, 34)}">${esc(o.short)}</span><em class="t o" style="${T(32, 42)}">от ${rub(minPrice(o))}</em></a>`).join('')}</div>
  </div>
</section>`;
  }

  // ---------- 16. источники ----------
  function sources(items, checked, disclaimer) {
    return `<section class="fx" style="--bg:var(--ice)" id="istochniki">
  <div class="sx src">
    <h2 class="t o up" style="${T(76, 86)}">Источники<br>и дата проверки</h2>
    <p class="t" style="${T(24, 34)}">${esc(checked)}</p>
    <ol>${items.map(s => `<li class="t" style="${T(22, 32)}">${s}</li>`).join('')}</ol>
    <p class="t" style="${T(23, 33)}">${esc(disclaimer)}</p>
  </div>
</section>`;
  }

  // ---------- 17. запись на приём ----------
  function book(prefix, heading = 'Обсудим\nваш случай', text = 'Пришлите анализы, снимки и заключения — посмотрю и отвечу, нужна ли операция и как к ней подготовиться.') {
    return `<section class="fx" style="--bg:var(--sky2)">
  <div class="sx book">
    <h2 class="t o up" style="${T(114, 126)}">${lines(heading)}</h2>
    <p class="t" style="${T(30, 43)}">${esc(text)}</p>
    <div class="book-btns"><a class="cta cta-lg" href="${prefix}index.html?form=book">Записаться на приём</a><a class="cta cta-lg cta-white" href="${prefix}index.html?form=ask">Задать вопрос врачу</a></div>
    <img class="book-cat" src="${prefix}assets/home/cat-stretch.png" width="800" height="800" alt="" loading="lazy">
    ${photo(prefix, 'pinscher', 'book-photo', '', '')}
  </div>
</section>`;
  }

  return { T, lines, fitWords, head, header, pageHero, footer, photo, doodle, hero, params, intro, when, alert, alertBox, cost, accent, prep, how, recovery, home, control, prognosis, faq, more, others, sources, book, yearNow };
};
