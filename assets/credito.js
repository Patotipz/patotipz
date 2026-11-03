/* Motor de créditos (hipoteca / auto): sistema francés (cuota fija), abonos extra y CAT estimado por TIR. */
(function (root) {
  'use strict';
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function cuota(P, tasaAnualPct, n) {
    var r = tasaAnualPct / 100 / 12;
    if (!(P > 0) || !(n > 0)) return 0;
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }
  function simular(P, tasaAnualPct, n, extra) {
    var r = tasaAnualPct / 100 / 12, c = cuota(P, tasaAnualPct, n), bal = P, ints = 0, pagos = 0, m = 0, anual = [];
    var yInt = 0, yCap = 0;
    while (bal > 0.005 && m < n + 1) {
      m++;
      var i = bal * r, cap = c - i;
      if (m === n || cap > bal) cap = bal;
      var ex = Math.min(extra || 0, Math.max(0, bal - cap));
      pagos += i + cap + ex; ints += i; bal -= cap + ex;
      yInt += i; yCap += cap + ex;
      if (m % 12 === 0 || bal <= 0.005) { anual.push({ anio: Math.ceil(m / 12), interes: yInt, capital: yCap, saldo: Math.max(0, bal) }); yInt = 0; yCap = 0; }
    }
    return { cuota: c, meses: m, intereses: ints, pagos: pagos, anual: anual };
  }
  function catEstimado(P, tasaAnualPct, n, comision, segMensual) {
    var c = cuota(P, tasaAnualPct, n) + (segMensual || 0), net = P - (comision || 0);
    if (!(net > 0) || !(c > 0)) return null;
    var lo = 0, hi = 1;
    function npv(rate) { var v = 0, d = 1; for (var t = 1; t <= n; t++) { d /= (1 + rate); v += c * d; } return v - net; }
    if (npv(0) < 0) return null;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
    return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
  }
  // o: precio, enganchePct, tasa, plazoMeses, comisionPct, segurosMensual, gastosPct, extra
  function oferta(o) {
    var precio = +o.precio || 0, enganche = precio * (+o.enganchePct || 0) / 100, monto = Math.max(0, precio - enganche);
    var comision = monto * (+o.comisionPct || 0) / 100, gastos = precio * (+o.gastosPct || 0) / 100;
    var n = Math.max(1, Math.round(+o.plazoMeses || 0)), seg = +o.segurosMensual || 0;
    var base = simular(monto, +o.tasa || 0, n, 0), conExtra = simular(monto, +o.tasa || 0, n, +o.extra || 0);
    var sim = (+o.extra > 0) ? conExtra : base;
    var segTotal = seg * sim.meses;
    return {
      enganche: enganche, monto: monto, comision: comision, gastos: gastos, cuota: base.cuota, cuotaTotal: base.cuota + seg,
      meses: sim.meses, intereses: sim.intereses, segurosTotal: segTotal,
      totalPagadoCredito: sim.pagos + segTotal,
      costoTotal: enganche + sim.pagos + segTotal + comision + gastos,
      ahorroIntereses: base.intereses - conExtra.intereses, mesesAhorrados: base.meses - conExtra.meses,
      catEstimado: catEstimado(monto, +o.tasa || 0, n, comision, seg), ingresoSugerido: (base.cuota + seg) / 0.30,
      anual: sim.anual
    };
  }
  var api = { r2: r2, cuota: cuota, simular: simular, catEstimado: catEstimado, oferta: oferta };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Credito = api;
})(typeof window !== 'undefined' ? window : this);
