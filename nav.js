/* Abre/cierra los submenús con clic o toque; Esc y clic fuera los cierran. */
(function () {
  var grps = Array.prototype.slice.call(document.querySelectorAll('.site-h nav .grp'));
  function closeAll(except) { grps.forEach(function (g) { if (g !== except) { g.classList.remove('open'); g.firstElementChild.setAttribute('aria-expanded', 'false'); } }); }
  grps.forEach(function (g) {
    var b = g.firstElementChild;
    b.addEventListener('click', function (e) {
      e.stopPropagation(); var o = !g.classList.contains('open'); closeAll(g);
      g.classList.toggle('open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var o = document.querySelector('.site-h nav .grp.open > button'); closeAll(); if (o) o.focus(); } });
})();
