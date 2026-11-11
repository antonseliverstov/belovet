// Картинки боевой сборки → WebP: node tools/webp.js dist
// Вызывается из tools/dist.js после сборки. Исходники в assets/ и прототип на GitHub Pages не меняются.
// 1. Каждый PNG/JPG в dist/assets (кроме иконок и картинки для соцсетей) сжимается в WebP рядом с оригиналом.
// 2. В HTML ссылки на оригинал заменяются на .webp (картинки подключаются только из HTML: в CSS и JS их нет).
// 3. Оригинал удаляется, если на него больше нигде не ссылаются; если ссылка осталась — остаётся и файл.
// Нужен sharp: npm install (один раз, в корне проекта).
const fs = require('fs');
const path = require('path');

let sharp;
try { sharp = require('sharp'); } catch (e) {
  console.error('Нет модуля sharp: выполните npm install в корне проекта (или соберите с BV_WEBP=0 — без WebP)');
  process.exit(1);
}

const DIST = path.resolve(process.argv[2] || 'dist');
// Не трогаем: иконки сайта и приложения, картинку для соцсетей (VK, Telegram и мессенджеры надёжнее читают JPEG)
const KEEP = /^(apple-touch-icon|icon-\d+|favicon.*|og-image)\.(png|jpe?g)$/i;
const TEXT = /\.(html|css|js|json|txt|xml|webmanifest)$/i;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

(async () => {
  const all = walk(DIST);
  const images = all.filter(p => p.startsWith(path.join(DIST, 'assets')) && /\.(png|jpe?g)$/i.test(p) && !KEEP.test(path.basename(p)));
  // Имена должны быть уникальны: ссылки в HTML бывают и с путём, и только с именем файла
  const seen = new Map();
  for (const p of images) {
    const b = path.basename(p);
    if (seen.has(b)) throw new Error(`Две картинки с одним именем: ${seen.get(b)} и ${p}`);
    seen.set(b, p);
  }

  let before = 0, after = 0;
  const renamed = new Map(); // 'cat.png' → 'cat.webp'
  for (const p of images) {
    const isMask = /-mask\.png$/i.test(p); // маски вырезают фото по контуру — альфу без потерь, иначе края «звенят»
    const out = p.replace(/\.(png|jpe?g)$/i, '.webp');
    // Кот первого экрана — на виду у всех, тонкая шерсть: качество выше (84 КБ вместо 48, против 700 КБ PNG)
    const quality = /^hero-cat\./i.test(path.basename(p)) ? 92 : 82;
    const opts = isMask ? { lossless: true, effort: 6 } : { quality, alphaQuality: 95, effort: 6, smartSubsample: true };
    await sharp(p).webp(opts).toFile(out);
    const a = fs.statSync(p).size, b = fs.statSync(out).size;
    if (b >= a) { fs.rmSync(out); continue; } // WebP не меньше оригинала — оставляем оригинал
    before += a; after += b;
    renamed.set(path.basename(p), path.basename(out));
  }

  // Замена ссылок в HTML: …/имя.png|jpg → …/имя.webp, только для сконвертированных файлов
  const html = all.filter(p => /\.html$/i.test(p));
  const re = /([\w.\-]+)\.(png|jpe?g)(?=["'\s)?,&])/gi;
  for (const p of html) {
    const s = fs.readFileSync(p, 'utf8');
    const t = s.replace(re, (m, base, ext) => renamed.get(`${base}.${ext}`) || m);
    if (t !== s) fs.writeFileSync(p, t);
  }

  // Оригиналы, на которые больше нет ссылок, — удалить
  const texts = walk(DIST).filter(p => TEXT.test(p)).map(p => fs.readFileSync(p, 'utf8')).join('\n');
  let removed = 0, kept = [];
  for (const [orig] of renamed) {
    if (texts.includes(orig)) { kept.push(orig); continue; }
    fs.rmSync(seen.get(orig)); removed++;
  }
  console.log(`WebP: ${renamed.size} картинок, ${(before / 1048576).toFixed(1)} МБ → ${(after / 1048576).toFixed(1)} МБ; удалено оригиналов: ${removed}` +
    (kept.length ? `; оставлены (на них есть ссылки): ${kept.join(', ')}` : ''));
})().catch(e => { console.error(e); process.exit(1); });
