// Эффекты при прокрутке: закреплённая шапка на десктопе, собака в блоке «Операция», следы лап в блоке «Восстановление».
// Без JavaScript и при «уменьшить движение» всё показывается в конечном состоянии.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');
  var ticking = false, jobs = [];
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; jobs.forEach(function (f) { f(); }); }); } }
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // 1. Шапка: после первого экрана закрепляется сверху (только десктоп)
  // Родительские блоки — CSS-контейнеры (container-type), внутри них position: fixed не работает,
  // поэтому на время закрепления шапка переносится в body с тем же масштабом (--px) и цветами, а потом возвращается.
  var head = document.querySelector('.stage > .header, header.ih');
  if (head) {
    var isIh = head.classList.contains('ih');
    var home = head.parentNode, marker = document.createComment('шапка'), spacer = null;
    home.insertBefore(marker, head);
    var limit = function () { return isIh ? 160 : Math.max(240, home.offsetHeight * 0.5); };
    jobs.push(function () {
      var stick = desktop.matches && window.scrollY > limit();
      if (stick === head.classList.contains('is-stuck')) return;
      if (stick) {
        var cs = getComputedStyle(head);
        var probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(1000 * var(--px))'; head.appendChild(probe);
        var px = probe.getBoundingClientRect().width / 1000; probe.remove();
        head.style.setProperty('--px', px + 'px');
        ['--ink', '--sun', '--navy', '--paper'].forEach(function (v) { var val = cs.getPropertyValue(v); if (val) head.style.setProperty(v, val.trim()); });
        if (isIh) { spacer = document.createElement('div'); spacer.style.height = head.offsetHeight + 'px'; home.insertBefore(spacer, marker); }
        head.classList.add('is-stuck');
        document.body.appendChild(head);
      } else {
        head.classList.remove('is-stuck');
        home.insertBefore(head, marker.nextSibling);
        if (spacer) { spacer.remove(); spacer = null; }
        head.style.removeProperty('--px');
      }
    });
    desktop.addEventListener && desktop.addEventListener('change', onScroll);
  }

  // 2. «Операция»: собака постепенно выезжает снизу из-за слова
  var nose = document.querySelector('.s-nose');
  if (nose && !reduce) {
    nose.classList.add('nose-anim');
    jobs.push(function () {
      var r = nose.getBoundingClientRect(), vh = window.innerHeight;
      nose.style.setProperty('--rise', clamp((vh - r.top) / (vh * 0.8)).toFixed(3));
    });
  }

  // 3. «Восстановление»: вместо линии — следы лап по той же кривой, появляются по мере прокрутки
  var PATH = 'M12.056 1.50035C-22.944 146.5 52.056 236.5 13.056 376.5C-24.944 516.5 46.056 606.5 10.056 756.5C-12.944 871.5 40.056 956.5 10.056 1006.5';
  var VB_W = 26.1293, VB_H = 1008;
  var PAW = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="5.6" cy="9.4" rx="2.2" ry="2.8"/><ellipse cx="9.6" cy="5.4" rx="2.3" ry="3"/><ellipse cx="14.4" cy="5.4" rx="2.3" ry="3"/><ellipse cx="18.4" cy="9.4" rx="2.2" ry="2.8"/><path d="M12 11.4c-3.4 0-6.6 4-6.6 6.9 0 2 1.6 3 3.2 3 1.4 0 2.2-.8 3.4-.8s2 .8 3.4.8c1.6 0 3.2-1 3.2-3 0-2.9-3.2-6.9-6.6-6.9z"/></svg>';
  var boxes = [].slice.call(document.querySelectorAll('.rec-paws'));
  if (boxes.length) {
    var ns = 'http://www.w3.org/2000/svg';
    var probe = document.createElementNS(ns, 'svg'); probe.setAttribute('width', '0'); probe.setAttribute('height', '0'); probe.style.position = 'absolute';
    var path = document.createElementNS(ns, 'path'); path.setAttribute('d', PATH); probe.appendChild(path); document.body.appendChild(probe);
    var L = path.getTotalLength();
    var build = function (box) {
      var W = box.clientWidth, H = box.clientHeight; if (!H) return;
      var sx = W / VB_W, sy = H / VB_H, size = Math.max(20, Math.min(40, W * 1.7));
      var gap = Math.max(size * 1.45, 34), pts = [], acc = gap * 0.5, prev = null, side = 1;
      for (var t = 0; t <= L; t += 2) {
        var p = path.getPointAtLength(t), q = { x: p.x * sx, y: p.y * sy };
        if (prev) acc += Math.hypot(q.x - prev.x, q.y - prev.y);
        if (prev && acc >= gap) {
          acc = 0;
          var n = path.getPointAtLength(Math.min(L, t + 4)), dx = n.x * sx - q.x, dy = n.y * sy - q.y, len = Math.hypot(dx, dy) || 1;
          var off = size * 0.38 * side; side = -side;
          pts.push({ x: q.x - dy / len * off, y: q.y + dx / len * off, a: Math.atan2(dy, dx) * 180 / Math.PI + 90 });
        }
        prev = q;
      }
      box.innerHTML = pts.map(function (o) {
        return '<i style="left:' + o.x.toFixed(1) + 'px;top:' + o.y.toFixed(1) + 'px;width:' + size.toFixed(0) + 'px;height:' + size.toFixed(0) + 'px;transform:translate(-50%,-50%) rotate(' + o.a.toFixed(0) + 'deg)" data-y="' + (o.y / H).toFixed(4) + '">' + PAW + '</i>';
      }).join('');
      box._paws = [].slice.call(box.children);
      if (reduce) box._paws.forEach(function (i) { i.classList.add('on'); });
    };
    boxes.forEach(build);
    var rw; window.addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(function () { boxes.forEach(build); onScroll(); }, 150); });
    if (!reduce) jobs.push(function () {
      var vh = window.innerHeight;
      boxes.forEach(function (box) {
        var r = box.getBoundingClientRect(), p = clamp((vh * 0.7 - r.top) / r.height);
        (box._paws || []).forEach(function (i) { i.classList.toggle('on', +i.dataset.y <= p); });
      });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
