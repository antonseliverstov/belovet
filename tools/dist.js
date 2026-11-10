// Боевая сборка belovet.ru для хостинга Timeweb: node tools/dist.js
// Собирает сайт в режиме запуска (BV_LAUNCH=1) во временной копии проекта, чтобы не трогать прототип на GitHub Pages,
// и кладёт в dist/ только публичные файлы. Разделы выключаются переменными: BV_BLOG=0 (без блога), BV_FORMS=0 (без форм).
// По умолчанию — как решено при запуске 09.11.2026: без блога и без форм.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const env = Object.assign({}, process.env, {
  BV_LAUNCH: '1',
  BV_BLOG: process.env.BV_BLOG || '0',
  BV_FORMS: process.env.BV_FORMS || '0'
});
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

// 4. .htaccess для Apache на Timeweb: https и домен без www, своя 404, сжатие, кэш статики
fs.writeFileSync(path.join(DIST, '.htaccess'), `AddDefaultCharset utf-8
ErrorDocument 404 /404.html

RewriteEngine On
# На Timeweb https принимает прокси, Apache всегда видит HTTPS=off — смотрим заголовок прокси, иначе будет петля
RewriteCond %{HTTP:X-Forwarded-Proto} =http [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^(.*)$ https://belovet.ru/$1 [R=301,L]
# /index.html → / (канонический адрес главной)
RewriteCond %{THE_REQUEST} \\s/index\\.html[\\s?]
RewriteRule ^index\\.html$ / [R=301,L]
${BLOG_ON ? '' : '# Блог пока не опубликован: старые ссылки на статьи — на главную\nRewriteRule ^blog(/.*)?$ / [R=302,L]\n'}
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
