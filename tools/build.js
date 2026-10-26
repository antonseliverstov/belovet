// Сборка: статьи-страницы операций, данные поиска, блок «Ветеринарная хирургия» на главной, sitemap.
// Запуск из корня проекта: node tools/build.js
const fs = require('fs');
const path = require('path');
const { SOURCES, ACVS, CATEGORIES, PROCEDURES } = require('../data/procedures');
const ARTICLES = Object.assign({},
  require('../data/articles-1'), require('../data/articles-2'),
  require('../data/articles-3'), require('../data/articles-4'));

const ROOT = path.join(__dirname, '..');
const SITE = 'https://antonseliverstov.github.io/belovet/';
const PHONE = '+7 (939) 255-77-71';
const PHONE_HREF = 'tel:+79392557771';
const crypto = require("crypto");
const ver = f => crypto.createHash("md5").update(fs.readFileSync(path.join(ROOT, f))).digest("hex").slice(0, 8); // метка версии против кэша
const UPDATED = { iso: '2026-10-22', text: '22 октября 2026' }; // дата проверки материалов

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rub = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const catName = id => CATEGORIES.find(c => c.id === id).name;
const minPrice = p => Math.min(...p.prices.map(x => x.p));
// обрезка по границе слова: Яндекс показывает около 160 знаков описания
const clip = (t, n = 160) => t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[\s,.:;—-]+$/, '') + '…';
// title: самый длинный вариант, который укладывается в 70 знаков
const fitTitle = (...v) => v.find(t => t.length <= 70) || v[v.length - 1];
// общие строки <head>: Open Graph, иконки, манифест
const ogTags = (title, desc, url, type) => `<meta property="og:type" content="${type}">
<meta property="og:site_name" content="beloVET">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}assets/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary_large_image">`;
const iconTags = prefix => `<link rel="icon" type="image/png" href="${prefix}assets/logo-symbol.png">
<link rel="apple-touch-icon" href="${prefix}assets/apple-touch-icon.png">
<link rel="manifest" href="${prefix}site.webmanifest">
<meta name="theme-color" content="#0F2B45">`;
const plural = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];

// ---------- проверки данных ----------
const slugs = new Set();
for (const p of PROCEDURES) {
  if (slugs.has(p.slug)) throw new Error('Повтор slug: ' + p.slug);
  slugs.add(p.slug);
  if (!CATEGORIES.some(c => c.id === p.cat)) throw new Error('Нет категории: ' + p.cat);
  for (const s of p.sources) if (!SOURCES[s]) throw new Error('Нет источника ' + s + ' в ' + p.slug);
  if (!ARTICLES[p.slug]) throw new Error('Нет статьи для ' + p.slug);
}
for (const k of Object.keys(ARTICLES)) if (!slugs.has(k)) throw new Error('Статья без процедуры: ' + k);

// ---------- блог ----------
const BLOG = require('./blog')({ ROOT, SITE, clip, fitTitle, ogTags, iconTags, esc, rub, cap, plural, ver, SOURCES, PROCEDURES, PHONE, PHONE_HREF });

// ---------- шаблоны восстановления по типу вмешательства ----------
const TIMELINES = {
  soft: [
    ['День операции', 'Питомец просыпается под наблюдением и обычно уезжает домой в тот же день. Вечером возможны сонливость и неуверенная походка.'],
    ['1–3 день', 'Возвращаются аппетит и интерес к жизни. Обезболивающие — по схеме, шов осматриваем каждый день.'],
    ['4–10 день', 'Обычная жизнь с ограничениями: без прыжков и активных игр, воротник или попона.'],
    ['10–14 день', 'Контрольный осмотр и снятие швов. После этого ограничения обычно снимают.']
  ],
  onco: [
    ['День операции', 'Пробуждение под наблюдением, обезболивание. Чаще всего домой в тот же день.'],
    ['1–3 день', 'Обезболивающие по схеме, ежедневный осмотр шва, ограничение активности.'],
    ['7–14 день', 'Приходит результат гистологии. Обсуждаем, нужно ли дальнейшее лечение или достаточно наблюдения.'],
    ['10–14 день', 'Снятие швов и контрольный осмотр.'],
    ['Дальше', 'При злокачественных опухолях — контрольные осмотры по графику, который составит врач.']
  ],
  abdominal: [
    ['День операции', 'Наблюдение после наркоза, обезболивание, при необходимости — капельницы в стационаре.'],
    ['1–3 сутки', 'Начинаем кормить небольшими порциями. Домой — когда питомец ест, пьёт и хорошо себя чувствует.'],
    ['3–7 день', 'Дома: лёгкий корм, обезболивающие, контроль температуры, стула и мочеиспускания.'],
    ['10–14 день', 'Контрольный осмотр и снятие швов.'],
    ['3–4 недели', 'Постепенное возвращение к обычной активности.']
  ],
  thoracic: [
    ['День операции', 'Интенсивное наблюдение: давление, дыхание, ЭКГ, обезболивание, капельницы.'],
    ['1–3 сутки', 'Стационар: контроль анализов, постепенное кормление, уход за дренажами, если они стоят.'],
    ['3–7 день', 'Выписка при стабильном состоянии и лечение дома по подробной схеме.'],
    ['10–14 день', 'Снятие швов, контрольные анализы.'],
    ['4 недели', 'Возвращение к обычной жизни по разрешению врача.']
  ],
  ortho: [
    ['День операции', 'Блокада нервов и обезболивание. Иногда — ночь в стационаре.'],
    ['1–14 день', 'Строгий покой: клетка или маленькая комната, на улицу — только в туалет на коротком поводке. Контроль отёка.'],
    ['12–14 день', 'Снятие швов и осмотр.'],
    ['3–8 неделя', 'Постепенно увеличиваем прогулки на поводке, добавляем реабилитационные упражнения.'],
    ['6–12 неделя', 'Контрольный рентген. Возвращение к обычной нагрузке — только после него.']
  ],
  minor: [
    ['В день процедуры', 'Домой сразу после процедуры или после пробуждения от седации.'],
    ['Первые дни', 'Уход за раной по схеме врача, защита от вылизывания.'],
    ['1–2 недели', 'Контрольный осмотр, при необходимости — снятие швов или удаление дренажа.']
  ],
  anest: [
    ['Перед наркозом', 'Осмотр, анализы, голод 8–12 часов по рекомендации врача.'],
    ['Во время', 'Постоянный мониторинг жизненных показателей, многоуровневое обезболивание.'],
    ['После', 'Пробуждение под наблюдением, дома — отдых, тепло и спокойствие.']
  ]
};
const HOME_BASE = [
  'воротник или послеоперационная попона — пока не снимут швы',
  'обезболивающие и другие препараты — строго по схеме, не отменяйте их сами',
  'каждый день осматривайте шов: в первые дни допустимы лёгкое покраснение и небольшой отёк',
  'в первые сутки кормите небольшими порциями'
];
const ALARMS = ['кровотечение из раны или повязки', 'шов разошёлся, из него выделяется гной', 'температура выше 39,5 °C', 'отказ от еды больше суток, повторная рвота', 'выраженная вялость, бледные дёсны, тяжёлое дыхание'];

const PREP_BASE = [
  'осмотр и сбор анамнеза: какие болезни были, какие лекарства принимает питомец',
  'анализы крови, а по показаниям — УЗИ, рентген, ЭКГ',
  'голод 8–12 часов перед наркозом; воду — по рекомендации врача',
  'смета и план операции до её начала'
];

// ---------- страница-статья ----------
function words(a, p) {
  const all = [p.lead, ...(a.what || []), ...(p.indications || []), ...(a.steps || []), p.recovery, p.risks, a.outlook || '',
    ...((a.faq || []).flat()), ...((a.types || []).flat()), ...(a.home || []), ...(a.prep || [])].join(' ');
  return all.split(/\s+/).length + 350; // + общие блоки
}

function pageHtml(p) {
  const a = ARTICLES[p.slug];
  const f = a.facts || {};
  const isOp = !['anest', 'postop'].includes(p.cat);
  const related = PROCEDURES.filter(x => x.cat === p.cat && x.slug !== p.slug).slice(0, 3);
  const priceNote = p.cat === 'anest'
    ? 'Степень анестезии определяет анестезиолог после осмотра.'
    : ['postop', 'wounds'].includes(p.cat)
      ? 'Если нужна седация или наркоз, их стоимость считается отдельно.'
      : 'Цена операции указана без наркоза, анализов, стационара и препаратов. Точную смету врач называет после осмотра.';

  // разделы и оглавление
  const toc = [];
  const sec = (id, title, html) => { toc.push([id, title]); return `<h2 id="${id}">${esc(title)}</h2>\n${html}`; };

  const factsList = [
    ['Длительность', f.duration], ['Анестезия', f.anes], ['Стационар', f.stay],
    ['Швы', f.sutures], ['Восстановление', f.recovery]
  ].filter(x => x[1] && x[1] !== '—');

  const autoFaq = [];
  if (f.duration && !/уточня|—|по ситуации|на время/.test(f.duration)) autoFaq.push(['Сколько длится операция?', `Обычно ${f.duration}. Точное время зависит от размера питомца и того, что хирург увидит во время операции.`]);
  if (isOp && f.stay && !/уточня|—/.test(f.stay)) autoFaq.push(['Когда можно забрать питомца домой?', cap(f.stay) + '. Домой отпускаем, когда питомец проснулся, стабилен и вы получили письменные рекомендации.']);
  if (isOp && f.sutures && !/—|уточня/.test(f.sutures)) autoFaq.push(['Когда снимают швы?', cap(f.sutures) + '. Если швы внутрикожные или рассасывающиеся, снимать их не нужно.']);
  const faq = [...(a.faq || []), ...autoFaq];

  let body = '';
  body += sec('chto-eto', 'Что это за операция', (a.what || [p.lead]).map(t => `<p>${esc(t)}</p>`).join('\n'));
  body += sec('kogda', isOp ? 'Когда нужна операция' : 'Когда это нужно',
    `<ul>${p.indications.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    + (a.redFlags && a.redFlags.length ? `<aside class="note note-alarm"><b>Срочно к врачу, если:</b><ul>${a.redFlags.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p>Запись: <a href="${PHONE_HREF}">${PHONE}</a>. По экстренной записи приеду в клинику за 15 минут в любое время, даже ночью. Тяжёлых пациентов принимаем без очереди.</p></aside>` : ''));
  body += sec('ceny', 'Варианты и цены',
    (a.types || []).map(t => `<h3>${esc(t[0])}</h3><p>${esc(t[1])}</p>`).join('')
    + `<div class="table"><table><caption>${esc(p.title)}: стоимость</caption><thead><tr><th>Вариант</th><th class="num">Цена</th></tr></thead><tbody>${p.prices.map(x => `<tr><td>${esc(x.v ? cap(x.v) : p.title)}</td><td class="num">${rub(x.p)}</td></tr>`).join('')}</tbody></table></div>`
    + `<p class="small">${esc(priceNote)}</p>`);
  if (p.cat !== 'anest') body += sec('podgotovka', 'Обследование и подготовка',
    `<ul>${[...(a.prep || []), ...(isOp ? PREP_BASE : [])].map(x => `<li>${esc(cap(x))}</li>`).join('')}</ul>`);
  else body += sec('podgotovka', 'Подготовка к наркозу', `<ul>${(a.prep || []).map(x => `<li>${esc(cap(x))}</li>`).join('')}</ul>`);
  body += sec('hod', isOp ? 'Как проходит операция' : 'Как это проходит',
    `<ol class="steps">${(a.steps || []).map(s => `<li>${esc(cap(s))}</li>`).join('')}</ol>`
    + (p.draft ? '<p class="note">Подробное описание этой позиции уточняется у хирурга.</p>' : ''));
  const tl = TIMELINES[a.profile || 'soft'];
  body += sec('vosstanovlenie', 'Восстановление по дням',
    `<p>${esc(p.recovery)}</p><ol class="timeline">${tl.map(r => `<li><b>${esc(r[0])}</b><span>${esc(r[1])}</span></li>`).join('')}</ol>`
    + '<p class="small">Сроки ориентировочные: врач скорректирует их по ходу восстановления.</p>');
  const home = [...(a.profile === 'anest' || a.profile === 'minor' ? [] : HOME_BASE), ...(a.home || [])];
  if (home.length) body += sec('doma', 'Уход дома', `<ul class="check">${home.map(h => `<li>${esc(cap(h))}</li>`).join('')}</ul>`);
  body += sec('oslozhneniya', 'Возможные осложнения',
    `<p>${esc(p.risks)}</p>`
    + (a.profile !== 'anest' ? `<aside class="note"><b>Покажите питомца врачу, если заметили:</b><ul>${ALARMS.map(x => `<li>${esc(x)}</li>`).join('')}</ul></aside>` : ''));
  if (a.outlook) body += sec('prognoz', 'Прогноз', `<p>${esc(a.outlook)}</p>`);

  body += `<div class="cta">
    <div>
      <p class="cta-title">Обсудим ваш случай</p>
      <p class="cta-text">Пришлите анализы, снимки и заключения — посмотрю и отвечу, нужна ли операция и как к ней подготовиться.</p>
    </div>
    <div class="cta-actions">
      <a class="btn btn-primary" href="../index.html?form=book">Записаться на приём</a>
      <a class="btn btn-light" href="../index.html?form=ask">Задать вопрос врачу</a>
    </div>
  </div>`;

  const sources = p.sources.map(k => `<li>${esc(SOURCES[k])}</li>`).join('')
    + (p.acvs || []).map(x => `<li>American College of Veterinary Surgeons. Small Animal Topics: <a href="${ACVS + x}/" target="_blank" rel="noopener">${ACVS + x}/</a></li>`).join('');
  body += sec('istochniki', 'Источники и дата проверки',
    `<p>Материал подготовлен по учебникам и клиническим руководствам по ветеринарной хирургии и проверен ${UPDATED.text}.</p><ol class="sources">${sources}</ol>`
    + '<p class="small">Информация носит ознакомительный характер и не заменяет осмотр. Нужна ли операция и какая, решает врач после обследования.</p>');
  body += sec('voprosy', 'Частые вопросы',
    `<div class="faq">${faq.map(q => `<details class="faq-item"><summary>${esc(q[0])}</summary><div class="faq-a"><p>${esc(q[1])}</p></div></details>`).join('')}</div>`);

  const textWords = body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(2, Math.round(textWords / 180));
  const desc = clip(`${p.title} у кошек и собак в Люберцах: ${p.lead.charAt(0).toLowerCase() + p.lead.slice(1)}`);
  const url = `${SITE}operations/${p.slug}.html`;
  const title = fitTitle(`${p.title} в Люберцах — цена, восстановление | beloVET`, `${p.title} в Люберцах — цена | beloVET`, `${p.title} в Люберцах | beloVET`, `${p.title} в Люберцах`);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: p.title, description: p.lead, dateModified: UPDATED.iso, inLanguage: 'ru',
      about: { '@type': 'MedicalProcedure', name: p.title, alternateName: p.aka } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Ветеринарная хирургия', item: SITE + '#prices' },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) }
  ];
  const tocHtml = `<ol>${toc.map(t => `<li><a href="#${t[0]}">${esc(t[1])}</a></li>`).join('')}</ol>`;

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Прототип: убрать noindex перед запуском -->
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${ogTags(title, desc, url, 'article')}
${iconTags('../')}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Onest:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../assets/page.css?v=${ver("assets/page.css")}">
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
</head>
<body>
<header class="header">
  <div class="wrap">
    <a class="logo" href="../index.html"><img class="sym" src="../assets/logo-symbol.png" alt=""><img class="word" src="../assets/logo-wordmark.png" alt="beloVET, ветеринарный врач-хирург"></a>
    <nav class="nav" aria-label="Разделы"><a href="../index.html#prices">Операции и цены</a><a href="../blog/index.html">Блог</a><a href="../index.html#urgent">Экстренно</a><a href="../index.html#contacts">Контакты</a></nav>
    <a class="phone num" href="${PHONE_HREF}">${PHONE}</a>
    <a class="btn btn-primary" href="../index.html?form=book">Записаться</a>
  </div>
</header>

<main class="article">
  <div class="wrap">
    <nav class="crumbs" aria-label="Навигация"><a href="../index.html">Главная</a><span>/</span><a href="../index.html#prices">Ветеринарная хирургия</a><span>/</span><span>${esc(catName(p.cat))}</span></nav>
    <header class="article-head">
      <span class="label">${esc(catName(p.cat))}</span>
      <h1>${esc(p.title)}${isOp ? ' у кошек и собак' : ''}</h1>
      <p class="meta"><span>Хирург: Владислав Белорыбец</span><span>Обновлено: <time datetime="${UPDATED.iso}">${UPDATED.text}</time></span><span>${minutes} ${plural(minutes, ["минута", "минуты", "минут"])} чтения</span></p>
      <p class="lead">${esc(p.lead)}</p>
    </header>

    <section class="cover" aria-label="Коротко об операции">
      <img class="cover-mark" src="../assets/cover-mark.jpg" alt="" width="680" height="924">
      <div class="cover-in">
        <p class="cover-title">Коротко</p>
        <dl class="facts">${factsList.map(x => `<div><dt>${esc(x[0])}</dt><dd>${esc(cap(x[1]))}</dd></div>`).join('')}</dl>
        <div class="cover-price"><span>Стоимость</span><b class="num">${p.prices.length > 1 ? 'от ' : ''}${rub(minPrice(p))}</b><a class="btn btn-primary" href="../index.html?form=book">Записаться</a></div>
      </div>
    </section>

    <div class="layout">
      <nav class="toc" aria-label="Содержание">
        <details open><summary>Содержание</summary>${tocHtml}</details>
      </nav>
      <div class="body">
${body}
      </div>
    </div>
  </div>

  ${BLOG.postsFor(p.slug).length ? `<section class="more more-posts">
    <div class="wrap">
      <h2>Статьи по теме</h2>
      <div class="cards">${BLOG.postsFor(p.slug).slice(0, 3).map(b => `<a class="card" href="../blog/${b.slug}.html"><span class="card-cat">Блог</span><b>${esc(b.title)}</b><span class="card-text">${esc(b.lead.length > 120 ? b.lead.slice(0, b.lead.lastIndexOf(' ', 118)) + '…' : b.lead)}</span><span class="card-more">Читать →</span></a>`).join('')}</div>
    </div>
  </section>` : ''}

  ${related.length ? `<section class="more">
    <div class="wrap">
      <h2>Другие операции раздела «${esc(catName(p.cat))}»</h2>
      <div class="cards">${related.map(r => `<a class="card" href="${r.slug}.html"><span class="card-cat">${esc(catName(r.cat))}</span><b>${esc(r.title)}</b><span class="card-text">${esc(r.lead.length > 120 ? r.lead.slice(0, r.lead.lastIndexOf(' ', 118)) + '…' : r.lead)}</span><span class="card-more"><span class="num">от ${rub(minPrice(r))}</span>Читать →</span></a>`).join('')}</div>
    </div>
  </section>` : ''}
</main>

<footer class="footer">
  <div class="wrap">
    <img src="../assets/logo-wordmark.png" alt="beloVET">
    <p>Владислав Белорыбец, ветеринарный врач-хирург. Клиника «Добрый Доктор», Люберцы, ул. Вертолётчиков, 11. Цены не являются публичной офертой. <a href="mailto:vladislav@belovet.ru">vladislav@belovet.ru</a> · <a href="../privacy.html">Политика конфиденциальности</a></p>
  </div>
</footer>
<script>
// На телефоне оглавление свёрнуто
if (matchMedia('(max-width: 960px)').matches) document.querySelector('.toc details').open = false;
</script>
</body>
</html>
`;
}

// ---------- данные поиска ----------
function searchData() {
  return {
    cats: CATEGORIES,
    items: PROCEDURES.map(p => ({ s: p.slug, c: p.cat, t: p.title, a: p.aka || '', v: p.prices.map(x => [x.v, x.p]), k: p.keywords }))
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
        <details class="cat">
          <summary><span>${esc(c.name)}</span><small>${count}</small></summary>
          <ul class="price-list">${rows}
          </ul>
        </details>`;
  }).join('');
}

// ---------- отзывы на главной ----------
const REVIEWS = require('../data/reviews');
// Отзывы по макету Figma: крупная карточка (первый отзыв), две малые справа, остальные — по кнопке «Все отзывы».
// Полный текст открывается в окне: данные лежат в <script id="rv-data">.
const RV_QUOTE = 'Владислав тут же'; // с этого места цитата в крупной карточке, как в макете
function reviewsBlock() {
  for (const r of REVIEWS) {
    if (r.slug && !slugs.has(r.slug)) throw new Error('Отзыв ссылается на несуществующую операцию: ' + r.slug);
    for (const ph of r.photos || []) if (!fs.existsSync(path.join(ROOT, 'assets', 'reviews', ph))) throw new Error('Нет файла отзыва: ' + ph);
  }
  const [main, ...others] = REVIEWS;
  const quote = main.text.includes(RV_QUOTE) ? main.text.slice(main.text.indexOf(RV_QUOTE)) : main.text;
  const who = r => `${esc(r.name)} · 5 / 5`;
  const top = `
      <article class="a rv rv-main rot hh" style="--x:64.83;--y:413.5;--w:870;--hh:814;--r:1">
        <img class="a hh" style="--x:36;--y:36;--w:214;--hh:214" src="assets/home/karamelka.jpg" width="182" height="181" alt="Кошка Карамелька" loading="lazy">
        <h3 class="a t o up" style="--x:286;--y:57;--w:540;--fs:58;--lh:63">${esc(main.tag).replace(' ', '<br>')}</h3>
        <p class="a t rv-txt" style="--x:36;--y:290;--w:790;--fs:29;--lh:40">«${esc(quote)}»</p>
        <p class="a t" style="--x:36;--y:677;--w:790;--fs:24;--lh:33">${who(main)}</p>
        <p class="a t" style="--x:36;--y:721;--w:790;--fs:20;--lh:27">${esc(main.date)}</p>
        <button class="a t rv-more-link" style="--x:36;--y:761;--w:400;--fs:23;--lh:31" type="button" data-rv="0">Читать полностью</button>
      </article>` + others.slice(0, 2).map((r, i) => `
      <button class="a rv rv-side${i === 0 ? ' ice' : ''}" style="--x:1010;--y:${i === 0 ? 424 : 844};--w:531" type="button" data-rv="${i + 1}" aria-label="Отзыв: ${esc(r.name)}, читать полностью">
        <span class="a t" style="--x:28;--y:25;--w:475;--fs:25;--lh:34">${who(r)}</span>
        <span class="a t" style="--x:28;--y:69;--w:475;--fs:19;--lh:26">${esc(r.date)}</span>
        <span class="a t rv-txt" style="--x:28;--y:113;--w:475;--fs:22;--lh:30">${esc(r.text.replace(/s+/g, ' '))}</span>
      </button>`).join('');
  const rest = others.slice(2).map((r, i) => `
        <button class="rv rv-card" type="button" data-rv="${i + 3}" aria-label="Отзыв: ${esc(r.name)}, читать полностью">
          <span class="t" style="--fs:25;--lh:34">${who(r)}</span>
          <span class="t" style="--fs:19;--lh:26">${esc(r.date)}</span>
          <span class="t rv-txt" style="--fs:22;--lh:30">${esc(r.text.replace(/s+/g, ' '))}</span>
        </button>`).join('');
  const data = REVIEWS.map(r => ({ n: r.name, d: r.date, t: r.text, tag: r.tag || '', s: r.slug || '' }));
  return { top: top + `
      <script type="application/json" id="rv-data">${JSON.stringify(data).replace(/</g, '\u003c')}</script>`, rest };
}

// ---------- SEO-блок <head> для страниц, написанных вручную ----------
function seoHead(html, name, block) {
  const S = '<!-- SEO:START -->', E = '<!-- SEO:END -->';
  const a = html.indexOf(S), b = html.indexOf(E);
  if (a < 0 || b < 0) throw new Error(`В ${name} нет меток SEO:START / SEO:END`);
  return html.slice(0, a + S.length) + '\n' + block + '\n' + html.slice(b);
}
function homeSeo() {
  const title = 'Владислав Белорыбец — ветеринарный хирург в Люберцах | beloVET';
  const desc = 'Ветеринарный врач-хирург Владислав Белорыбец. Плановые и экстренные операции кошкам и собакам в Люберцах, ул. Вертолётчиков, 11. Цены на операции.';
  const tel = PHONE_HREF.replace('tel:', '');
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'VeterinaryCare', '@id': SITE + '#clinic', name: 'beloVET — ветеринарный хирург Владислав Белорыбец', url: SITE,
      image: SITE + 'assets/og-image.jpg', logo: SITE + 'assets/icon-512.png', description: desc, telephone: tel, email: 'vladislav@belovet.ru',
      address: { '@type': 'PostalAddress', streetAddress: 'ул. Вертолётчиков, 11', addressLocality: 'Люберцы', addressRegion: 'Московская область', addressCountry: 'RU' },
      areaServed: [{ '@type': 'City', name: 'Люберцы' }, { '@type': 'City', name: 'Москва' }, { '@type': 'AdministrativeArea', name: 'Московская область' }],
      contactPoint: { '@type': 'ContactPoint', contactType: 'экстренная запись на приём', telephone: tel, availableLanguage: 'ru',
        hoursAvailable: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' } },
      employee: { '@id': SITE + '#doctor' } },
    { '@type': 'Person', '@id': SITE + '#doctor', name: 'Владислав Викторович Белорыбец', jobTitle: 'Ветеринарный врач-хирург', image: SITE + 'assets/doctor-hero.jpg', worksFor: { '@id': SITE + '#clinic' } },
    { '@type': 'WebSite', '@id': SITE + '#site', name: 'beloVET', url: SITE, inLanguage: 'ru', publisher: { '@id': SITE + '#clinic' } }
  ] };
  return `<link rel="canonical" href="${SITE}">
${ogTags(title, desc, SITE, 'website')}
${iconTags('')}
<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}
// 404: GitHub Pages отдаёт её по любому адресу, поэтому ссылки от корня сайта
function notFoundHtml() {
  const B = new URL(SITE).pathname;
  const top = PROCEDURES.slice(0, 6);
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Страница не найдена | beloVET</title>
<link rel="icon" type="image/png" href="${B}assets/logo-symbol.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Onest:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${B}assets/page.css?v=${ver('assets/page.css')}">
</head>
<body>
<header class="header">
  <div class="wrap">
    <a class="logo" href="${B}"><img class="sym" src="${B}assets/logo-symbol.png" alt=""><img class="word" src="${B}assets/logo-wordmark.png" alt="beloVET, ветеринарный врач-хирург"></a>
    <a class="phone num" href="${PHONE_HREF}">${PHONE}</a>
    <a class="btn btn-primary" href="${B}?form=book">Записаться</a>
  </div>
</header>
<main class="article">
  <div class="wrap">
    <header class="article-head">
      <span class="label">Ошибка 404</span>
      <h1>Такой страницы нет</h1>
      <p class="lead">Возможно, адрес изменился. Все операции и цены собраны на главной, там же есть поиск по симптомам. Если питомцу плохо, звоните ${PHONE}: по экстренной записи приеду в клинику за 15 минут в любое время, даже ночью. Тяжёлых пациентов принимаем без очереди.</p>
    </header>
    <section class="cards">
      <a class="card" href="${B}#prices"><b>Операции и цены</b><span class="card-text">Поиск по названию операции или симптому</span><span class="card-more">Открыть →</span></a>
      <a class="card" href="${B}blog/index.html"><b>Блог для владельцев</b><span class="card-text">Подготовка, восстановление, тревожные признаки</span><span class="card-more">Читать →</span></a>
      <a class="card" href="${B}?form=urgent"><b>Экстренная запись</b><span class="card-text">Приеду в клинику за 15 минут, даже ночью</span><span class="card-more">Оставить заявку →</span></a>
    </section>
  </div>
</main>
</body>
</html>
`;
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
index = index.replace(/assets\/(search-data|search)\.js(\?v=[0-9a-f]+)?/g, (m, n) => `assets/${n}.js?v=${ver('assets/' + n + '.js')}`);
const START = '<!-- SURGERY:START -->', END = '<!-- SURGERY:END -->';
const a = index.indexOf(START), b = index.indexOf(END);
if (a < 0 || b < 0) throw new Error('В index.html нет меток SURGERY:START / SURGERY:END');
index = index.slice(0, a + START.length) + homeBlock() + '\n        ' + index.slice(b);
const RS = '<!-- REVIEWS:START -->', RE = '<!-- REVIEWS:END -->';
const ra = index.indexOf(RS), rb = index.indexOf(RE);
if (ra < 0 || rb < 0) throw new Error('В index.html нет меток REVIEWS:START / REVIEWS:END');
const RV = reviewsBlock();
index = index.slice(0, ra + RS.length) + RV.top + '\n      ' + index.slice(rb);
const QS = '<!-- REVIEWS-REST:START -->', QE = '<!-- REVIEWS-REST:END -->';
const qa = index.indexOf(QS), qb = index.indexOf(QE);
if (qa < 0 || qb < 0) throw new Error('В index.html нет меток REVIEWS-REST:START / REVIEWS-REST:END');
index = index.slice(0, qa + QS.length) + RV.rest + '\n      ' + index.slice(qb);
const BS = '<!-- BLOG:START -->', BE = '<!-- BLOG:END -->';
const ba = index.indexOf(BS), bb = index.indexOf(BE);
if (ba < 0 || bb < 0) throw new Error('В index.html нет меток BLOG:START / BLOG:END');
index = index.slice(0, ba + BS.length) + BLOG.homeBlock + '\n        ' + index.slice(bb);
index = seoHead(index, 'index.html', homeSeo());
fs.writeFileSync(indexPath, index);
const privPath = path.join(ROOT, 'privacy.html');
fs.writeFileSync(privPath, seoHead(fs.readFileSync(privPath, 'utf8'), 'privacy.html',
  `<meta name="description" content="Как beloVET обрабатывает персональные данные из форм записи и вопросов врачу: какие данные собираем, зачем, сколько храним и как их удалить.">
<link rel="canonical" href="${SITE}privacy.html">
${iconTags('')}`));
fs.writeFileSync(path.join(ROOT, '404.html'), notFoundHtml());
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `# Прототип: перед запуском заменить «Disallow: /» на «Allow: /»
User-agent: *
Disallow: /

Sitemap: ${SITE}sitemap.xml
`);
fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
  name: 'beloVET — ветеринарный хирург', short_name: 'beloVET', lang: 'ru', start_url: './', display: 'browser',
  background_color: '#F9F6EF', theme_color: '#0F2B45',
  icons: [{ src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2) + '\n');

const urls = ['', 'privacy.html', ...PROCEDURES.map(p => 'operations/' + p.slug + '.html'), ...BLOG.urls];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED.iso}</lastmod></url>`).join('\n') + '\n</urlset>\n');

const rows = PROCEDURES.reduce((n, p) => n + p.prices.length, 0);
const wordsTotal = PROCEDURES.reduce((n, p) => n + words(ARTICLES[p.slug], p), 0);
console.log(`Готово: ${PROCEDURES.length} статей (~${Math.round(wordsTotal / 1000)} тыс. слов), ${rows} строк прайса, ${CATEGORIES.length} категорий.`);
