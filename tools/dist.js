// Боевая сборка belovet.ru для хостинга Timeweb: node tools/dist.js
// Собирает сайт в режиме запуска (BV_LAUNCH=1) во временной копии проекта, чтобы не трогать прототип на GitHub Pages,
// и кладёт в dist/ только публичные файлы. Разделы выключаются переменными: BV_BLOG=0 (без блога), BV_FORMS=0 (без форм).
// По умолчанию — без блога, с формами (формы включены 12.11.2026, юрист дал добро). BV_FORMS=0 — собрать без форм.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const env = Object.assign({}, process.env, {
  BV_LAUNCH: '1',
  BV_BLOG: process.env.BV_BLOG || '0',
  BV_FORMS: process.env.BV_FORMS || '1'
});
// С формами заявки уходят на свой обработчик на хостинге (functions/lead.php → /api/lead.php)
if (env.BV_FORMS !== '0') env.BV_LEAD_URL = env.BV_LEAD_URL || '/api/lead.php';
const BLOG_ON = env.BV_BLOG !== '0';

// 1. Временная копия проекта (без .git, исходников врача, node_modules и прошлой сборки)
const SKIP = new Set(['.git', '.claude', 'materials', 'node_modules', 'dist']);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belovet-dist-'));
function copy(src, dst) {
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copy(s, d); }
    else fs.copyFileSync(s, d);
  }
}
copy(ROOT, tmp);

// 2. Сборка в боевом режиме
execFileSync(process.execPath, [path.join(tmp, 'tools', 'build.js')], { env, stdio: 'inherit' });

// 3. В dist — только то, что нужно на хостинге
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
const PUBLIC = ['index.html', '404.html', 'privacy.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'site.webmanifest', 'assets', 'operations'];
if (env.BV_FORMS !== '0') PUBLIC.push('consent.html');
if (BLOG_ON) PUBLIC.push('blog');
for (const name of PUBLIC) {
  const s = path.join(tmp, name), d = path.join(DIST, name);
  if (!fs.existsSync(s)) throw new Error('Нет файла сборки: ' + name);
  if (fs.statSync(s).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copy(s, d); } else fs.copyFileSync(s, d);
}
// Файлы подтверждения прав на сайт (Яндекс Вебмастер и др.) — лежат в корне сайта при каждой выкладке
const VERIFY_FILES = {
  'yandex_e2b671e1dfd7b31b.html': '<html>\n    <head>\n        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n    </head>\n    <body>Verification: e2b671e1dfd7b31b</body>\n</html>\n'
};
for (const [name, body] of Object.entries(VERIFY_FILES)) fs.writeFileSync(path.join(DIST, name), body);

// Фото и аватарки из отзывов — только если какой-то отзыв опубликован с согласием автора
if (!fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').includes('assets/reviews/')) fs.rmSync(path.join(DIST, 'assets', 'reviews'), { recursive: true, force: true });
// Архив редакций согласия (боевой текст): brand/legal-versions/consent-<редакция>.html.
// Если текст изменился, а номер редакции прежний — остановка: в журнале заявок редакции должны однозначно указывать на текст.
if (env.BV_FORMS !== '0') {
  const ver = fs.readFileSync(path.join(tmp, 'legal-version.txt'), 'utf8').trim();
  const vdir = path.join(ROOT, 'brand', 'legal-versions'), vfile = path.join(vdir, `consent-${ver}.html`);
  const body = h => (h.match(/<main>[\s\S]*<\/main>/) || [h])[0].replace(/\?v=[0-9a-f]+/g, '');
  const cur = fs.readFileSync(path.join(tmp, 'consent.html'), 'utf8');
  fs.mkdirSync(vdir, { recursive: true });
  if (fs.existsSync(vfile) && body(fs.readFileSync(vfile, 'utf8')) !== body(cur)) throw new Error(`Текст согласия изменился, а редакция осталась ${ver}: поменяйте LEGAL_VERSION в tools/build.js`);
  if (!fs.existsSync(vfile)) fs.writeFileSync(vfile, cur);
}
if (env.BV_FORMS !== '0' && env.BV_LEAD_URL === '/api/lead.php') {
  fs.mkdirSync(path.join(DIST, 'api'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'functions', 'lead.php'), path.join(DIST, 'api', 'lead.php'));
}

// 4. .htaccess для Apache на Timeweb: https и домен без www, своя 404, сжатие, кэш статики
fs.writeFileSync(path.join(DIST, '.htaccess'), `AddDefaultCharset utf-8
ErrorDocument 404 /404.html

RewriteEngine On
# На Timeweb https принимает прокси, Apache всегда видит HTTPS=off — смотрим заголовок прокси, иначе будет петля.
# Прокси ставит X-Forwarded-Proto: https только на https-запросах, на http заголовка нет вовсе — поэтому «не https», а не «=http».
RewriteCond %{HTTP:X-Forwarded-Proto} !=https [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^(.*)$ https://belovet.ru/$1 [R=301,L]
# /index.html → / (канонический адрес главной). Адреса в редиректах — полные: относительный Apache дополнит схемой http
RewriteCond %{THE_REQUEST} \\s/index\\.html[\\s?]
RewriteRule ^index\\.html$ https://belovet.ru/ [R=301,L]
${BLOG_ON ? '' : '# Блог пока не опубликован: старые ссылки на статьи — на главную\nRewriteRule ^blog(/.*)?$ https://belovet.ru/ [R=302,L]\n'}
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml text/plain text/xml application/xml application/manifest+json
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 10 minutes"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
</IfModule>
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`);

// 4а. fonts.css (только @font-face, ~7 КБ) — прямо в <head> каждой страницы: на один блокирующий отрисовку запрос меньше.
// Пути к шрифтам — от корня сайта (/assets/fonts/), так они верны со страницы любой глубины.
{
  const css = fs.readFileSync(path.join(DIST, 'assets', 'fonts.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\(fonts\//g, 'url(/assets/fonts/').replace(/\s*\n\s*/g, '\n').trim();
  (function inline(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { inline(p); continue; }
      if (!name.endsWith('.html')) continue;
      const h = fs.readFileSync(p, 'utf8');
      const t = h.replace(/<link rel="stylesheet" href="[^"]*assets\/fonts\.css(?:\?v=[0-9a-f]+)?">/, `<style>${css}</style>`);
      if (t !== h) fs.writeFileSync(p, t);
    }
  })(DIST);
}

// 4б. Картинки → WebP (tools/webp.js; нужен npm install). BV_WEBP=0 — собрать без WebP
if (process.env.BV_WEBP !== '0') execFileSync(process.execPath, [path.join(__dirname, 'webp.js'), DIST], { stdio: 'inherit' });

// 5. Проверка: нет ссылок на выключенные разделы, на прототип и на несуществующие файлы
const problems = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|txt|xml|js|webmanifest)$/.test(name)) continue;
    const rel = path.relative(DIST, p).replace(/\\/g, '/');
    const h = fs.readFileSync(p, 'utf8');
    if (/antonseliverstov\.github\.io/.test(h)) problems.push(rel + ': адрес прототипа');
    if (rel !== '404.html' && /<meta name="robots" content="noindex/.test(h)) problems.push(rel + ': noindex');
    if (!rel.endsWith('.html')) continue;
    for (const m of h.matchAll(/(?:href|src)="([^"#?]+)/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
      let t = u.startsWith('/') ? path.join(DIST, u) : path.join(path.dirname(p), u);
      if (u.endsWith('/') || fs.existsSync(t) && fs.statSync(t).isDirectory()) t = path.join(t, 'index.html');
      if (!fs.existsSync(t)) problems.push(`${rel}: битая ссылка ${u}`);
    }
  }
}
walk(DIST);
fs.rmSync(tmp, { recursive: true, force: true });

let files = 0, bytes = 0;
(function count(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) count(p); else { files++; bytes += fs.statSync(p).size; } } })(DIST);
console.log(`dist/: ${files} файлов, ${(bytes / 1048576).toFixed(1)} МБ; блог ${BLOG_ON ? 'включён' : 'выключен'}, формы ${env.BV_FORMS !== '0' ? 'включены' : 'выключены'}`);
if (problems.length) { console.error('Проблемы:\n' + [...new Set(problems)].slice(0, 40).join('\n')); process.exit(1); }
console.log('Проверка ссылок: ок');
