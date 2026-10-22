// Блог: лента, статьи, блок на главной, перелинковка с операциями, контент-план в brand/blog-plan.md.
// Подключается из tools/build.js.
const fs = require('fs');
const path = require('path');
const { RUBRICS, PLAN } = require('../data/blog-plan');

function loadPosts(ROOT) {
  const dir = path.join(ROOT, 'data', 'blog');
  const all = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) Object.assign(all, require(path.join(dir, f)));
  // статья публикуется, только если есть и в плане, и в текстах
  return PLAN.filter(p => all[p.slug]).map(p => Object.assign({}, p, all[p.slug]));
}

module.exports = function blog(ctx) {
  const { ROOT, SITE, clip, fitTitle, ogTags, iconTags, esc, rub, cap, plural, ver, SOURCES, PROCEDURES, PHONE, PHONE_HREF } = ctx;
  const posts = loadPosts(ROOT).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.priority - b.priority);
  const proc = slug => PROCEDURES.find(p => p.slug === slug);
  const minPrice = p => Math.min(...p.prices.map(x => x.p));
  const dateRu = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][m - 1]} ${y}`; };
  const slugify = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  for (const p of posts) for (const o of p.ops) if (!proc(o)) throw new Error(`Статья ${p.slug} ссылается на несуществующую операцию ${o}`);

  // ---------- блоки текста ----------
  function opCard(slug, prefix) {
    const p = proc(slug); if (!p) throw new Error('Нет операции ' + slug);
    return `<a class="op-card" href="${prefix}operations/${p.slug}.html"><span class="op-card-label">Операция</span><b>${esc(p.title)}</b><span class="op-card-text">${esc(p.lead)}</span><span class="op-card-more"><span class="num">${p.prices.length > 1 ? 'от ' : ''}${rub(minPrice(p))}</span>Подробнее →</span></a>`;
  }
  function renderBlocks(blocks, toc) {
    return blocks.map(b => {
      const [t] = b;
      if (t === 'h2') { const id = slugify(b[1]); toc.push([id, b[1]]); return `<h2 id="${id}">${esc(b[1])}</h2>`; }
      if (t === 'h3') return `<h3>${esc(b[1])}</h3>`;
      if (t === 'p') return `<p>${esc(b[1])}</p>`;
      if (t === 'ul') return `<ul>${b[1].map(x => `<li>${esc(cap(x))}</li>`).join('')}</ul>`;
      if (t === 'ol') return `<ol class="steps">${b[1].map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
      if (t === 'note') return `<aside class="note"><b>${esc(b[1])}</b><p>${esc(b[2])}</p></aside>`;
      if (t === 'alarm') return `<aside class="note note-alarm"><b>${esc(b[1])}</b><ul>${b[2].map(x => `<li>${esc(x)}</li>`).join('')}</ul><p><a href="${PHONE_HREF}">${PHONE}</a> — круглосуточно</p></aside>`;
      if (t === 'table') return `<div class="table"><table><caption>${esc(b[1])}</caption><thead><tr>${b[2].map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b[3].map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (t === 'op') return opCard(b[1], '../');
      throw new Error('Неизвестный блок ' + t);
    }).join('\n');
  }
  const sourceLi = s => typeof s === 'string'
    ? `<li>${esc(SOURCES[s])}</li>`
    : `<li>${s.url ? `${esc(s.text)}: <a href="${s.url}" target="_blank" rel="noopener">${s.url}</a>` : esc(s.text)}</li>`;

  const header = prefix => `<header class="header">
  <div class="wrap">
    <a class="logo" href="${prefix}index.html"><img class="sym" src="${prefix}assets/logo-symbol.png" alt=""><img class="word" src="${prefix}assets/logo-wordmark.png" alt="beloVET, ветеринарный врач-хирург"></a>
    <nav class="nav" aria-label="Разделы"><a href="${prefix}index.html#prices">Операции и цены</a><a href="${prefix}blog/index.html">Блог</a><a href="${prefix}index.html#urgent">Экстренно</a><a href="${prefix}index.html#contacts">Контакты</a></nav>
    <a class="phone num" href="${PHONE_HREF}">${PHONE}</a>
    <a class="btn btn-primary" href="${prefix}index.html?form=book">Записаться</a>
  </div>
</header>`;
  const footer = prefix => `<footer class="footer">
  <div class="wrap">
    <img src="${prefix}assets/logo-wordmark.png" alt="beloVET">
    <p>Владислав Белорыбец, ветеринарный врач-хирург. Клиника «Добрый Доктор», Люберцы, ул. Вертолётчиков, 11. <a href="mailto:vladislav@belovet.ru">vladislav@belovet.ru</a> · <a href="${prefix}blog/index.html">Блог</a> · <a href="${prefix}privacy.html">Политика конфиденциальности</a></p>
  </div>
</footer>`;
  const head = (title, desc, url, prefix, type, extra) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Прототип: убрать noindex перед запуском -->
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${ogTags(title, desc, url, type)}
${iconTags(prefix)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Onest:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${prefix}assets/page.css?v=${ver('assets/page.css')}">
${extra || ''}
</head>`;

  // ---------- страница статьи ----------
  function postHtml(p) {
    const toc = [];
    const body = renderBlocks(p.blocks, toc);
    toc.push(['istochniki', 'Источники'], ['voprosy', 'Частые вопросы']);
    const words = (p.lead + ' ' + body.replace(/<[^>]+>/g, ' ') + ' ' + p.faq.flat().join(' ')).split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(2, Math.round(words / 180));
    const url = `${SITE}blog/${p.slug}.html`;
    const desc = clip(p.lead);
    const related = posts.filter(x => x.slug !== p.slug && (x.rubric === p.rubric || x.ops.some(o => p.ops.includes(o)))).slice(0, 3);
    const ld = [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'ru', mainEntityOfPage: url, image: `${SITE}assets/og-image.jpg`,
        author: { '@type': 'Person', name: 'Владислав Белорыбец', jobTitle: 'Ветеринарный врач-хирург' }, publisher: { '@type': 'Organization', name: 'beloVET', logo: { '@type': 'ImageObject', url: `${SITE}assets/logo-symbol.png` } },
        keywords: [p.query, ...p.more].join(', ') },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Блог', item: `${SITE}blog/` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) }
    ];
    return `${head(fitTitle(`${p.title} | Блог beloVET`, `${p.title} | beloVET`, p.title), desc, url, '../', 'article', ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n'))}
<body>
${header('../')}
<main class="article">
  <div class="wrap">
    <nav class="crumbs" aria-label="Навигация"><a href="../index.html">Главная</a><span>/</span><a href="index.html">Блог</a><span>/</span><a href="index.html#${p.rubric}">${esc(RUBRICS[p.rubric])}</a></nav>
    <header class="article-head">
      <span class="label">${esc(RUBRICS[p.rubric])}</span>
      <h1>${esc(p.title)}</h1>
      <p class="meta"><span>Хирург: Владислав Белорыбец</span><span>Опубликовано: <time datetime="${p.date}">${dateRu(p.date)}</time></span><span>${minutes} ${plural(minutes, ['минута', 'минуты', 'минут'])} чтения</span></p>
      <p class="lead">${esc(p.lead)}</p>
    </header>
    <section class="cover cover-post" aria-label="Главное из статьи">
      <img class="cover-mark" src="../assets/cover-mark.jpg" alt="" width="680" height="924">
      <div class="cover-in">
        <p class="cover-title">Главное из статьи</p>
        <ul class="takeaways">${p.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
    </section>
    <div class="layout">
      <nav class="toc" aria-label="Содержание"><details open><summary>Содержание</summary><ol>${toc.map(t => `<li><a href="#${t[0]}">${esc(t[1])}</a></li>`).join('')}</ol></details></nav>
      <div class="body">
${body}
<div class="cta">
  <div><p class="cta-title">Остались вопросы?</p><p class="cta-text">Опишите ситуацию и прикрепите анализы или снимки — отвечу, что делать дальше. Экстренные звонки — круглосуточно: <a href="${PHONE_HREF}" style="color:#fff">${PHONE}</a></p></div>
  <div class="cta-actions"><a class="btn btn-primary" href="../index.html?form=ask">Задать вопрос врачу</a><a class="btn btn-light" href="../index.html?form=book">Записаться на приём</a></div>
</div>
<h2 id="istochniki">Источники</h2>
<p>Статья подготовлена по учебникам и клиническим руководствам по ветеринарной хирургии. Дата проверки: ${dateRu(p.updated || p.date)}.</p>
<ol class="sources">${p.sources.map(sourceLi).join('')}</ol>
<p class="small">Статья носит ознакомительный характер и не заменяет осмотр. Если питомцу плохо — звоните врачу.</p>
<h2 id="voprosy">Частые вопросы</h2>
<div class="faq">${p.faq.map(q => `<details class="faq-item"><summary>${esc(q[0])}</summary><div class="faq-a"><p>${esc(q[1])}</p></div></details>`).join('')}</div>
      </div>
    </div>
  </div>
  <section class="more">
    <div class="wrap">
      <h2>Операции по теме</h2>
      <div class="cards">${p.ops.slice(0, 3).map(o => opCard(o, '../').replace('class="op-card"', 'class="card op-card"')).join('')}</div>
      ${related.length ? `<h2 style="margin-top:40px">Читайте также</h2><div class="cards">${related.map(r => postCard(r, '')).join('')}</div>` : ''}
    </div>
  </section>
</main>
${footer('../')}
<script>if (matchMedia('(max-width: 960px)').matches) document.querySelector('.toc details').open = false;</script>
</body>
</html>
`;
  }

  function postCard(p, prefix) {
    return `<a class="card post-card" href="${prefix}${p.slug}.html" data-rubric="${p.rubric}"><span class="card-cat">${esc(RUBRICS[p.rubric])}</span><b>${esc(p.title)}</b><span class="card-text">${esc(p.lead.length > 150 ? p.lead.slice(0, p.lead.lastIndexOf(' ', 148)) + '…' : p.lead)}</span><span class="card-more">Читать →</span></a>`;
  }

  // ---------- лента ----------
  function indexHtml() {
    const used = Object.keys(RUBRICS).filter(r => posts.some(p => p.rubric === r));
    const url = `${SITE}blog/`;
    const desc = 'Статьи ветеринарного хирурга для владельцев собак и кошек: что делать в экстренных ситуациях, как подготовить питомца к операции и ухаживать после неё.';
    const ld = { '@context': 'https://schema.org', '@type': 'Blog', name: 'Блог beloVET', description: desc, url, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}blog/${p.slug}.html`, datePublished: p.date })) };
    return `${head('Блог ветеринарного хирурга для владельцев собак и кошек | beloVET', desc, url, '../', 'website', `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)}
<body>
${header('../')}
<main class="article">
  <div class="wrap">
    <nav class="crumbs" aria-label="Навигация"><a href="../index.html">Главная</a><span>/</span><span>Блог</span></nav>
    <header class="article-head">
      <span class="label">Блог</span>
      <h1>Полезное для владельцев собак и кошек</h1>
      <p class="lead">Что делать в экстренной ситуации, как подготовить питомца к операции и как ухаживать за ним после — простым языком, со ссылками на ветеринарные источники.</p>
    </header>
    <div class="chips" role="group" aria-label="Рубрики">
      <button class="chip on" type="button" data-filter="">Все статьи</button>
      ${used.map(r => `<button class="chip" type="button" data-filter="${r}" id="${r}">${esc(RUBRICS[r])}</button>`).join('')}
    </div>
    <div class="cards blog-cards">${posts.map(p => postCard(p, '')).join('')}</div>
  </div>
</main>
${footer('../')}
<script>
// Фильтр по рубрикам; ссылка вида blog/#urgent сразу открывает рубрику
(function () {
  var chips = document.querySelectorAll('.chip'), cards = document.querySelectorAll('.post-card');
  function apply(r) {
    chips.forEach(function (c) { c.classList.toggle('on', c.dataset.filter === r); });
    cards.forEach(function (c) { c.hidden = !!r && c.dataset.rubric !== r; });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.dataset.filter); history.replaceState(null, '', c.dataset.filter ? '#' + c.dataset.filter : location.pathname); }); });
  var h = location.hash.slice(1); if (h && document.querySelector('[data-filter="' + h + '"]')) apply(h);
})();
</script>
</body>
</html>
`;
  }

  // ---------- контент-план для команды ----------
  function planMd() {
    const pub = new Set(posts.map(p => p.slug));
    const intents = { symptom: 'симптом / что делать', howto: 'подготовка, уход', explain: 'что за болезнь', decide: 'сомнения, выбор' };
    let md = `# Контент-план блога beloVET\n\nСобирается автоматически из \`data/blog-plan.js\` командой \`node tools/build.js\`.\n\nТем: ${PLAN.length}, опубликовано: ${pub.size}. Приоритет — гипотеза до проверки частот в Вордстате и данных Вебмастера.\n\n`;
    for (const pr of [1, 2, 3]) {
      md += `## Приоритет ${pr}\n\n| Статус | Тема | Основной запрос | Тип | Рубрика | Операции |\n|---|---|---|---|---|---|\n`;
      for (const p of PLAN.filter(x => x.priority === pr)) {
        md += `| ${pub.has(p.slug) ? '✅ опубликовано' : 'в плане'} | ${p.title} | ${p.query}${p.more.length ? ' (+ ' + p.more.join(', ') + ')' : ''} | ${intents[p.intent]} | ${RUBRICS[p.rubric]} | ${p.ops.map(o => proc(o).title).join(', ')} |\n`;
      }
      md += '\n';
    }
    return md;
  }

  // ---------- запись ----------
  const dir = path.join(ROOT, 'blog');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) fs.unlinkSync(path.join(dir, f));
  for (const p of posts) fs.writeFileSync(path.join(dir, p.slug + '.html'), postHtml(p));
  fs.writeFileSync(path.join(dir, 'index.html'), indexHtml());
  fs.writeFileSync(path.join(ROOT, 'brand', 'blog-plan.md'), planMd());

  // блок «Полезное владельцам» на главной — три последние статьи
  const homeBlock = posts.slice(0, 3).map(p => `
          <a class="post" href="blog/${p.slug}.html"><span class="post-cat">${esc(RUBRICS[p.rubric])}</span><b>${esc(p.title)}</b><span class="post-more">Читать →</span></a>`).join('');

  // статьи по операции — для страниц операций
  const postsFor = slug => posts.filter(p => p.ops.includes(slug));
  return { posts, homeBlock, postsFor, urls: ['blog/', ...posts.map(p => `blog/${p.slug}.html`)] };
};
