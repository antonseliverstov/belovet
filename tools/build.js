// Сборка: статьи-страницы операций, данные поиска, блок «Ветеринарная хирургия» на главной, sitemap.
// Запуск из корня проекта: node tools/build.js
const fs = require('fs');
const path = require('path');
const { SOURCES, CATEGORIES, PROCEDURES } = require('../data/procedures');
const ARTICLES = Object.assign({},
  require('../data/articles-1'), require('../data/articles-2'),
  require('../data/articles-3'), require('../data/articles-4'));

const ROOT = path.join(__dirname, '..');
// ---------- Запуск ----------
// false — прототип на GitHub Pages, закрыт от поисковиков (noindex, Disallow: /).
// true  — боевой сайт на belovet.ru: открыт для индексации, пишется CNAME, скрыта полоса «Прототип».
// Перед переключением: DNS belovet.ru указывает на GitHub Pages, формы подключены, тексты 152-ФЗ вставлены.
// Боевая сборка для хостинга делается через tools/dist.js: он задаёт BV_LAUNCH=1 и собирает в отдельную папку.
const LAUNCH = process.env.BV_LAUNCH === '1';
// Разделы, которые можно выключить на боевом сайте (BV_BLOG=0, BV_FORMS=0):
// без блога — нет ссылок на статьи, блока на главной, sitemap и llms.txt без статей;
// без форм — вместо полей заявки показываются телефон и почта, политика без раздела о формах, consent.html не нужен.
const BLOG_ON = process.env.BV_BLOG !== '0';
const FORMS_ON = process.env.BV_FORMS !== '0';
const DOMAIN = 'belovet.ru';
const SITE = LAUNCH ? `https://${DOMAIN}/` : 'https://antonseliverstov.github.io/belovet/';
const ROBOTS = LAUNCH ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
const METRIKA_ID = LAUNCH ? '114175805' : ''; // счётчик Яндекс Метрики belovet.ru — только на боевом сайте (в прототипе не ставится); запуск после согласия посетителя (assets/consent.js)
const VERIFY = { yandex: '', google: '' }; // коды подтверждения Вебмастера и Search Console (если не через DNS)
// Адрес обработчика заявок; на боевом сайте — /api/lead.php (functions/lead.php, ставит tools/dist.js). Пусто — формы просят позвонить
const LEAD_URL = process.env.BV_LEAD_URL || '';
// Оператор персональных данных для privacy.html и consent.html. Пустые поля — [заполнить]; с ними LAUNCH не включится
const OPERATOR = { name: 'Белорыбец Владислав Викторович', status: 'самозанятый', inn: '712807539248', ogrnip: '', address: 'vladislav@belovet.ru' /* адрес для обращений = почта (решение 10.11.2026; нужен ли почтовый — уточнить у юриста) */, email: 'vladislav@belovet.ru', phone: '+7 (939) 255-77-71' };
const LEGAL_DATE = '11 ноября 2026'; // дата редакции политики и согласия
const LEGAL_VERSION = '2026-11-11-2'; // номер редакции согласия: уходит с каждой заявкой в журнал; при изменении текста — новая дата
// Волны блога, которые индексируются сразу; остальные статьи — только после вычитки врачом (data/blog-reviewed.js)
const OPEN_WAVES = [1, 2];
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
const FIGMA = require('../data/figma-ops');
const opSources = p => (p.sources || []).map(s => typeof s === 'string' ? { text: SOURCES[s] } : s).filter(s => s && s.text);
const UI = require('./ui')({ SITE, ROBOTS, METRIKA_ID, BLOG_ON, esc, rub, cap, ver, PHONE, PHONE_HREF });
const BLOG = require('./blog')({ ROOT, SITE, UI, clip, fitTitle, ogTags, iconTags, esc, rub, cap, plural, ver, PROCEDURES, PHONE, PHONE_HREF, SOURCES, LAUNCH, OPEN_WAVES });

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
  const fig = FIGMA[p.slug] || {};
  const isOp = !['anest', 'postop'].includes(p.cat);
  const pre = '../';
  const url = `${SITE}operations/${p.slug}.html`;

  // FAQ: свои вопросы + типовые по фактам
  const autoFaq = [];
  if (f.duration && !/уточня|—|по ситуации|на время/.test(f.duration)) autoFaq.push(['Сколько длится операция?', `Обычно ${f.duration}. Точное время зависит от размера питомца и того, что хирург увидит во время операции.`]);
  if (isOp && f.stay && !/уточня|—/.test(f.stay)) autoFaq.push(['Когда можно забрать питомца домой?', cap(f.stay) + '. Домой отпускаем, когда питомец проснулся, стабилен и вы получили письменные рекомендации.']);
  if (isOp && f.sutures && !/—|уточня/.test(f.sutures)) autoFaq.push(['Когда снимают швы?', cap(f.sutures) + '. Если швы внутрикожные или рассасывающиеся, снимать их не нужно.']);
  const faq = [...(a.faq || []), ...autoFaq];

  // 1. первый экран
  const species = /кот|кошк/i.test(p.title) ? 'У кошек' : /собак|кобел|сук/i.test(p.title) ? 'У собак' : /хорьк|хорёк/i.test(p.title) ? 'У хорьков' : (isOp ? 'У кошек и собак' : 'Для кошек и собак');
  const L = p.title.length;
  const auto = { fs: L <= 12 ? 182 : L <= 20 ? 150 : L <= 30 ? 120 : L <= 42 ? 100 : 84 };
  auto.lh = Math.round(auto.fs * 1.08);
  const heroPhoto = fig.hero ? fig.hero.photo : heroPhotoFor(p);
  const heroHtml = UI.hero(pre, Object.assign({
    title: p.title, sub: species, lead: p.lead, price: minPrice(p), priceFrom: p.prices.length > 1, photo: heroPhoto, alt: '',
    crumbs: [['Главная', pre + 'index.html'], ['Ветеринарная хирургия', pre + 'index.html#prices'], [catName(p.cat), pre + 'index.html#prices']]
  }, auto, fig.hero || {}, { photo: heroPhoto }));

  // 2. параметры
  const params = [['Длительность', f.duration], ['Анестезия', f.anes], ['Стационар', f.stay], ['Снятие швов', f.sutures], ['Восстановление', f.recovery]]
    .filter(x => x[1] && x[1] !== '—');

  // 3. смысл операции
  const what = a.what || [p.lead];
  const introHtml = fig.noIntro ? '' : UI.intro(pre, fig.intro || {
    bg: '#fff', heading: isOp ? 'Что это\nза операция' : 'Что это\nза процедура',
    paras: [what[0]],
    card: what[1] ? { title: 'Что важно знать', text: what[1] } : null,
    doodle: what[0].length < 330 && what[1] ? { file: 'm17-lines.png', x: 91.3, y: 668.3, w: 413.3 } : null
  });

  // 4–5. показания и срочно к врачу
  const red = a.redFlags && a.redFlags.length ? a.redFlags : null;
  const wf = fig.when || {};
  const embedAlert = red && (wf.embedAlert || !fig.when);
  const whenHtml = UI.when(pre, Object.assign({
    variant: 'rows', heading: isOp ? 'Когда нужна\nоперация' : 'Когда это\nнужно', items: p.indications.map(t => ({ text: t })),
    after: embedAlert ? UI.alertBox(red) : ''
  }, wf, { items: wf.items || p.indications.map(t => ({ text: t })), after: embedAlert ? UI.alertBox(red) : '' }));
  const alertHtml = red && !embedAlert ? UI.alert(red, wf.bg === '#fff' ? '#fff' : 'var(--milk)') : '';

  // 6. стоимость
  const priceNote = p.cat === 'anest'
    ? 'Степень анестезии определяет анестезиолог после осмотра.\nТочную смету врач называет после осмотра.'
    : ['postop', 'wounds'].includes(p.cat)
      ? 'Если нужна седация или наркоз, их стоимость считается отдельно.\nТочную смету врач называет после осмотра.'
      : 'Без наркоза, анализов, стационара и препаратов.\nТочную смету врач называет после осмотра.';
  const costHtml = UI.cost(pre, p.prices.map(x => [x.v ? cap(x.v) : p.title, x.p]), priceNote);

  // 7. акцент
  const acc = fig.accent || (fig.hero ? null : { type: p.cat === 'ortho' ? 'dvizhenie' : 'ponyatno', at: 'afterCost' });
  const accHtml = acc ? UI.accent(pre, acc) : '';

  // 8–12. общие блоки
  const prepItems = [...(a.prep || []), ...(isOp ? PREP_BASE.slice(0, 2) : [])];
  const prepHtml = p.cat === 'anest' && !prepItems.length ? '' : UI.prep(pre, prepItems.length ? prepItems : PREP_BASE.slice(0, 2));
  const howHtml = UI.how(pre, a.steps || [], isOp ? 'Как проходит\nоперация' : 'Как это\nпроходит', p.draft ? 'Подробное описание этой позиции уточняется у хирурга.' : '');
  const recHtml = UI.recovery(pre, p.recovery, TIMELINES[a.profile || 'soft']);
  const homeItems = [...(a.profile === 'anest' || a.profile === 'minor' ? [] : HOME_BASE), ...(a.home || [])].slice(0, 8);
  const homeHtml = homeItems.length ? UI.home(pre, homeItems) : '';
  const ctrlHtml = UI.control(pre, p.risks);

  // 13. прогноз
  const pg = fig.prognosis || (a.outlook ? { type: 'igrat' } : null);
  const pgHtml = pg ? UI.prognosis(pre, Object.assign({ text: a.outlook || p.recovery }, pg)) : '';

  // 15. больше по теме / другие операции
  const short = o => { const s = o.lead.split(/(?<=\.)\s/)[0]; return s.length > 150 ? s.slice(0, s.lastIndexOf(' ', 146)) + '…' : s; };
  const posts = BLOG.postsFor(p.slug);
  const list = PROCEDURES.filter(x => x.cat === p.cat), at = list.findIndex(x => x.slug === p.slug);
  const pick = [1, 2, 3].map(k => list[(at + k) % list.length]).filter((o, i, arr) => o.slug !== p.slug && arr.indexOf(o) === i).map(o => Object.assign({}, o, { short: short(o) }));
  const moreHtml = posts.length && BLOG_ON
    ? UI.more(pre, posts, pick, minPrice)
    : (pick.length ? UI.others(pre, `Другие операции\n${CAT_GEN[p.cat]}`, pick, minPrice) : '');


  const sections = [
    heroHtml, UI.params(params), introHtml, whenHtml, alertHtml,
    acc && acc.at === 'beforeCost' ? accHtml : '', costHtml, acc && acc.at === 'afterCost' ? accHtml : '',
    prepHtml, howHtml, acc && acc.at === 'afterHow' ? accHtml : '', recHtml, homeHtml, ctrlHtml, pgHtml,
    UI.faq(faq), UI.sources(opSources(p)), moreHtml, UI.book(pre)
  ].filter(Boolean);

  const desc = clip(`${p.title} у кошек и собак в Люберцах: ${p.lead.charAt(0).toLowerCase() + p.lead.slice(1)}`);
  const title = fitTitle(`${p.title} в Люберцах — цена, восстановление | beloVET`, `${p.title} в Люберцах — цена | beloVET`, `${p.title} в Люберцах | beloVET`, `${p.title} в Люберцах`);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: p.title, description: p.lead, dateModified: UPDATED.iso, inLanguage: 'ru',
      about: { '@type': 'MedicalProcedure', name: p.title, alternateName: p.aka }, citation: opSources(p).map(s => s.text) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Ветеринарная хирургия', item: SITE + '#prices' },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) }
  ];
  return `${UI.head({ title, desc, url, prefix: pre, ld, ogTags: ogTags(title, desc, url, 'article'), iconTags: iconTags(pre), preload: `${pre}assets/op/${heroPhoto.name}.jpg` })}
<body>
<main>
${sections.join('\n')}
</main>
${UI.footer(pre)}
</body>
</html>
`;
}

// Фото первого экрана для страниц без макета: из утверждённой серии, с теми же кадрированием и местом, что в Figma
const HERO_PHOTOS = {
  dog: { name: 'dachshund-nose', clip: { x: 1000, y: 380, w: 613, h: 740 }, x: -120, y: -370, w: 800 },
  dogBig: { name: 'black-dog', x: 853, y: 267, w: 760 },
  cat: { name: 'cat-tongue', clip: { x: 907, y: 485, w: 788, h: 760 }, x: -280, y: 0, w: 1150 },
  catUp: { name: 'ginger-cat', x: 880, y: 440, w: 860 }
};
const HERO_BY_CAT = { general: 'dog', abdominal: 'catUp', onco: 'dogBig', ortho: 'dog', uro: 'catUp', repro: 'cat', wounds: 'cat', postop: 'dogBig', anest: 'catUp' };
function heroPhotoFor(p) {
  if (/кот|кошк/i.test(p.title)) return HERO_PHOTOS[p.cat === 'uro' ? 'catUp' : 'cat'];
  if (/собак|кобел/i.test(p.title)) return HERO_PHOTOS.dogBig;
  return HERO_PHOTOS[HERO_BY_CAT[p.cat] || 'dog'];
}
const CAT_GEN = { general: 'общей хирургии', abdominal: 'в брюшной и грудной полости', onco: 'онкологической хирургии', ortho: 'ортопедии и травматологии', uro: 'урологии', repro: 'репродуктивной хирургии', wounds: 'на ранах и коже', postop: 'после операции', anest: 'анестезии' };

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
// Показываются только отзывы авторов, давших согласие на распространение (data/reviews-consent.js)
const REVIEWS_CONSENT = require('../data/reviews-consent');
const SHOWN = REVIEWS.filter(r => REVIEWS_CONSENT[r.name]);
function reviewsBlock() {
  for (const r of REVIEWS) {
    if (r.slug && !slugs.has(r.slug)) throw new Error('Отзыв ссылается на несуществующую операцию: ' + r.slug);
    for (const ph of r.photos || []) if (!fs.existsSync(path.join(ROOT, 'assets', 'reviews', ph))) throw new Error('Нет файла отзыва: ' + ph);
  }
  // Пока согласий нет: остаются заголовок, абзац про Яндекс Карты и кнопка перехода (см. .s-reviews[data-empty])
  if (!SHOWN.length) return { top: `
      <script type="application/json" id="rv-data">[]</script>`, rest: '' };
  const [main, ...others] = SHOWN;
  const quote = main.text.includes(RV_QUOTE) ? main.text.slice(main.text.indexOf(RV_QUOTE)) : main.text;
  const who = r => `${esc(r.name)} · 5 / 5`;
  const top = `
      <article class="a rv rv-main rot hh" style="--x:64.83;--y:413.5;--w:870;--hh:814;--r:1">
        ${main === REVIEWS[0] ? '<img class="a hh" style="--x:36;--y:36;--w:214;--hh:214" src="assets/home/karamelka.jpg" width="182" height="181" alt="Кошка Карамелька" loading="lazy">' : ''}
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
  const data = SHOWN.map(r => ({ n: r.name, d: r.date, t: r.text, tag: r.tag || '', s: r.slug || '' }));
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
      contactPoint: { '@type': 'ContactPoint', contactType: 'запись на приём', telephone: tel, availableLanguage: 'ru',
        hoursAvailable: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '10:00', closes: '22:00' } },
      employee: { '@id': SITE + '#doctor' } },
    { '@type': 'Person', '@id': SITE + '#doctor', name: 'Владислав Викторович Белорыбец', jobTitle: 'Ветеринарный врач-хирург', image: SITE + 'assets/doctor-hero.jpg', worksFor: { '@id': SITE + '#clinic' } },
    { '@type': 'WebSite', '@id': SITE + '#site', name: 'beloVET', url: SITE, inLanguage: 'ru', publisher: { '@id': SITE + '#clinic' } }
  ] };
  return `<link rel="canonical" href="${SITE}">
${ogTags(title, desc, SITE, 'website')}
${iconTags('')}
<script type="application/ld+json">${JSON.stringify(ld)}</script>${VERIFY.yandex ? `
<meta name="yandex-verification" content="${VERIFY.yandex}">` : ''}${VERIFY.google ? `
<meta name="google-site-verification" content="${VERIFY.google}">` : ''}${UI.metrika() ? '\n' + UI.metrika().trimEnd() : ''}`;
}
// Политика конфиденциальности: заготовка до юридических текстов по 152-ФЗ

// 404: GitHub Pages отдаёт её по любому адресу, поэтому ссылки от корня сайта
function notFoundHtml() {
  const B = new URL(SITE).pathname;
  const title = 'Страница не найдена | beloVET';
  const cards = [
    [`${B}index.html#prices`, 'Операции и цены', 'Поиск по названию операции или симптому', 'Открыть →'],
    BLOG_ON ? [`${B}blog/index.html`, 'Блог для владельцев', 'Подготовка, восстановление, тревожные признаки', 'Читать →'] : [`${B}index.html#contacts`, 'Контакты', 'Адрес клиники, график приёма и как добраться', 'Открыть →'],
    [`${B}index.html#ask`, 'Вопрос врачу', 'Опишите, что беспокоит питомца, — подберу статьи и отвечу', 'Задать вопрос →']
  ];
  return `${UI.head({ title, desc: 'Такой страницы нет.', url: '', prefix: B, type: 'website', robots: 'noindex', ogTags: '', iconTags: `<link rel="icon" type="image/png" href="${B}assets/logo-symbol.png">` })}
<body>
<main>
${UI.pageHero(B, [['Главная', B + 'index.html'], ['Ошибка 404', '']], 'Такой страницы нет', `Возможно, адрес изменился. Все операции и цены собраны на главной, там же есть поиск по симптомам. Если питомцу плохо, позвоните ${PHONE} в часы приёма, с 10:00 до 22:00, или задайте вопрос врачу на главной.`, null,
  { sub: 'Ошибка 404', photo: { name: 'terrier', x: 1000, y: 400, w: 566 } })}
<section class="fx" style="--bg:#fff">
  <div class="sx">
    <div class="posts">${cards.map(([h, b, t, m]) => `<a class="post" href="${h}"><b>${b}</b><span class="t" style="${UI.T(23, 33)}">${t}</span><span class="post-read t" style="${UI.T(25, 34)}">${m}</span></a>`).join('')}</div>
  </div>
</section>
</main>
${UI.footer(B)}
</body>
</html>
`;
}

// ---------- запись ----------
const opsDir = path.join(ROOT, 'operations');
fs.mkdirSync(opsDir, { recursive: true });
for (const f of fs.readdirSync(opsDir)) if (f.endsWith('.html')) fs.unlinkSync(path.join(opsDir, f));
for (const p of PROCEDURES) fs.writeFileSync(path.join(opsDir, p.slug + '.html'), UI.fitWords(pageHtml(p)));

fs.writeFileSync(path.join(ROOT, 'assets', 'search-data.js'),
  '// Сгенерировано tools/build.js из data/procedures.js — не редактировать вручную\nwindow.BV_DATA = ' + JSON.stringify(searchData()) + ';\n');

// Индекс статей для блока «Вопрос врачу» (assets/ask.js подбирает статьи по описанию проблемы).
// Только при включённом блоге; операции ask.js берёт из search-data.js.
{
  const { RUBRICS } = require('../data/blog-plan');
  const species = s => { const t = s.toLowerCase(); const c = /(кош|кот|котён|котен)/.test(t), d = /(собак|щен|кобел|сук[аиу]\b|пёс|пес\b)/.test(t); return c && !d ? 'c' : d && !c ? 'd' : ''; };
  const short = s => s.length > 130 ? s.slice(0, s.lastIndexOf(' ', 128)) + '…' : s;
  const posts = BLOG_ON ? BLOG.posts.map(p => ({
    s: p.slug, t: p.title, r: RUBRICS[p.rubric] || '', u: p.rubric === 'urgent' ? 1 : 0,
    k: [p.query, ...(p.more || []), ...p.blocks.filter(b => b[0] === 'h2').map(b => b[1]), ...p.faq.map(q => q[0])].join(' | '),
    l: short(p.lead), a: species(p.title + ' ' + p.query)
  })) : [];
  fs.writeFileSync(path.join(ROOT, 'assets', 'ask-data.js'),
    '// Сгенерировано tools/build.js — индекс статей для блока «Вопрос врачу»\nwindow.BV_ASK = ' + JSON.stringify({ posts }) + ';\n');
}

const indexPath = path.join(ROOT, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/assets\/(search-data|search|ask|ask-data|fx)\.js(\?v=[0-9a-f]+)?/g, (m, n) => `assets/${n}.js?v=${ver('assets/' + n + '.js')}`);
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
index = index.replace(/<section class="fx s-reviews"[^>]*>/, `<section class="fx s-reviews" id="reviews" aria-labelledby="reviews-h"${SHOWN.length ? '' : ' data-empty'}>`);
index = index.replace(/(?:<!-- Прототип:[^\n]*-->\n)?<meta name="robots" content="[^"]*">/, UI.robotsTag());
index = index.replace(/<html lang="ru"[^>]*>/, !FORMS_ON ? '<html lang="ru" data-forms="off">' : LEAD_URL ? `<html lang="ru" data-lead="${LEAD_URL}" data-consent-version="${LEGAL_VERSION}">` : '<html lang="ru">');
if (!FORMS_ON) index = index.replace(/\s*<div class="consent">[\s\S]*?<\/div>/g, ''); // без ссылок на согласие
if (!FORMS_ON) index = index.replace(/\s*<form class="ask-contact"[\s\S]*?<\/form>/, ''); // «Вопрос врачу» без отправки: остаются телефон и почта
if (!BLOG_ON) {
  index = index.replace(/\s*<!-- 09 \/ Полезное владельцам -->\s*<section class="fx s-blog"[\s\S]*?<\/section>/, '');
  index = index.replace(/\s*<a [^>]*href="blog\/"[^>]*>[^<]*<\/a>/g, '');
}
index = index.replace(/<div class="proto"( hidden)?>/, LAUNCH ? '<div class="proto" hidden>' : '<div class="proto">');
fs.writeFileSync(indexPath, UI.fitWords(index));
const LEGAL = require('./legal')({ SITE, UI, ogTags, iconTags, esc, OPERATOR, LEGAL_DATE, LEGAL_VERSION, FORMS_ON, METRIKA_ID });
if (LAUNCH && FORMS_ON && LEGAL.missing.length) throw new Error('LAUNCH: не заполнены данные оператора в OPERATOR: ' + LEGAL.missing.join(', '));
if (LAUNCH && FORMS_ON && !LEAD_URL) console.warn('Внимание: LAUNCH без LEAD_URL — формы не отправляют заявки');
fs.writeFileSync(path.join(ROOT, 'privacy.html'), UI.fitWords(LEGAL.privacy));
if (FORMS_ON) fs.writeFileSync(path.join(ROOT, 'consent.html'), UI.fitWords(LEGAL.consent));
else if (fs.existsSync(path.join(ROOT, 'consent.html'))) fs.unlinkSync(path.join(ROOT, 'consent.html'));
fs.writeFileSync(path.join(ROOT, 'legal-version.txt'), LEGAL_VERSION + '\n'); // для tools/dist.js: архив редакций согласия
fs.writeFileSync(path.join(ROOT, '404.html'), UI.fitWords(notFoundHtml()));
fs.writeFileSync(path.join(ROOT, 'robots.txt'), LAUNCH ? `# Сайт открыт для поисковых систем и ИИ-ассистентов (GPTBot, ClaudeBot, PerplexityBot, YandexGPT и др.)
User-agent: *
Allow: /
Disallow: /brand/
Disallow: /materials/
Disallow: /tools/
Disallow: /data/
Disallow: /README.md
Disallow: /functions/
Disallow: /api/
Disallow: /vychitka/
Clean-param: form /

Sitemap: ${SITE}sitemap.xml
` : `# Прототип: закрыт от индексации. Открывается переключателем LAUNCH в tools/build.js
User-agent: *
Disallow: /

Sitemap: ${SITE}sitemap.xml
`);
// Ссылки на канонические адреса: «index.html» → каталог («./», «../», «blog/»)
const canonLinks = h => h.replace(/href="((?:\.\.\/)*|\/[^"]*?\/|\/)?(blog\/)?index\.html([#?][^"]*)?"/g, (m, pre = '', dir = '', rest = '') => `href="${(pre + dir) || './'}${rest}"`);
for (const f of ['index.html', 'privacy.html', 'consent.html', '404.html', ...fs.readdirSync(path.join(ROOT, 'operations')).map(f => 'operations/' + f), ...fs.readdirSync(path.join(ROOT, 'blog')).map(f => 'blog/' + f)]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const h = fs.readFileSync(p, 'utf8'), n = canonLinks(h);
  if (n !== h) fs.writeFileSync(p, n);
}
// Страница вычитки статей врачом (закрыта от поиска): vychitka/index.html
{
  const rows = require('./review/recs')(ROOT);
  const tpl = fs.readFileSync(path.join(__dirname, 'review', 'template.html'), 'utf8');
  const head = "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n</head>\n<body>\n";
  const data = JSON.stringify(rows).replace(/</g, "\\u003c");
  const cut = tpl.indexOf("<header"), headPart = tpl.slice(0, cut), bodyPart = tpl.slice(cut).replace("__DATA__", () => data);
  const page = head.replace("</head>", headPart + "</head>") + bodyPart + "\n</body>\n</html>\n";
  fs.mkdirSync(path.join(ROOT, 'vychitka'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'vychitka', 'index.html'), page);
}
// CNAME для своего домена на GitHub Pages
const cnamePath = path.join(ROOT, 'CNAME');
if (LAUNCH) fs.writeFileSync(cnamePath, DOMAIN + '\n'); else if (fs.existsSync(cnamePath)) fs.unlinkSync(cnamePath);
fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
  name: 'beloVET — ветеринарный хирург', short_name: 'beloVET', lang: 'ru', start_url: './', display: 'browser',
  background_color: '#F9F6EF', theme_color: '#0F2B45',
  icons: [{ src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2) + '\n');

const urls = ['', 'privacy.html', ...(FORMS_ON ? ['consent.html'] : []), ...PROCEDURES.map(p => 'operations/' + p.slug + '.html'), ...(BLOG_ON ? BLOG.urls : [])];
// Главная показывает свежие статьи, поэтому её дата — не раньше самой свежей статьи
const lastmodOf = u => BLOG.lastmod[u] || (u === '' ? [UPDATED.iso, BLOG.lastmod['blog/']].filter(Boolean).sort().pop() : UPDATED.iso);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmodOf(u)}</lastmod></url>`).join('\n') + '\n</urlset>\n');

// llms.txt: краткая карта сайта для ИИ-поисковиков (формат llmstxt.org)
const byCat = CATEGORIES.map(c => `### ${c.name}\n\n` + PROCEDURES.filter(p => p.cat === c.id)
  .map(p => `- [${p.title}](${SITE}operations/${p.slug}.html): ${p.lead}`).join('\n')).join('\n\n');
fs.writeFileSync(path.join(ROOT, 'llms.txt'), `# beloVET — Владислав Белорыбец, ветеринарный врач-хирург

> Хирургия собак и кошек в Люберцах: клиника «Добрый Доктор», ул. Вертолётчиков, 11. Плановые и экстренные операции: цены, подготовка, ход операции и восстановление. Телефон +7 (939) 255-77-71.

- [Главная](${SITE}): о враче, направления хирургии, отзывы, контакты и график приёма
${BLOG_ON ? `- [Блог](${SITE}blog/): статьи для владельцев о симптомах, первой помощи и операциях\n` : ''}
## Операции и цены

${byCat}
${BLOG_ON ? `
## Статьи

${BLOG.posts.filter(p => p.indexable).map(p => `- [${p.title}](${SITE}blog/${p.slug}.html): ${p.lead}`).join('\n')}
` : ''}`);

const rows = PROCEDURES.reduce((n, p) => n + p.prices.length, 0);
const wordsTotal = PROCEDURES.reduce((n, p) => n + words(ARTICLES[p.slug], p), 0);
console.log(`Готово: ${PROCEDURES.length} статей (~${Math.round(wordsTotal / 1000)} тыс. слов), ${rows} строк прайса, ${CATEGORIES.length} категорий.`);
