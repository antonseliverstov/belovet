// Сборка: страницы операций, данные поиска, блок «Ветеринарная хирургия» на главной, sitemap.
// Запуск из корня проекта: node tools/build.js
const fs = require('fs');
const path = require('path');
const { SOURCES, ACVS, CATEGORIES, PROCEDURES } = require('../data/procedures');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://antonseliverstov.github.io/belovet/';
const PHONE = '+7 (939) 255-77-71';
const PHONE_HREF = 'tel:+79392557771';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rub = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
const catName = id => CATEGORIES.find(c => c.id === id).name;
const minPrice = p => Math.min(...p.prices.map(x => x.p));

// ---------- проверки данных ----------
const slugs = new Set();
for (const p of PROCEDURES) {
  if (slugs.has(p.slug)) throw new Error('Повтор slug: ' + p.slug);
  slugs.add(p.slug);
  if (!CATEGORIES.some(c => c.id === p.cat)) throw new Error('Нет категории: ' + p.cat);
  for (const s of p.sources) if (!SOURCES[s]) throw new Error('Нет источника ' + s + ' в ' + p.slug);
}

// ---------- страница операции ----------
function pageHtml(p) {
  const related = PROCEDURES.filter(x => x.cat === p.cat && x.slug !== p.slug).slice(0, 6);
  const priceNote = p.cat === 'anest'
    ? 'Степень анестезии определяет анестезиолог после осмотра.'
    : p.cat === 'postop' || p.cat === 'wounds'
      ? 'Если нужна седация или наркоз, их стоимость считается отдельно.'
      : 'Цена операции без наркоза. Наркоз — от 3 400 до 13 800 ₽, степень определяет анестезиолог. Анализы, стационар и препараты — по прайсу клиники.';
  const desc = `${p.title} у кошек и собак в Люберцах: ${p.lead.charAt(0).toLowerCase() + p.lead.slice(1)}`.slice(0, 250);
  const sources = p.sources.map(k => `<li>${esc(SOURCES[k])}</li>`).join('')
    + (p.acvs || []).map(a => `<li>American College of Veterinary Surgeons. Small Animal: <a href="${ACVS + a}/" target="_blank" rel="noopener">${ACVS + a}/</a></li>`).join('');
  const prices = p.prices.map(x => `<li><span>${esc(x.v ? x.v.charAt(0).toUpperCase() + x.v.slice(1) : p.title)}</span><b class="num">${rub(x.p)}</b></li>`).join('');
  const ld = {
    '@context': 'https://schema.org', '@type': 'MedicalProcedure', name: p.title, alternateName: p.aka, description: p.lead,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: minPrice(p), highPrice: Math.max(...p.prices.map(x => x.p)) }
  };
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Прототип: убрать noindex перед запуском -->
<meta name="robots" content="noindex, nofollow">
<title>${esc(p.title)} у кошек и собак — цена в Люберцах | beloVET</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}operations/${p.slug}.html">
<link rel="icon" type="image/png" href="../assets/logo-symbol.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Onest:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../assets/page.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="header">
  <div class="wrap">
    <a class="logo" href="../index.html"><img class="sym" src="../assets/logo-symbol.png" alt=""><img class="word" src="../assets/logo-wordmark.png" alt="beloVET, ветеринарный врач-хирург"></a>
    <a class="phone num" href="${PHONE_HREF}">${PHONE}</a>
    <a class="btn btn-primary" href="../index.html?form=book">Записаться</a>
  </div>
</header>

<main class="wrap">
  <nav class="crumbs" aria-label="Навигация"><a href="../index.html">Главная</a> / <a href="../index.html#prices">Ветеринарная хирургия</a> / <span>${esc(catName(p.cat))}</span></nav>

  <div class="top">
    <div class="intro">
      <span class="label">${esc(catName(p.cat))}</span>
      <h1>${esc(p.title)}</h1>
      ${p.aka ? `<p class="aka">${esc(p.aka)}</p>` : ''}
      <p class="lead">${esc(p.lead)}</p>
      ${p.draft ? '<p class="draft">Описание этой позиции уточняется у хирурга.</p>' : ''}
    </div>
    <aside class="price-card">
      <h2>Стоимость</h2>
      <ul class="plist">${prices}</ul>
      <p class="note">${priceNote}</p>
      <a class="btn btn-primary" href="../index.html?form=book">Записаться на консультацию</a>
      <a class="btn btn-outline" href="../index.html?form=ask">Задать вопрос врачу</a>
    </aside>
  </div>

  <div class="content">
    <section>
      <h2>Когда нужна</h2>
      <ul>${p.indications.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </section>
    <section>
      <h2>Как проходит</h2>
      <p>${esc(p.how)}</p>
      ${p.cat !== 'anest' && p.cat !== 'postop' ? '<p>Перед любой операцией врач осматривает питомца и при необходимости назначает анализы крови, УЗИ, рентген или ЭКГ. Точный план и смету вы узнаёте до операции.</p>' : ''}
    </section>
    <section>
      <h2>Восстановление</h2>
      <p>${esc(p.recovery)}</p>
    </section>
    <section>
      <h2>Возможные осложнения</h2>
      <p>${esc(p.risks)}</p>
    </section>
    <section class="urgent-note">
      <p>Если питомцу резко стало хуже — рвота, одышка, кровотечение, вялость, отказ от еды, — звоните сразу: <a href="${PHONE_HREF}">${PHONE}</a>, круглосуточно.</p>
    </section>
    <section class="sources">
      <h2>Источники</h2>
      <ol>${sources}</ol>
      <p class="disclaimer">Информация на странице носит ознакомительный характер и не заменяет осмотр. Нужна ли операция и какая, решает врач после обследования.</p>
    </section>
  </div>

  ${related.length ? `<section class="related">
    <h2>Другие операции раздела «${esc(catName(p.cat))}»</h2>
    <div class="rel">${related.map(r => `<a href="${r.slug}.html"><b>${esc(r.title)}</b><span class="num">от ${rub(minPrice(r))}</span></a>`).join('')}</div>
  </section>` : ''}
</main>

<footer class="footer">
  <div class="wrap">
    <img src="../assets/logo-wordmark.png" alt="beloVET">
    <p>Владислав Белорыбец, ветеринарный врач-хирург. Клиника «Добрый Доктор», Люберцы, ул. Вертолётчиков, 11. Цены не являются публичной офертой. <a href="../privacy.html">Политика конфиденциальности</a></p>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- данные поиска ----------
function searchData() {
  return {
    cats: CATEGORIES,
    items: PROCEDURES.map(p => ({
      s: p.slug, c: p.cat, t: p.title, a: p.aka || '',
      v: p.prices.map(x => [x.v, x.p]),
      k: p.keywords
    }))
  };
}

// ---------- блок на главной ----------
function homeBlock() {
  return CATEGORIES.map((c, i) => {
    const list = PROCEDURES.filter(p => p.cat === c.id);
    const rows = list.map(p => p.prices.map(x => `
            <li><a href="operations/${p.slug}.html"><span class="what">${esc(p.title)}${x.v ? `<small>${esc(x.v)}</small>` : ''}</span><span class="num">${rub(x.p)}</span></a></li>`).join('')).join('');
    const count = list.reduce((n, p) => n + p.prices.length, 0);
    return `
        <details class="cat"${i === 0 ? ' open' : ''}>
          <summary><span>${esc(c.name)}</span><small>${count}</small></summary>
          <ul class="price-list">${rows}
          </ul>
        </details>`;
  }).join('');
}

// ---------- запись ----------
const opsDir = path.join(ROOT, 'operations');
fs.mkdirSync(opsDir, { recursive: true });
for (const f of fs.readdirSync(opsDir)) if (f.endsWith('.html')) fs.unlinkSync(path.join(opsDir, f));
for (const p of PROCEDURES) fs.writeFileSync(path.join(opsDir, p.slug + '.html'), pageHtml(p));

fs.writeFileSync(path.join(ROOT, 'assets', 'search-data.js'),
  '// Сгенерировано tools/build.js из data/procedures.js — не редактировать вручную\nwindow.BV_DATA = ' + JSON.stringify(searchData()) + ';\n');

const indexPath = path.join(ROOT, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const START = '<!-- SURGERY:START -->', END = '<!-- SURGERY:END -->';
const a = index.indexOf(START), b = index.indexOf(END);
if (a < 0 || b < 0) throw new Error('В index.html нет меток SURGERY:START / SURGERY:END');
index = index.slice(0, a + START.length) + homeBlock() + '\n        ' + index.slice(b);
fs.writeFileSync(indexPath, index);

const urls = ['', 'privacy.html', ...PROCEDURES.map(p => 'operations/' + p.slug + '.html')];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + '\n</urlset>\n');

const rows = PROCEDURES.reduce((n, p) => n + p.prices.length, 0);
console.log(`Готово: ${PROCEDURES.length} страниц, ${rows} строк прайса, ${CATEGORIES.length} категорий.`);
