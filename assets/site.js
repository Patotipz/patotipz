/* Utilidades compartidas: formato, sección de comentarios y ventana "Enviarme mis resultados". */
(function (root) {
  'use strict';
  var CFG = root.PTZ_CONFIG || {};
  var nf = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  var nf0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  var PTZ = {
    money: function (n) { return nf.format(isFinite(n) ? n : 0); },
    money0: function (n) { return nf0.format(isFinite(n) ? n : 0); },
    pct: function (n, d) { return (isFinite(n) ? n : 0).toFixed(d == null ? 2 : d) + '%'; },
    el: function (tag, attrs, kids) {
      var e = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
      });
      (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      return e;
    }
  };
  PTZ.csv = function (rows) {
    function cell(v) {
      if (v == null) return '';
      var t = String(v);
      if (/^[=+\-@\t\r]/.test(t) && isNaN(Number(t))) t = "'" + t; // evita fórmulas en Excel
      return /[",\n\r;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    return rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n');
  };
  PTZ.downloadCSV = function (name, rows) {
    var blob = new Blob(['\ufeff' + PTZ.csv(rows)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  PTZ.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error('sin portapapeles'));
  };
  var DISCLAIMER = 'Estimación informativa. No es asesoría financiera, legal ni fiscal. Confirma montos y condiciones con tu empleador, el banco o un profesional.';

  /* ---------- Comentarios y preguntas ---------- */
  PTZ.mountComments = function (host, pageName) {
    if (!host) return;
    var id = 'c' + Math.random().toString(36).slice(2, 7);
    host.className = 'ptz-box';
    host.innerHTML =
      '<div class="ptz-card"><h2>¿Dudas, comentarios o ideas?</h2>' +
      '<p class="ptz-sub">Escríbeme lo que te gustaría ver o lo que no te quedó claro. Leo todos los mensajes.</p>' +
      '<form novalidate>' +
      '<div class="ptz-r"><div class="ptz-f"><label for="' + id + 'n">Nombre (opcional)</label><input id="' + id + 'n" name="name" type="text" maxlength="80" autocomplete="name"></div>' +
      '<div class="ptz-f"><label for="' + id + 'e">Correo para responderte (opcional)</label><input id="' + id + 'e" name="email" type="email" maxlength="120" autocomplete="email"></div></div>' +
      '<div class="ptz-f"><label for="' + id + 't">Tipo de mensaje</label><select id="' + id + 't" name="topic"><option>Pregunta</option><option>Comentario</option><option>Error en un cálculo</option><option>Idea para una nueva herramienta</option></select></div>' +
      '<div class="ptz-f"><label for="' + id + 'm">Mensaje</label><textarea id="' + id + 'm" name="message" maxlength="2000" required></textarea></div>' +
      '<div class="ptz-hp" aria-hidden="true"><label>No llenar<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="ptz-b" type="submit">Enviar mensaje</button><p class="ptz-msg" role="status" aria-live="polite"></p></form></div>';
    var form = host.querySelector('form'), msg = host.querySelector('.ptz-msg'), btn = form.querySelector('button');
    function say(t, cls) { msg.textContent = t; msg.className = 'ptz-msg ' + (cls || ''); }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      var text = String(fd.get('message') || '').trim(), email = String(fd.get('email') || '').trim();
      if (fd.get('botcheck')) return;
      if (text.length < 3) { say('Escribe tu mensaje antes de enviar.', 'err'); form.elements.message.focus(); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Revisa tu correo: no parece válido.', 'err'); form.elements.email.focus(); return; }
      if (!CFG.web3formsKey) { say('El formulario aún no está activado. Vuelve a intentarlo más tarde.', 'err'); return; }
      btn.disabled = true; say('Enviando…');
      var payload = {
        access_key: CFG.web3formsKey, subject: 'Patotipz: ' + fd.get('topic') + ' (' + pageName + ')',
        from_name: String(fd.get('name') || 'Visitante de Patotipz'), name: String(fd.get('name') || ''), email: email,
        message: text, tipo: String(fd.get('topic')), pagina: location.href, botcheck: ''
      };
      fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.success) { say('¡Gracias! Recibí tu mensaje.', 'ok'); form.reset(); } else { say('No se pudo enviar. Inténtalo de nuevo en un momento.', 'err'); } })
        .catch(function () { say('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', 'err'); })
        .then(function () { setTimeout(function () { btn.disabled = false; }, 4000); });
    });
  };

  /* ---------- Enviarme mis resultados ---------- */
  function buildText(p) {
    var out = [p.title, 'Fecha: ' + new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), ''];
    p.lines.forEach(function (l) { out.push(l.h ? '\n' + l.k.toUpperCase() : l.k + ': ' + l.v); });
    out.push('', DISCLAIMER, 'Calculado en: ' + location.href.split('#')[0]);
    return out.join('\n');
  }
  var dlg;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.className = 'ptz-dlg'; dlg.setAttribute('aria-labelledby', 'ptz-dt');
    dlg.innerHTML = '<form method="dialog" novalidate><h2 id="ptz-dt">Enviarme mis resultados</h2>' +
      '<p>Escribe tu correo y te mando este resumen. No lo guardo ni lo uso para otra cosa.</p>' +
      '<div class="ptz-f"><label for="ptz-mail">Tu correo</label><input id="ptz-mail" type="email" autocomplete="email" maxlength="120" required></div>' +
      '<label class="ptz-chk"><input id="ptz-ok" type="checkbox"> <span>Acepto que mi correo se use solo para enviarme este resumen.</span></label>' +
      '<div class="ptz-acts"><button type="submit" class="ptz-b" id="ptz-send">Enviar</button><button type="button" class="ptz-b ghost" id="ptz-copy">Copiar resumen</button><button type="button" class="ptz-b ghost" id="ptz-x">Cerrar</button></div>' +
      '<p class="ptz-msg" id="ptz-st" role="status" aria-live="polite"></p></form>';
    document.body.appendChild(dlg);
    dlg.querySelector('#ptz-x').addEventListener('click', function () { dlg.close(); });
    return dlg;
  }
  PTZ.mountEmail = function (button, getPayload) {
    if (!button) return;
    button.addEventListener('click', function () {
      var p = getPayload(); if (!p) return;
      var d = ensureDialog(), st = d.querySelector('#ptz-st'), mail = d.querySelector('#ptz-mail'), ok = d.querySelector('#ptz-ok'), send = d.querySelector('#ptz-send');
      var text = buildText(p), form = d.querySelector('form');
      function say(t, cls) { st.textContent = t; st.className = 'ptz-msg ' + (cls || ''); }
      say(''); send.disabled = false;
      form.onsubmit = function (ev) {
        ev.preventDefault();
        var to = mail.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { say('Escribe un correo válido.', 'err'); mail.focus(); return; }
        if (!ok.checked) { say('Marca la casilla para poder enviarlo.', 'err'); ok.focus(); return; }
        var E = CFG.emailjs || {};
        if (E.serviceId && E.templateId && E.publicKey) {
          send.disabled = true; say('Enviando…');
          fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service_id: E.serviceId, template_id: E.templateId, user_id: E.publicKey,
              template_params: { to_email: to, subject: p.title + ' | Patotipz', message: text } })
          }).then(function (r) { if (!r.ok) throw new Error('x'); say('Listo, revisa tu bandeja (y la carpeta de spam).', 'ok'); })
            .catch(function () { say('No se pudo enviar. Usa "Copiar resumen" o inténtalo más tarde.', 'err'); })
            .then(function () { send.disabled = false; });
        } else {
          location.href = 'mailto:' + encodeURIComponent(to).replace('%40', '@') + '?subject=' + encodeURIComponent(p.title + ' | Patotipz') + '&body=' + encodeURIComponent(text.slice(0, 1800));
          say('Se abrió tu app de correo con el resumen listo para enviarte.', 'ok');
        }
      };
      d.querySelector('#ptz-copy').onclick = function () {
        function done() { say('Resumen copiado.', 'ok'); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { say('No se pudo copiar.', 'err'); });
        else { say('Tu navegador no permite copiar automáticamente.', 'err'); }
      };
      d.showModal(); mail.focus();
    });
  };
  /* Estadísticas de visitas sin cookies (GoatCounter). Se activa poniendo goatcounter: 'tu-codigo' en config.js */
  if (CFG.goatcounter && /^[a-z0-9-]{2,40}$/i.test(CFG.goatcounter)) {
    var gc = document.createElement('script'); gc.async = true;
    gc.setAttribute('data-goatcounter', 'https://' + CFG.goatcounter + '.goatcounter.com/count');
    gc.src = 'https://gc.zgo.at/count.js'; document.head.appendChild(gc);
  }
  root.PTZ = PTZ;
})(window);
