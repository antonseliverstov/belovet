<?php
// Проверка целостности belovet.ru на хостинге: не изменил ли кто-то файлы сайта (прежде всего api/lead.php —
// подменённый обработчик может тихо копировать заявки на чужую почту).
//
// Лежит на хостинге вне папки сайта: ~/belovet/private/integrity.php (рядом: integrity.conf, integrity/).
//   php ~/belovet/private/integrity.php --update   — после каждой выкладки: запомнить эталон (хеши всех файлов)
//   php ~/belovet/private/integrity.php            — проверка (раз в сутки из cron в панели Timeweb)
// При расхождении — письмо на адрес из integrity.conf (строка alert_to=...); пока расхождение не устранено,
// напоминание раз в сутки. По понедельникам — короткое «всё в порядке», чтобы было видно, что проверка жива.
// Ограничение: тот, у кого есть полный доступ к хостингу, может обновить и эталон. Проверка ловит взлом сайта
// через уязвимости и подмену файлов без знания о ней; от кражи пароля хостинга защищают пароль и 2FA.

const MAIL_FROM = 'site@belovet.ru';
$base  = __DIR__;                                   // ~/belovet/private
$root  = dirname($base) . '/public_html';           // ~/belovet/public_html
$state = $base . '/integrity';
$skip  = ['cgi-bin'];
date_default_timezone_set('Europe/Moscow');

$conf = @parse_ini_file($base . '/integrity.conf') ?: [];
$to = trim($conf['alert_to'] ?? '');

function scan($root, $skip) {
  $out = [];
  $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
  foreach ($it as $f) {
    $rel = substr($f->getPathname(), strlen($root) + 1);
    if (in_array(explode('/', $rel)[0], $skip, true) || !$f->isFile()) continue;
    $out[$rel] = hash_file('sha256', $f->getPathname());
  }
  ksort($out);
  return $out;
}

function send($to, $subject, $text) {
  if ($to === '') { fwrite(STDERR, "Нет alert_to в integrity.conf — письмо не отправлено\n"); return; }
  $enc = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
  $headers = 'From: ' . $enc('Сайт beloVET — проверка') . ' <' . MAIL_FROM . ">\r\nMIME-Version: 1.0\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
  mail($to, $enc($subject), chunk_split(base64_encode($text)), $headers, '-f' . MAIL_FROM);
}

if (!is_dir($state)) mkdir($state, 0700, true);
$now = scan($root, $skip);

if (in_array('--update', $argv, true)) {
  file_put_contents($state . '/manifest.json', json_encode(['at' => date('c'), 'files' => $now], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  @unlink($state . '/last-alert');
  echo 'Эталон обновлён: ' . count($now) . " файлов\n";
  exit(0);
}

$m = json_decode(@file_get_contents($state . '/manifest.json'), true);
if (!$m) {
  send($to, 'belovet.ru: нет эталона для проверки файлов', "Файл эталона ~/belovet/private/integrity/manifest.json пропал или повреждён.\nЕсли это не вы — сайт мог быть взломан. После проверки: php ~/belovet/private/integrity.php --update");
  echo "Нет эталона\n"; exit(2);
}
$was = $m['files'];
$changed = array_keys(array_filter($now, fn($h, $p) => isset($was[$p]) && $was[$p] !== $h, ARRAY_FILTER_USE_BOTH));
$added   = array_keys(array_diff_key($now, $was));
$missing = array_keys(array_diff_key($was, $now));

if (!$changed && !$added && !$missing) {
  @unlink($state . '/last-alert');
  file_put_contents($state . '/last-ok', date('c'));
  if (date('N') === '1' && !in_array('--quiet', $argv, true))
    send($to, 'belovet.ru: проверка файлов — всё в порядке', 'Еженедельный отчёт: все ' . count($now) . " файлов сайта совпадают с эталоном от {$m['at']}.\nПроверка выполняется каждый день; письма о неполадках приходят сразу.");
  echo 'OK: ' . count($now) . " файлов совпадают с эталоном\n"; exit(0);
}

$lines = [];
foreach ([['ИЗМЕНЕНЫ', $changed], ['НОВЫЕ файлы', $added], ['ПРОПАЛИ', $missing]] as [$t, $list])
  if ($list) $lines[] = "$t (" . count($list) . "):\n  " . implode("\n  ", array_slice($list, 0, 50)) . (count($list) > 50 ? "\n  …" : '');
$critical = array_filter(array_merge($changed, $added, $missing), fn($p) => preg_match('#(^api/|\.php$|\.htaccess$|\.js$)#', $p));
$report = implode("\n\n", $lines);
$sig = hash('sha256', $report);
$last = @json_decode(@file_get_contents($state . '/last-alert'), true) ?: [];
if (($last['sig'] ?? '') !== $sig || time() - ($last['t'] ?? 0) > 82800) {   // новое расхождение или прошли сутки
  send($to, ($critical ? 'ВНИМАНИЕ · ' : '') . 'belovet.ru: файлы сайта изменены',
    "Ежедневная проверка нашла файлы сайта belovet.ru, которые отличаются от эталона (последняя выкладка: {$m['at']}).\n\n$report\n\n"
    . ($critical ? "Среди них — код (PHP/JS/.htaccess): так обычно выглядит взлом или подмена обработчика заявок.\n\n" : '')
    . "Если это ваша выкладка — обновите эталон: php ~/belovet/private/integrity.php --update\n"
    . "Если нет — не трогайте файлы до разбора, смените пароль Timeweb и сверьте сайт с репозиторием.");
  file_put_contents($state . '/last-alert', json_encode(['sig' => $sig, 't' => time()]));
}
echo $report . "\n"; exit(1);
