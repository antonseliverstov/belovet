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
  const { ROOT, SITE, UI, clip, fitTitle, ogTags, iconTags, esc, rub, cap, plural, ver, SOURCES, PROCEDURES, PHONE, PHONE_HREF } = ctx;
  const posts = loadPosts(ROOT).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.priority - b.priority);
  const proc = slug => PROCEDURES.find(p => p.slug === slug);
  const minPrice = p => Math.min(...p.prices.map(x => x.p));
  const dateRu = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][m - 1]} ${y}`; };
  const slugify = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  for (const p of posts) for (const o of p.ops) if (!proc(o)) throw new Error(`Статья ${p.slug} ссылается на несуществующую операцию ${o}`);

  // ---------- страницы блога: та же дизайн-система, что у операций (tools/ui.js, assets/site.css) ----------
  const T = UI.T;
  const pageHero = UI.pageHero;
  function proseBlocks(blocks) {
    return blocks.map(b => {
      const [t] = b;
      if (t === 'h2') return `<h2 id="${slugify(b[1])}">${esc(b[1])}</h2>`;
      if (t === 'h3') return `<h3>${esc(b[1])}</h3>`;
      if (t === 'p') return `<p>${esc(b[1])}</p>`;
      if (t === 'ul') return `<ul>${b[1].map(x => `<li>${esc(cap(x))}</li>`).join('')}</ul>`;
      if (t === 'ol') return `<ol>${b[1].map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
      if (t === 'note') return `<aside class="prose-note"><b>${esc(b[1])}</b><p>${esc(b[2])}</p></aside>`;
      if (t === 'alarm') return UI.alertBox(b[2]).replace('>Срочно к врачу<', `>${esc(b[1].replace(/:$/, ''))}<`);
      if (t === 'table') return `<table class="prose-table"><caption>${esc(b[1])}</caption><thead><tr>${b[2].map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b[3].map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      if (t === 'op') { const o = proc(b[1]); if (!o) throw new Error('Нет операции ' + b[1]); return `<a class="prose-op" href="../operations/${o.slug}.html"><b>${esc(o.title)}</b><span>${esc(o.lead)}</span><em>${o.prices.length > 1 ? 'от ' : ''}${rub(minPrice(o))}</em></a>`; }
      throw new Error('Неизвестный блок ' + t);
    }).join('\n');
  }
  const postCard = (p, prefix) => `<a class="post" href="${prefix}${p.slug}.html" data-rubric="${p.rubric}"><span class="t" style="${T(21, 29)}">${esc(RUBRICS[p.rubric])}</span><b>${esc(p.title)}</b><span class="t" style="${T(23, 33)}">${esc(p.lead.length > 150 ? p.lead.slice(0, p.lead.lastIndexOf(' ', 148)) + '…' : p.lead)}</span><span class="post-read t" style="${T(25, 34)}">Читать →</span></a>`;
  const short = o => { const s = o.lead.split(/(?<=\.)\s/)[0]; return s.length > 150 ? s.slice(0, s.lastIndexOf(' ', 146)) + '…' : s; };
  const sourceHtml = s => typeof s === 'string' ? esc(SOURCES[s]) : (s.url ? `${esc(s.text)}: <a href="${s.url}" target="_blank" rel="noopener">${s.url}</a>` : esc(s.text));

  function postHtml(p) {
    const pre = '../';
    const body = proseBlocks(p.blocks);
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
    const title = fitTitle(`${p.title} | Блог beloVET`, `${p.title} | beloVET`, p.title);
    const ops = p.ops.slice(0, 3).map(proc).map(o => Object.assign({}, o, { short: short(o) }));
    return `${UI.head({ title, desc, url, prefix: pre, ld, ogTags: ogTags(title, desc, url, 'article'), iconTags: iconTags(pre) })}
<body>
<main>
${pageHero(pre, [['Главная', pre + 'index.html'], ['Блог', 'index.html'], [RUBRICS[p.rubric], `index.html#${p.rubric}`]], p.title, p.lead,
    ['Автор: Владислав Белорыбец, ветеринарный хирург', `<time datetime="${p.date}">${dateRu(p.date)}</time>`, `${minutes} ${plural(minutes, ['минута', 'минуты', 'минут'])} чтения`])}
<section class="fx" style="--bg:#fff">
  <article class="sx prose">
    <div class="takeaways"><p>Главное из статьи</p><ul>${p.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
${body}
  </article>
</section>
${UI.faq(p.faq, 'Частые вопросы')}
${ops.length ? UI.others(pre, 'Операции\nпо теме', ops, minPrice) : ''}
${related.length ? `<section class="fx" style="--bg:var(--ice)"><div class="sx"><h2 class="t o up" style="${T(88, 96)};margin-bottom:calc(52 * var(--px))">Читайте также</h2><div class="posts">${related.map(r => postCard(r, '')).join('')}</div></div></section>` : ''}
${UI.sources(p.sources.map(sourceHtml), `Статья подготовлена по учебникам и клиническим руководствам по ветеринарной хирургии. Дата проверки: ${dateRu(p.updated || p.date)}.`, 'Статья носит ознакомительный характер и не заменяет осмотр. Если питомцу плохо — звоните врачу.')}
${UI.book(pre, 'Остались\nвопросы?', 'Опишите ситуацию и прикрепите анализы или снимки — отвечу, что делать дальше.')}
</main>
${UI.footer(pre)}
</body>
</html>
`;
  }

  // ---------- лента ----------
  function indexHtml() {
    const pre = '../';
    const used = Object.keys(RUBRICS).filter(r => posts.some(p => p.rubric === r));
    const url = `${SITE}blog/`;
    const desc = 'Статьи ветеринарного хирурга для владельцев собак и кошек: что делать в экстренных ситуациях, как подготовить питомца к операции и ухаживать после неё.';
    const ld = [{ '@context': 'https://schema.org', '@type': 'Blog', name: 'Блог beloVET', description: desc, url, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}blog/${p.slug}.html`, datePublished: p.date })) }];
    const title = 'Блог ветеринарного хирурга для владельцев собак и кошек | beloVET';
    return `${UI.head({ title, desc, url, prefix: pre, type: 'website', ld, ogTags: ogTags(title, desc, url, 'website'), iconTags: iconTags(pre) })}
<body>
<main>
${pageHero(pre, [['Главная', pre + 'index.html'], ['Блог', '']], 'Полезное владельцам', 'Что делать в экстренной ситуации, как подготовить питомца к операции и как ухаживать за ним после — простым языком, со ссылками на ветеринарные источники.')}
<section class="fx" style="--bg:#fff">
  <div class="sx">
    <div class="chips" role="group" aria-label="Рубрики" style="margin-top:0;margin-bottom:calc(48 * var(--px))">
      <button class="chip on" type="button" data-filter="">Все статьи</button>
      ${used.map(r => `<button class="chip" type="button" data-filter="${r}" id="${r}">${esc(RUBRICS[r])}</button>`).join('')}
    </div>
    <div class="posts">${posts.map(p => postCard(p, '')).join('')}</div>
  </div>
</section>
${UI.book(pre)}
</main>
${UI.footer(pre)}
<script>
// Фильтр по рубрикам; ссылка вида blog/#urgent сразу открывает рубрику
(function () {
  var chips = document.querySelectorAll('.chip'), cards = document.querySelectorAll('.post');
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
  for (const p of posts) fs.writeFileSync(path.join(dir, p.slug + '.html'), UI.fitWords(postHtml(p)));
  fs.writeFileSync(path.join(dir, 'index.html'), UI.fitWords(indexHtml()));
  fs.writeFileSync(path.join(ROOT, 'brand', 'blog-plan.md'), planMd());

  // блок «Полезное владельцам» на главной — три последние статьи
  // Блок на главной по макету Figma: первая статья — большая голубая карточка, две — списком справа
  const HOME_SLOTS = [
    { cls: 'post-main', box: '--x:72;--y:405;--w:850', cat: '--x:36;--y:40;--w:750;--fs:23;--lh:31', title: '--x:36;--y:120;--w:758;--fs:59;--lh:64', more: '--x:36;--y:574;--w:350;--fs:30;--lh:41' },
    { cls: 'post-side hh', box: '--x:1000;--y:449;--w:541;--hh:290', cat: '--x:0;--y:0;--w:541;--fs:21;--lh:29', title: '--x:0;--y:57;--w:541;--fs:44;--lh:48', more: '--x:0;--y:245;--w:541;--fs:25;--lh:34' },
    { cls: 'post-side hh', box: '--x:1000;--y:819;--w:541;--hh:330', cat: '--x:0;--y:0;--w:541;--fs:21;--lh:29', title: '--x:0;--y:57;--w:541;--fs:44;--lh:48', more: '--x:0;--y:280;--w:541;--fs:25;--lh:34' }
  ];
  const homeBlock = posts.slice(0, 3).map((p, i) => { const k = HOME_SLOTS[i]; return `
      <a class="a post ${k.cls}" style="${k.box}" href="blog/${p.slug}.html"><span class="a t" style="${k.cat}">${esc(RUBRICS[p.rubric])}</span><b class="a t o" style="${k.title}">${esc(p.title)}</b><span class="a t" style="${k.more}">Читать</span></a>`; }).join('');

  // статьи по операции — для страниц операций
  const postsFor = slug => posts.filter(p => p.ops.includes(slug));
  return { posts, homeBlock, postsFor, urls: ['blog/', ...posts.map(p => `blog/${p.slug}.html`)] };
};
