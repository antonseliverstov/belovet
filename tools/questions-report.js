// Отчёт по журналу вопросов из блока «Вопрос врачу» — источник идей для статей.
// Журнал лежит на хостинге: ~/belovet/private/questions.jsonl (забирается по SFTP одним подключением).
// Запуск: node tools/questions-report.js путь/к/questions.jsonl [ГГГГ-ММ]  → brand/questions/ГГГГ-ММ.md
// В журнале нет имён и телефонов: вид питомца, «Срочно», текст, какие статьи предложил сайт и насколько они подошли (top).
const fs = require('fs');
const path = require('path');

const [file, month] = process.argv.slice(2);
if (!file) { console.error('Укажите путь к questions.jsonl'); process.exit(1); }
const ROOT = path.join(__dirname, '..');
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const sent = new Set(lines.filter(l => l.sent).map(l => l.q));
let qs = lines.filter(l => l.text);
if (month) qs = qs.filter(q => (q.at || '').startsWith(month));
const period = month || 'весь журнал';

// Темы: частые основы слов (без служебных и «питомцевых» слов)
const STOP = new Set('это как что мой моя мне его она они уже ещё еще очень стал стала после перед когда если чтобы просто тоже нет был была было может можно нужно надо день дня дней для без про при над под через или где чем все всё весь кот кота коту кошка кошки кошку собака собаки собаку щенок котенок котёнок питомец здравствуйте подскажите пожалуйста спасибо вопрос'.split(' '));
const stem = w => w.length > 6 ? w.slice(0, w.length - 2) : w;
const freq = {};
for (const q of qs) {
  const seen = new Set();
  for (const w of q.text.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').split(' ')) {
    if (w.length < 4 || STOP.has(w)) continue;
    const s = stem(w); if (seen.has(s)) continue; seen.add(s);
    (freq[s] = freq[s] || { n: 0, ex: w }).n++;
  }
}
const topics = Object.entries(freq).sort((a, b) => b[1].n - a[1].n).slice(0, 25);

// «Дыры»: сайт не нашёл подходящей статьи или нашёл слабую (top < 10)
const GAP = 10;
const gaps = qs.filter(q => !q.shown || !q.shown.some(s => s.startsWith('blog/')) || (q.top || 0) < GAP);

// Какие статьи сайт предлагал чаще всего — что уже работает
const shownFreq = {};
for (const q of qs) for (const s of q.shown || []) shownFreq[s] = (shownFreq[s] || 0) + 1;
const topShown = Object.entries(shownFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);

const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
const cats = qs.filter(q => q.pet === 'кошка').length, dogs = qs.filter(q => q.pet === 'собака').length;
const urgent = qs.filter(q => q.urgent).length, toDoctor = qs.filter(q => sent.has(q.q)).length;
const quote = t => t.replace(/\s+/g, ' ').trim();

const md = `# Вопросы владельцев — ${period}

Источник: блок «Вопрос врачу» на belovet.ru, журнал без имён и телефонов.

| Показатель | Значение |
|---|---|
| Вопросов | ${qs.length} |
| Кошки / собаки | ${cats} / ${dogs} |
| С пометкой «Срочно» | ${urgent} (${pct(urgent, qs.length)}) |
| Дошли до врача (оставили телефон) | ${toDoctor} (${pct(toDoctor, qs.length)}) |
| Без подходящей статьи | ${gaps.length} (${pct(gaps.length, qs.length)}) |

## О чём спрашивают чаще всего
${topics.map(([s, v]) => `- ${v.ex} — ${v.n}`).join('\n') || '—'}

## Вопросы без подходящей статьи — кандидаты в новые темы
${gaps.map(q => `- [${q.pet || '?'}${q.urgent ? ', срочно' : ''}${sent.has(q.q) ? ', дошёл до врача' : ''}] ${quote(q.text)}`).join('\n') || '—'}

## Статьи, которые сайт предлагал чаще всего
${topShown.map(([s, n]) => `- ${s} — ${n}`).join('\n') || '—'}

## Все вопросы
${qs.map(q => `- ${(q.at || '').slice(0, 10)} · ${q.pet || '?'}${q.urgent ? ' · срочно' : ''}${sent.has(q.q) ? ' · дошёл до врача' : ''} — ${quote(q.text)}`).join('\n') || '—'}
`;

const outDir = path.join(ROOT, 'brand', 'questions');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, (month || 'all') + '.md');
fs.writeFileSync(out, md);
console.log(`Отчёт: ${path.relative(ROOT, out)} — вопросов ${qs.length}, без статьи ${gaps.length}`);
