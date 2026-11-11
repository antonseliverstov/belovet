<?php
// Приём заявок с форм belovet.ru на хостинге Timeweb: JSON от страницы → письмо врачу.
// Выкладывается как /api/lead.php (tools/dist.js при BV_FORMS=1). Пароли не нужны: письмо уходит через mail() хостинга.
// Данные не передаются третьим лицам; позже вместо/вместе с письмом — отправка в CRM.
// Доказательство согласия (ч. 3 ст. 9 152-ФЗ): каждая принятая заявка пишется в журнал ~/belovet/private/consents.jsonl —
// вне папки сайта, по HTTP недоступен. Поля: номер заявки, время, тип формы, отметки, редакция согласия, имя, телефон.
// Тексты редакций — в репозитории: brand/legal-versions/consent-<редакция>.html. Срок хранения журнала — см. политику, раздел 5.

const MAIL_TO   = 'vladislav@belovet.ru';
const MAIL_FROM = 'site@belovet.ru';           // адрес на домене сайта, чтобы письмо не попадало в спам
const KINDS     = ['book' => 'Запись на приём', 'ask' => 'Вопрос врачу', 'question' => 'Вопрос врачу', 'invite' => 'Приглашение хирурга', 'urgent' => 'Срочно'];
const Q_MAX     = 2;                           // «Вопрос врачу» с главной: не больше 2 с одного IP за сутки
const Q_WIN     = 86400;
const MAX_FILES = 5;
const MAX_TOTAL = 2621440;                     // 2,5 МБ вложений
const RATE_MAX  = 5;                           // не больше 5 заявок с одного IP за 10 минут
const RATE_WIN  = 600;

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function out($code, $body) { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
function cut($s, $n) { return mb_substr(trim((string)$s), 0, $n); }
function clean($s) { return str_replace(["\r", "\0"], '', $s); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false]);
$host = parse_url($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST);
if ($host && !in_array($host, ['belovet.ru', 'www.belovet.ru'], true)) out(403, ['ok' => false, 'error' => 'origin']);

$raw = file_get_contents('php://input', false, null, 0, 4 * 1024 * 1024);
$d = json_decode($raw, true);
if (!is_array($d)) out(400, ['ok' => false, 'error' => 'json']);
if (!empty($d['website'])) out(200, ['ok' => true]);   // поле-ловушка: заполняют только боты

// Ограничение частоты по IP (метка во временной папке, без персональных данных — только хеш)
$ipKey = sys_get_temp_dir() . '/bv_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'belovet');
$hits = array_filter(array_map('intval', @file($ipKey, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - RATE_WIN);
if (count($hits) >= RATE_MAX) out(429, ['ok' => false, 'error' => 'rate']);

$name = clean(cut($d['name'] ?? '', 80));
$phone = clean(cut($d['phone'] ?? '', 40));
$digits = preg_replace('/\D/', '', $phone);
// Сервер сам отклоняет заявку без обеих отметок и без редакции согласия
$version = preg_replace('/[^0-9-]/', '', (string)($d['consent_version'] ?? ''));
if ($name === '' || strlen($digits) !== 11 || ($d['privacy'] ?? false) !== true || ($d['consent'] ?? false) !== true || $version === '') out(400, ['ok' => false, 'error' => 'fields']);

$kind = isset(KINDS[$d['kind'] ?? '']) ? $d['kind'] : 'book';
$urgent = ($d['urgent'] ?? false) === true || $kind === 'urgent';
// вопрос врачу: отдельный суточный лимит, чтобы блок не заспамили
if ($kind === 'question') {
  $qKey = $ipKey . '_q';
  $qHits = array_filter(array_map('intval', @file($qKey, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - Q_WIN);
  if (count($qHits) >= Q_MAX) out(429, ['ok' => false, 'error' => 'rate']);
}
$shown = implode('; ', array_map(fn($t) => clean(cut($t, 160)), array_slice(is_array($d['shown'] ?? null) ? $d['shown'] : [], 0, 5)));
$pet = clean(cut($d['pet'] ?? '', 80));
$message = cut($d['message'] ?? '', 3000);
$page = clean(cut($d['page'] ?? '', 300));

$files = []; $total = 0;
foreach (array_slice(is_array($d['files'] ?? null) ? $d['files'] : [], 0, MAX_FILES) as $f) {
  $bin = base64_decode((string)($f['data'] ?? ''), true);
  if ($bin === false) continue;
  $total += strlen($bin);
  if ($total > MAX_TOTAL) break;
  $fname = preg_replace('/[^\p{L}\p{N}._ -]/u', '_', cut($f['name'] ?? 'file', 120)) ?: 'file';
  $type = preg_match('#^[\w.+-]+/[\w.+-]+$#', $f['type'] ?? '') ? $f['type'] : 'application/octet-stream';
  $files[] = [$fname, $type, $bin];
}

date_default_timezone_set('Europe/Moscow');
$id = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
$title = KINDS[$kind];
$rows = array_filter([
  'Имя' => $name, 'Телефон' => $phone, 'Питомец' => $pet, 'Срочно' => $urgent ? 'да' : '', 'Сообщение' => $message,
  'Показали статьи' => $shown,
  'Файлов' => $files ? (string)count($files) : '', 'Страница' => $page, 'Время' => date('d.m.Y H:i') . ' (МСК)',
  'Заявка №' => $id, 'Согласие' => "отметки поставлены, редакция $version"
], fn($v) => $v !== '');
$text = $title . "\n\n";
foreach ($rows as $k => $v) $text .= "$k: $v\n";
$text .= "\nПозвонить: tel:+$digits\n";

$enc = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$subject = $enc(($urgent ? 'СРОЧНО · ' : '') . $title . ': ' . "$name, $phone" . ($pet ? ", $pet" : ''));
$boundary = 'bv' . bin2hex(random_bytes(12));
$headers = implode("\r\n", [
  'From: ' . $enc('Сайт beloVET') . ' <' . MAIL_FROM . '>',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="' . $boundary . '"'
]);
$body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n";
foreach ($files as [$fname, $type, $bin]) {
  $body .= "--$boundary\r\nContent-Type: $type; name=\"" . $enc($fname) . "\"\r\nContent-Transfer-Encoding: base64\r\n"
    . 'Content-Disposition: attachment; filename="' . $enc($fname) . "\"\r\n\r\n" . chunk_split(base64_encode($bin)) . "\r\n";
}
$body .= "--$boundary--\r\n";

// Журнал согласий пишется до отправки письма: без записи в журнал заявку не принимаем
$logDir = dirname(__DIR__, 2) . '/private';
if (!is_dir($logDir)) { @mkdir($logDir, 0700, true); @file_put_contents($logDir . '/.htaccess', "Require all denied\n"); }
$entry = json_encode(['id' => $id, 'at' => date('c'), 'kind' => $kind, 'privacy' => true, 'consent' => true,
  'consent_version' => $version, 'name' => $name, 'phone' => $phone, 'page' => $page], JSON_UNESCAPED_UNICODE);
if (@file_put_contents($logDir . '/consents.jsonl', $entry . "\n", FILE_APPEND | LOCK_EX) === false) out(500, ['ok' => false, 'error' => 'log']);

if (!mail(MAIL_TO, $subject, $body, $headers, '-f' . MAIL_FROM)) out(502, ['ok' => false, 'error' => 'delivery']);
$hits[] = time();
if ($kind === 'question') { $qHits[] = time(); @file_put_contents($qKey, implode("
", $qHits)); }
@file_put_contents($ipKey, implode("\n", $hits));
out(200, ['ok' => true]);
