/* Comparador de ofertas de crédito (hipoteca o auto). Requiere site.js y credito.js */
(function (root) {
  'use strict';
  var E = PTZ.el, M = PTZ.money, COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];

  function init(cfg) {
    var P = cfg.prefix, host = document.getElementById(cfg.rootId);
    var shared = E('form', { class: 'card', id: P + '-shared', novalidate: '' });
    shared.appendChild(E('h2', { text: cfg.sharedTitle }));
    function field(id, label, val, attrs, hint) {
      var inp = E('input', Object.assign({ id: id, type: 'number', inputmode: 'decimal', step: 'any', min: '0', value: String(val) }, attrs || {}));
      var kids = [E('label', { for: id, text: label }), inp];
      if (hint) kids.push(E('small', { text: hint }));
      return E('div', { class: 'field' }, kids);
    }
    var r1 = E('div', { class: 'row2' }, [field(P + '-precio', cfg.precioLabel, cfg.precioDef), field(P + '-gastos', cfg.gastosLabel, cfg.gastosDef, null, cfg.gastosHint)]);
    shared.appendChild(r1);
    shared.appendChild(field(P + '-extra', 'Abono extra mensual a capital ($, opcional)', 0, null, 'Mira cuánto interés y tiempo te ahorras si pagas un poco más cada mes.'));
    host.appendChild(shared);
    host.appendChild(E('div', { style: 'height:14px' }));
    host.appendChild(E('p', { class: 'warn', text: 'Las ofertas de abajo son ejemplos. Reemplázalas con las cotizaciones que te den los bancos.' }));

    var offers = E('div', { class: 'offers' });
    cfg.offers.forEach(function (o, i) {
      var id = P + i, card = E('div', { class: 'card' });
      card.appendChild(E('h2', {}, [E('span', { text: 'Oferta ' + 'ABC'[i] }), E('span', { class: 'tag', id: id + '-best' })]));
      card.appendChild(E('div', { class: 'field' }, [E('label', { for: id + '-nombre', text: 'Nombre (banco o agencia)' }), E('input', { id: id + '-nombre', type: 'text', maxlength: '40', value: o.nombre })]));
      card.appendChild(E('div', { class: 'row2' }, [field(id + '-eng', 'Enganche (%)', o.eng, { max: '95' }), field(id + '-tasa', 'Tasa anual fija (%)', o.tasa, { max: '80' })]));
      var plazo = E('select', { id: id + '-plazo' });
      cfg.plazos.forEach(function (p) { var op = E('option', { value: String(p), text: p + ' ' + cfg.plazoUnit }); if (p === o.plazo) op.selected = true; plazo.appendChild(op); });
      card.appendChild(E('div', { class: 'row2' }, [E('div', { class: 'field' }, [E('label', { for: id + '-plazo', text: 'Plazo' }), plazo]), field(id + '-com', 'Comisión por apertura (%)', o.com, { max: '10' })]));
      card.appendChild(field(id + '-seg', cfg.seguroLabel, o.seg, null, cfg.seguroHint));
      offers.appendChild(card);
    });
    host.appendChild(offers);

    var out = E('div', { class: 'card soft', 'aria-live': 'polite' });
    host.appendChild(out);
    var state = { res: null, payload: null };

    function read() {
      var precio = parseFloat(document.getElementById(P + '-precio').value) || 0;
      var gastos = parseFloat(document.getElementById(P + '-gastos').value) || 0;
      var extra = parseFloat(document.getElementById(P + '-extra').value) || 0;
      return cfg.offers.map(function (o, i) {
        var id = P + i, g = function (k) { return parseFloat(document.getElementById(id + k).value) || 0; };
        var plazo = parseFloat(document.getElementById(id + '-plazo').value) || 1;
        var seg = g('-seg');
        return {
          nombre: (document.getElementById(id + '-nombre').value || ('Oferta ' + 'ABC'[i])).trim().slice(0, 40),
          input: { precio: precio, enganchePct: Math.min(95, g('-eng')), tasa: g('-tasa'), plazoMeses: cfg.plazoUnit === 'años' ? plazo * 12 : plazo,
            comisionPct: g('-com'), segurosMensual: cfg.seguroAnual ? seg / 12 : seg, gastosPct: gastos, extra: extra }
        };
      });
    }
    function row(label, vals, opts) {
      opts = opts || {};
      var tr = E('tr', { class: opts.cls || '' }, [E('th', { scope: 'row', text: label, style: 'font-weight:' + (opts.cls === 'tot' ? '800' : '400') })]);
      vals.forEach(function (v) { tr.appendChild(E('td', { class: 'n', text: v })); });
      return tr;
    }
    function render() {
      var ofs = read();
      var oldDet = out.querySelector('details'), wasOpen = !!(oldDet && oldDet.open), oldSel = out.querySelector('#' + P + '-yr'), selIdx = oldSel ? oldSel.value : '0';
      out.textContent = '';
      if (!(ofs[0].input.precio > 0)) { out.appendChild(E('p', { text: 'Escribe el precio para ver la comparación.' })); state.payload = null; return; }
      var res = ofs.map(function (o) { return Credito.oferta(o.input); });
      var best = 0; res.forEach(function (r, i) { if (r.costoTotal < res[best].costoTotal) best = i; });
      cfg.offers.forEach(function (o, i) { var t = document.getElementById(P + i + '-best'); t.textContent = (i === best && res.length > 1) ? 'Costo total más bajo' : ''; t.className = 'tag' + (i === best ? ' best' : ''); t.style.display = i === best ? '' : 'none'; });
      out.appendChild(E('h2', { text: 'Comparación' }));
      var head = E('tr', {}, [E('th', { scope: 'col', text: '' })]);
      ofs.forEach(function (o, i) { head.appendChild(E('th', { scope: 'col', class: 'n', text: o.nombre + (i === best ? ' ★' : '') })); });
      var body = E('tbody');
      var hasExtra = ofs[0].input.extra > 0, mm = function (f) { return res.map(function (r) { return M(f(r)); }); };
      body.appendChild(row('Enganche', mm(function (r) { return r.enganche; })));
      body.appendChild(row('Monto del crédito', mm(function (r) { return r.monto; })));
      body.appendChild(row('Mensualidad (capital + interés)', mm(function (r) { return r.cuota; }), { cls: '' }));
      body.appendChild(row('Mensualidad con seguros', mm(function (r) { return r.cuotaTotal; })));
      body.appendChild(row('Plazo real', res.map(function (r) { return r.meses >= 24 ? (r.meses / 12).toFixed(1).replace('.0', '') + ' años' : r.meses + ' meses'; })));
      body.appendChild(row('Intereses totales', mm(function (r) { return r.intereses; })));
      body.appendChild(row('Seguros durante el crédito', mm(function (r) { return r.segurosTotal; })));
      body.appendChild(row('Comisión por apertura', mm(function (r) { return r.comision; })));
      body.appendChild(row('Gastos iniciales', mm(function (r) { return r.gastos; })));
      body.appendChild(row('Costo total (todo incluido)', mm(function (r) { return r.costoTotal; }), { cls: 'tot' }));
      body.appendChild(row('CAT estimado (sin IVA)', res.map(function (r) { return r.catEstimado == null ? 'n/d' : PTZ.pct(r.catEstimado, 1); })));
      body.appendChild(row('Ingreso mensual sugerido*', mm(function (r) { return r.ingresoSugerido; })));
      if (hasExtra) {
        body.appendChild(row('Intereses que te ahorras con el abono extra', mm(function (r) { return r.ahorroIntereses; })));
        body.appendChild(row('Meses que te ahorras', res.map(function (r) { return String(r.mesesAhorrados); })));
      }
      out.appendChild(E('div', { class: 'tbl-wrap' }, [E('table', { class: 't' }, [E('thead', {}, [head]), body])]));
      out.appendChild(E('p', { class: 'note', text: '★ = menor costo total considerando enganche, intereses, seguros, comisión y gastos. *Ingreso necesario si la mensualidad no pasa de 30% de tus ingresos (regla práctica; cada institución usa sus propios criterios). El CAT estimado se calcula con tus datos y puede diferir del CAT oficial que publique cada institución.' }));

      // Barras
      var max = Math.max.apply(null, res.map(function (r) { return r.costoTotal; })) || 1;
      var bars = E('div', { class: 'bars', role: 'group', 'aria-label': 'Composición del costo total por oferta' });
      res.forEach(function (r, i) {
        var otros = r.segurosTotal + r.comision + r.gastos, parts = [[r.enganche, 'Enganche'], [r.monto, 'Capital del crédito'], [r.intereses, 'Intereses'], [otros, 'Seguros, comisión y gastos']];
        var bar = E('div', { class: 'bar', role: 'img', 'aria-label': ofs[i].nombre + ': costo total ' + M(r.costoTotal) + '. ' + parts.map(function (p) { return p[1] + ' ' + M(p[0]); }).join(', ') });
        parts.forEach(function (p, k) { bar.appendChild(E('i', { style: 'width:' + (p[0] / max * 100) + '%;background:' + COLORS[k] })); });
        bars.appendChild(E('div', {}, [E('div', { class: 'bar-l', text: ofs[i].nombre + ': ' + M(r.costoTotal) }), bar]));
      });
      var legend = E('div', { class: 'legend' });
      ['Enganche', 'Capital del crédito', 'Intereses', 'Seguros, comisión y gastos'].forEach(function (t, k) { legend.appendChild(E('span', {}, [E('b', { style: 'background:' + COLORS[k] }), t])); });
      out.appendChild(E('h2', { text: 'Cuánto pagas en total', style: 'margin-top:16px' })); out.appendChild(bars); out.appendChild(legend);

      // Año por año
      var det = E('details', { class: 'ref', style: 'background:var(--bg)' }, [E('summary', { text: 'Ver pagos y saldo año por año' })]);
      var sel = E('select', { id: P + '-yr', 'aria-label': 'Oferta a detallar', style: 'margin:10px 0;max-width:260px' });
      ofs.forEach(function (o, i) { sel.appendChild(E('option', { value: String(i), text: o.nombre })); });
      var yhost = E('div', { class: 'tbl-wrap' });
      function ytable() {
        var r = res[+sel.value], b = E('tbody');
        r.anual.forEach(function (a) { b.appendChild(E('tr', {}, [E('th', { scope: 'row', text: 'Año ' + a.anio, style: 'font-weight:400' }), E('td', { class: 'n', text: M(a.capital) }), E('td', { class: 'n', text: M(a.interes) }), E('td', { class: 'n', text: M(a.saldo) })])); });
        yhost.textContent = '';
        yhost.appendChild(E('table', { class: 't' }, [E('thead', {}, [E('tr', {}, [E('th', { scope: 'col', text: '' }), E('th', { scope: 'col', class: 'n', text: 'Capital pagado' }), E('th', { scope: 'col', class: 'n', text: 'Intereses' }), E('th', { scope: 'col', class: 'n', text: 'Saldo al cierre' })])]), b]));
      }
      sel.value = selIdx; if (sel.value !== selIdx) sel.value = '0';
      sel.addEventListener('change', function (ev) { ev.stopPropagation(); ytable(); }); ytable();
      if (wasOpen) det.open = true;
      det.appendChild(sel); det.appendChild(yhost); out.appendChild(det);

      var b = E('button', { class: 'btn ghost', type: 'button', text: 'Enviarme mis resultados' });
      out.appendChild(E('div', { class: 'actions' }, [b])); PTZ.mountEmail(b, function () { return state.payload; });

      var lines = [{ k: cfg.precioLabel, v: M(ofs[0].input.precio) }];
      res.forEach(function (r, i) {
        lines.push({ k: ofs[i].nombre + (i === best ? ' (costo total más bajo)' : ''), h: true });
        lines.push({ k: 'Tasa / plazo / enganche', v: ofs[i].input.tasa + '% / ' + (cfg.plazoUnit === 'años' ? ofs[i].input.plazoMeses / 12 : ofs[i].input.plazoMeses) + ' ' + cfg.plazoUnit + ' / ' + ofs[i].input.enganchePct + '%' });
        lines.push({ k: 'Monto del crédito', v: M(r.monto) }); lines.push({ k: 'Mensualidad con seguros', v: M(r.cuotaTotal) });
        lines.push({ k: 'Intereses totales', v: M(r.intereses) }); lines.push({ k: 'Costo total (todo incluido)', v: M(r.costoTotal) });
        lines.push({ k: 'CAT estimado', v: r.catEstimado == null ? 'n/d' : PTZ.pct(r.catEstimado, 1) });
      });
      state.res = res; state.payload = { title: cfg.emailTitle, lines: lines };
    }
    host.addEventListener('input', render);
    host.addEventListener('change', render);
    host.addEventListener('submit', function (e) { e.preventDefault(); });
    render();
  }
  root.PTZComp = { init: init };
})(window);
