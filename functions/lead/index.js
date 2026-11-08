// Обработчик заявок с сайта beloVET: Yandex Cloud Functions, среда Node.js 18+.
// Принимает JSON с формы, отправляет заявку в Telegram и на почту.
// Секреты — только в переменных окружения функции, в коде их нет:
//   TG_TOKEN       токен бота от @BotFather
//   TG_CHAT_IDS    id чатов через запятую (Владислав, при желании — администратор)
//   SMTP_HOST      smtp.timeweb.ru
//   SMTP_PORT      465
//   SMTP_USER      ящик-отправитель, например site@belovet.ru
//   SMTP_PASS      пароль этого ящика
//   MAIL_TO        куда слать заявки: vladislav@belovet.ru
//   ALLOWED_ORIGINS  https://belovet.ru,https://www.belovet.ru,https://antonseliverstov.github.io
const nodemailer = require('nodemailer');

const KINDS = { book: 'Запись на приём', ask: 'Вопрос врачу', urgent: 'ЭКСТРЕННО' };
const MAX_FILES = 5;
const MAX_TOTAL = 2.5 * 1024 * 1024; // лимит тела запроса Cloud Functions 3,5 МБ, base64 добавляет треть

const cut = (s, n) => String(s || '').trim().slice(0, n);
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function reply(code, body, origin) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    },
    body: JSON.stringify(body)
  };
}

async function toTelegram(text, files) {
  const token = process.env.TG_TOKEN;
  const chats = (process.env.TG_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!token || !chats.length) return false;
  const api = `https://api.telegram.org/bot${token}/`;
  let ok = false;
  for (const chat of chats) {
    const r = await fetch(api + 'sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    ok = ok || r.ok;
    for (const f of files) {
      const fd = new FormData();
      fd.append('chat_id', chat);
      fd.append('document', new Blob([f.buf], { type: f.type }), f.name);
      await fetch(api + 'sendDocument', { method: 'POST', body: fd });
    }
  }
  return ok;
}

async function toMail(subject, text, files) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO) return false;
  const tr = nodemailer.createTransport({
    host: SMTP_HOST, port: +SMTP_PORT || 465, secure: (+SMTP_PORT || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await tr.sendMail({
    from: `"Сайт beloVET" <${SMTP_USER}>`, to: MAIL_TO, subject, text,
    attachments: files.map(f => ({ filename: f.name, content: f.buf, contentType: f.type }))
  });
  return true;
}

module.exports.handler = async function (event) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const origin = (event.headers && (event.headers.Origin || event.headers.origin)) || '';
  const okOrigin = allowed.includes(origin) ? origin : '';
  if (event.httpMethod === 'OPTIONS') return reply(204, {}, okOrigin);
  if (event.httpMethod !== 'POST') return reply(405, { ok: false }, okOrigin);
  if (!okOrigin) return reply(403, { ok: false, error: 'origin' }, '');

  let d;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    d = JSON.parse(raw || '{}');
  } catch (e) { return reply(400, { ok: false, error: 'json' }, okOrigin); }

  if (d.website) return reply(200, { ok: true }, okOrigin); // скрытое поле-ловушка заполняют только боты
  const phone = cut(d.phone, 40), digits = phone.replace(/\D/g, '');
  const name = cut(d.name, 80);
  if (!name || digits.length !== 11 || !d.privacy || !d.consent) return reply(400, { ok: false, error: 'fields' }, okOrigin);

  const kind = KINDS[d.kind] ? d.kind : 'book';
  const pet = cut(d.pet, 80), message = cut(d.message, 3000), page = cut(d.page, 300);

  const files = [];
  let total = 0;
  for (const f of (Array.isArray(d.files) ? d.files : []).slice(0, MAX_FILES)) {
    const buf = Buffer.from(String(f.data || ''), 'base64');
    total += buf.length;
    if (total > MAX_TOTAL) break;
    files.push({ name: cut(f.name, 120) || 'file', type: cut(f.type, 100) || 'application/octet-stream', buf });
  }

  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const rows = [
    ['Имя', name], ['Телефон', phone], ['Питомец', pet], ['Сообщение', message],
    ['Файлов', files.length ? String(files.length) : ''], ['Страница', page], ['Время', when + ' (МСК)']
  ].filter(r => r[1]);
  const title = KINDS[kind];
  const tgText = `<b>${kind === 'urgent' ? '🚨 ' : ''}${esc(title)}</b>\n` + rows.map(([k, v]) => `<b>${k}:</b> ${esc(v)}`).join('\n')
    + `\n<a href="tel:+${digits}">Позвонить</a>`;
  const mailText = `${title}\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  const [tg, mail] = await Promise.allSettled([toTelegram(tgText, files), toMail(`${title}: ${name}, ${phone}`, mailText, files)]);
  const delivered = (tg.status === 'fulfilled' && tg.value) || (mail.status === 'fulfilled' && mail.value);
  if (!delivered) {
    console.error('Заявка не доставлена', tg.reason || tg.value, mail.reason || mail.value);
    return reply(502, { ok: false, error: 'delivery' }, okOrigin);
  }
  return reply(200, { ok: true }, okOrigin);
};
