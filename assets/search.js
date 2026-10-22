// Поиск по операциям: опечатки, раскладка, окончания слов, бытовые описания.
// Данные — window.BV_DATA из assets/search-data.js (генерирует tools/build.js).
(function () {
  var DATA = window.BV_DATA;
  var input = document.getElementById('op-search');
  var box = document.getElementById('op-results');
  var cats = document.getElementById('op-cats');
  if (!DATA || !input) return;

  var EN = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.`';
  var RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
  var STOP = { 'и': 1, 'в': 1, 'во': 1, 'на': 1, 'с': 1, 'со': 1, 'у': 1, 'к': 1, 'по': 1, 'при': 1, 'после': 1, 'для': 1, 'от': 1, 'из': 1, 'за': 1, 'что': 1, 'как': 1, 'мой': 1, 'моя': 1, 'моей': 1, 'моего': 1, 'это': 1, 'или': 1, 'а': 1, 'же': 1, 'ли': 1, 'бы': 1, 'операция': 1, 'операцию': 1, 'операции': 1, 'цена': 1, 'стоимость': 1, 'сколько': 1, 'стоит': 1, 'не': 1, 'может': 1, 'могу': 1, 'очень': 1, 'сильно': 1, 'уже': 1, 'есть': 1, 'нужна': 1, 'нужно': 1, 'надо': 1 };
  // Вид животного почти ничего не говорит об операции: такие слова дают малый вес
  var SPECIES = /^(кот|кота|коту|котом|коты|котов|кошк|котен|котят|собак|пес|пса|псу|щен|кобел|сук[аиуе]|животн|питом)/;

  function norm(s) {
    return s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  }
  function fixLayout(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var k = EN.indexOf(s[i]);
      out += k >= 0 ? RU[k] : s[i];
    }
    return out;
  }
  function tokens(s) {
    return norm(s).split(' ').filter(function (t) { return t.length > 1 && !STOP[t]; });
  }
  // Расстояние Дамерау — Левенштейна с ранним выходом
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = null, prev = [], cur;
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur = [i];
      var rowMin = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  function allowed(len) { return len >= 8 ? 2 : len >= 4 ? 1 : 0; }

  // Насколько слово запроса q похоже на слово w (0 — не похоже)
  function wordScore(q, w) {
    if (q === w) return 3;
    if (q.length >= 3 && w.indexOf(q) === 0 && (q.length >= 5 || w.length - q.length <= 3)) return 2.6; // «лапа» не должна находить «лапаротомию»
    var stem = Math.min(q.length, w.length) - 2;
    var stemHit = stem >= 4 && q.slice(0, stem) === w.slice(0, stem) ? 2.5 : 0; // разные окончания: кота / коты
    var max = allowed(q.length);
    if (!max) return stemHit;
    var d = dist(q, w, max);
    if (d <= 1) return 2.4; // слово целиком, одна опечатка
    if (stemHit) return stemHit;
    if (d === 2 && max === 2 && q.slice(0, 3) === w.slice(0, 3)) return 1.8; // две опечатки — только при общем начале слова
    if (q.length >= 5 && w.length > q.length && dist(q, w.slice(0, q.length), max) <= max) return 1.4; // опечатка в начале слова
    if (q.length >= 6 && dist(q.slice(0, q.length - 2), w.slice(0, q.length - 2), max) <= max) return 1.2;
    return 0;
  }

  // Индекс: слова названия весят больше, чем ключевые фразы
  var catName = {};
  DATA.cats.forEach(function (c) { catName[c.id] = c.name; });
  var INDEX = DATA.items.map(function (it) {
    var title = tokens(it.t + ' ' + it.a);
    var vars = tokens(it.v.map(function (x) { return x[0]; }).join(' '));
    var kw = tokens(it.k.join(' ') + ' ' + catName[it.c]);
    var phrases = [norm(it.t)].concat(it.k.map(norm));
    return { it: it, title: title, vars: vars, kw: kw, phrases: phrases, min: Math.min.apply(null, it.v.map(function (x) { return x[1]; })) };
  });

  function best(q, words, weight) {
    var s = 0;
    for (var i = 0; i < words.length; i++) { var v = wordScore(q, words[i]); if (v > s) s = v; }
    return s * weight;
  }

  function search(raw) {
    var variants = [raw];
    if (/[a-z]/i.test(raw)) variants.push(fixLayout(raw.toLowerCase()));
    var results = {};
    variants.forEach(function (text) {
      var qs = tokens(text);
      if (!qs.length) return;
      var full = norm(text);
      var core = qs.filter(function (q) { return !SPECIES.test(q); });
      if (!core.length) return; // запрос только из «кошка», «собака»
      INDEX.forEach(function (e) {
        var score = 0, hit = 0;
        qs.forEach(function (q) {
          var s = Math.max(best(q, e.title, 1.4), best(q, e.kw, 1), best(q, e.vars, 0.8));
          if (SPECIES.test(q)) { score += s * 0.6; return; } // вид — лёгкий бонус, не совпадение
          if (s > 0) { hit++; score += s; }
        });
        var need = core.length <= 2 ? core.length : Math.ceil(core.length * 0.6);
        if (hit < need) return;
        if (full.length >= 4) {
          if (e.phrases.indexOf(full) !== -1) score += 6; // запрос дословно совпал с фразой
          else if (e.phrases.some(function (p) { return p.indexOf(full) !== -1; })) score += 4; // запрос — часть фразы
        }
        var prev = results[e.it.s];
        if (!prev || prev.score < score) results[e.it.s] = { e: e, score: score };
      });
    });
    var list = Object.keys(results).map(function (k) { return results[k]; })
      .sort(function (a, b) { return b.score - a.score; });
    if (!list.length) return list;
    // Убираем «хвост» случайных совпадений: оставляем то, что сопоставимо с лучшим результатом
    var top = list[0].score;
    var floor = Math.max(top * 0.5, Math.min(3, top * 0.75), 2.3); // при слабом лучшем результате (опечатка) порог мягче
    return list.filter(function (r) { return r.score >= floor; }).slice(0, 6);
  }

  function rub(n) { return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽'; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(list, raw) {
    if (!list.length && !tokens(raw).filter(function (q) { return !SPECIES.test(q); }).length) {
      box.innerHTML = '<p class="hint">Опишите, что случилось или какая операция нужна: например, «собака хромает» или «стерилизация кошки».</p>';
      return;
    }
    if (!list.length) {
      box.innerHTML = '<div class="empty"><p>По запросу «' + esc(raw) + '» ничего не нашлось. Опишите ситуацию врачу — подскажу, какая операция нужна и нужна ли она вообще.</p>'
        + '<button class="btn btn-dark" type="button" data-form="ask">Задать вопрос врачу</button></div>';
      var b = box.querySelector('[data-form]');
      b.addEventListener('click', function (ev) { ev.stopPropagation(); window.BV_openForm && window.BV_openForm('ask'); });
      return;
    }
    box.innerHTML = '<p class="hint">Нашлось: ' + list.length + '</p>' + list.map(function (r) {
      var it = r.e.it;
      var price = it.v.length > 1 ? 'от ' + rub(r.e.min) : rub(r.e.min);
      return '<a class="res" href="operations/' + it.s + '.html"><b>' + esc(it.t) + '</b><span class="cat-name">' + esc(catName[it.c]) + (it.a ? ' · ' + esc(it.a) : '') + '</span><span class="num">' + price + '</span></a>';
    }).join('');
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var raw = input.value.trim();
      if (raw.length < 2) { box.hidden = true; cats.hidden = false; return; }
      render(search(raw), raw);
      box.hidden = false;
      cats.hidden = true;
    }, 120);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { input.value = ''; input.dispatchEvent(new Event('input')); }
    if (ev.key === 'Enter') { var first = box.querySelector('.res'); if (first) first.click(); }
  });

  window.BV_search = search; // для проверки из консоли
})();
