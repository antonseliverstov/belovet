// «Вопрос врачу»: пошаговая форма на главной (#ask).
// 1) имя → 2) кошка/собака, «Срочно», описание → 3) подборка статей и (по желанию) телефон с согласием → 4) отправлено.
// До шага «Отправить вопрос врачу» с отметками согласия на сервер ничего не уходит: имя и описание остаются в браузере.
// После отправки следующий вопрос — на следующий день (метка в браузере; сервер дополнительно ограничивает по IP).
(function () {
  var card = document.getElementById('ask-card');
  if (!card) return;
  var root = document.documentElement;
  var steps = [].slice.call(card.querySelectorAll('.ask-step'));
  var dots = [].slice.call(card.querySelectorAll('.ask-dots li'));
  var state = { name: '', pet: '', urgent: false, text: '', reads: [] };
  var KEY = 'belovet-ask';
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var goal = function (g) { if (window.ym && window.BV_METRIKA) window.ym(window.BV_METRIKA, 'reachGoal', g); };

  function show(n, focus) {
    steps.forEach(function (s) { s.hidden = +s.dataset.step !== n; });
    dots.forEach(function (d, i) { d.classList.toggle('on', i < Math.min(n, 3)); });
    var st = steps[n - 1];
    if (focus) { var f = st.querySelector('input:not(.hp), textarea, a, button'); if (f) f.focus({ preventScroll: true }); }
  }
  function err(st, msg) { st.querySelector('.ask-err').textContent = msg || ''; }

  // ---------- подбор статей ----------
  var STOP = ' это как что мой моя моей моего мою мне меня его она они оно уже ещё еще очень сильно стал стала стало стали после перед когда если чтобы просто тоже нет был была было были может можно нужно надо день дня дней раз два три кот кота коту котом кошка кошки кошку кошке собака собаки собаку собаке пес пёс щенок котенок котёнок питомец питомца питомцу ' +
    'для без про при над под через или где чем все всё весь тест тестовое тестовый проверка проверить проверяю сообщение сайт сайта вопрос вопросы узнать подробнее здравствуйте добрый доброе хочу хотела хотел подскажите помогите пожалуйста спасибо ';
  var SYN = [
    ['рвет', 'рвота', 'тошнит', 'тошнота', 'вырвало', 'рвоты'], ['понос', 'диарея', 'жидкий', 'стул'], ['запор', 'какает', 'туалет', 'кал'],
    ['писает', 'мочится', 'моча', 'мочи', 'лоток', 'цистит'], ['хромает', 'хромота', 'лапа', 'лапу', 'наступает'], ['кровь', 'кровит', 'кровотечение', 'кровоточит'],
    ['шишка', 'опухоль', 'образование', 'уплотнение', 'нарост', 'бугорок'], ['шов', 'швы', 'шва', 'рана', 'рану'], ['ест', 'есть', 'еды', 'ела', 'аппетит', 'корм', 'кушает', 'голодает'],
    ['дышит', 'дыхание', 'одышка', 'задыхается'], ['течка', 'стерилизация', 'стерилизовать'], ['кастрация', 'кастрировать', 'метит'],
    ['проглотил', 'проглотила', 'съел', 'съела', 'сожрал'], ['живот', 'вздутие', 'вздулся'], ['ухо', 'уши', 'ушах', 'трясет']
  ];
  var norm = function (s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); };
  var toks = function (s) { return norm(s).split(' ').filter(function (w) { return w.length >= 3 && STOP.indexOf(' ' + w + ' ') === -1; }); };
  function cp(a, b) { var n = Math.min(a.length, b.length), i = 0; while (i < n && a[i] === b[i]) i++; return i; }
  function match(q, w) { if (q === w) return 1; var c = cp(q, w); return c >= Math.max(4, Math.min(q.length, w.length) - 2) ? .85 : 0; }
  function expand(words) {
    var out = words.slice();
    words.forEach(function (w) { SYN.forEach(function (g) { if (g.some(function (x) { return match(w, x); })) g.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); }); }); });
    return out;
  }
  function best(q, words) { var b = 0; words.forEach(function (w) { var m = match(q, w); if (m > b) b = m; }); return b; }
  function fieldScore(qs, words, wt) { var s = 0; qs.forEach(function (q, i) { s += best(q, words) * (wt ? wt[i] : 1); }); return s; }
  var INDEX = null;
  function prep() {
    if (INDEX) return INDEX;
    var posts = (window.BV_ASK && window.BV_ASK.posts) || [];
    INDEX = posts.map(function (p) { return { p: p, t: toks(p.t), k: toks(p.k), l: toks(p.l) }; });
    return INDEX;
  }
  function pick() {
    var own = toks(state.text);
    var qs = expand(own);
    var idx = prep(), N = idx.length || 1;
    // вес слова по редкости: «шов» точнее «стерилизации», которое есть в десятках статей
    var wt = qs.map(function (q) { var df = 0; idx.forEach(function (e) { if (best(q, e.t) || best(q, e.k)) df++; }); return Math.log((N + 1) / (df + 1)); });
    var ownWt = own.map(function (q) { return wt[qs.indexOf(q)] || 1; });
    var res = idx.map(function (e) {
      var s = fieldScore(qs, e.t, wt) * 3 + fieldScore(qs, e.k, wt) * 1.5 + fieldScore(own, e.l, ownWt) * .7;
      if (state.pet && e.p.a) s *= e.p.a === state.pet ? 1.3 : .35;
      if (state.urgent && e.p.u) s *= 1.2;
      return { p: e.p, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    var top = res.length ? res[0].s : 0;
    res = res.filter(function (r) { return r.s >= 6 && r.s >= top * .45; }).slice(0, 3);
    var reads = res.map(function (r) { return { href: 'blog/' + r.p.s + '.html', cat: r.p.r, title: r.p.t, lead: r.p.l }; });
    // операция по теме — из индекса поиска по операциям (assets/search-data.js)
    var D = window.BV_DATA;
    if (D && D.items) {
      var opTop = null;
      D.items.forEach(function (it) {
        var s = fieldScore(qs, toks(it.t)) * 3 + fieldScore(qs, toks((it.k || []).join(' '))) * 1.4;
        if (!opTop || s > opTop.s) opTop = { it: it, s: s };
      });
      if (opTop && opTop.s >= 6) reads.push({ href: 'operations/' + opTop.it.s + '.html', cat: 'Операция по теме', title: opTop.it.t, lead: opTop.it.a || '' });
    }
    return reads;
  }
  function renderReads(list, reads) {
    list.innerHTML = reads.length ? reads.map(function (r) {
      return '<li><a href="' + esc(r.href) + '" target="_blank" rel="noopener"><small>' + esc(r.cat) + '</small><b>' + esc(r.title) + '</b>' + (r.lead ? '<span>' + esc(r.lead) + '</span>' : '') + '</a></li>';
    }).join('') : '<li class="ask-done">Готовой статьи точно по вашему вопросу не нашлось — лучше задать его врачу лично.</li>';
  }
  function loadIndex(cb) {
    if (window.BV_ASK) return cb();
    var src = card.dataset.src; if (!src) return cb();
    var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }

  // ---------- уже спрашивали сегодня ----------
  var lock = null;
  try { lock = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (lock && lock.day === today()) {
    card.querySelector('[data-ask-done-title]').textContent = 'Вы уже задали вопрос сегодня';
    card.querySelector('[data-ask-done-text]').textContent = 'Владислав ответит в часы приёма. Новый вопрос можно задать завтра — так врач успевает ответить каждому.';
    renderReads(steps[3].querySelector('.ask-reads'), lock.reads || []);
    show(4);
    return;
  }

  // ---------- шаг 1: имя ----------
  steps[0].addEventListener('submit', function (e) {
    e.preventDefault();
    var v = steps[0].querySelector('#ask-name').value.trim();
    if (v.length < 2) return err(steps[0], 'Напишите, как к вам обращаться.');
    err(steps[0]); state.name = v;
    card.querySelectorAll('[data-ask-name]').forEach(function (s) { s.textContent = v; });
    show(2, true); goal('ask_name');
    loadIndex(function () {}); // заранее подгружаем статьи
  });

  // ---------- шаг 2: питомец, срочность, описание ----------
  steps[1].querySelectorAll('[data-pet]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.pet = b.dataset.pet === 'cat' ? 'c' : 'd';
      steps[1].querySelectorAll('[data-pet]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  var urg = steps[1].querySelector('[data-urgent]');
  urg.addEventListener('click', function () { state.urgent = !state.urgent; urg.setAttribute('aria-pressed', String(state.urgent)); });
  steps[1].addEventListener('submit', function (e) {
    e.preventDefault();
    var t = steps[1].querySelector('#ask-text').value.trim();
    if (!state.pet) return err(steps[1], 'Выберите, кошка у вас или собака.');
    if (t.length < 10) return err(steps[1], 'Опишите, что беспокоит питомца, хотя бы парой предложений.');
    err(steps[1]); state.text = t;
    loadIndex(function () {
      state.reads = pick();
      renderReads(steps[2].querySelector('.ask-reads'), state.reads);
      steps[2].querySelector('.ask-urgent-note').hidden = !state.urgent;
      show(3, true); goal('ask_articles');
    });
  });
  card.querySelectorAll('[data-ask-back]').forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.askBack, true); }); });

  // ---------- шаг 3: телефон и согласие → письмо врачу ----------
  var cf = steps[2].querySelector('.ask-contact');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var phone = cf.phone.value.trim(), digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) return err(cf, 'Введите номер телефона полностью — врач перезвонит на него.');
    if (!cf.privacy.checked || !cf.consent.checked) return err(cf, 'Отметьте обе галочки: без согласия мы не можем передать вопрос врачу.');
    err(cf);
    var endpoint = root.dataset.lead;
    var done = function (demo) {
      // текст после отправки — формулировка Владислава; в прототипе добавляется пометка, что вопрос никуда не ушёл
      card.querySelector('[data-ask-done-title]').textContent = 'Ваш вопрос отправлен';
      card.querySelector('[data-ask-done-text]').textContent = 'Я свяжусь с вами сразу же, как появится возможность. Вероятно, я могу быть на операции — возможно, придётся подождать.'
        + (demo ? ' (Это прототип сайта: здесь вопрос никуда не уходит.)' : '');
      renderReads(steps[3].querySelector('.ask-reads'), state.reads);
      show(4, true);
      if (!demo) { try { localStorage.setItem(KEY, JSON.stringify({ day: today(), reads: state.reads })); } catch (x) {} goal('lead_question'); }
    };
    if (!endpoint) return done(true);
    var btn = cf.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Отправляю…';
    fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'question', name: state.name, phone: phone, pet: state.pet === 'c' ? 'кошка' : 'собака', urgent: state.urgent,
        message: state.text, shown: state.reads.map(function (r) { return r.title; }), page: location.href, website: cf.website.value,
        privacy: true, consent: true, consent_version: root.dataset.consentVersion || ''
      })
    }).then(function (r) {
      if (r.status === 429) throw new Error('rate');
      if (!r.ok) throw new Error(r.status);
      done(false);
    }).catch(function (x) {
      err(cf, x && x.message === 'rate' ? 'С этого устройства сегодня уже задавали вопрос. Новый можно задать завтра.' : 'Не получилось отправить. Позвоните, пожалуйста: +7 (939) 255-77-71.');
      btn.disabled = false; btn.textContent = 'Отправить вопрос врачу';
    });
  });
})();
