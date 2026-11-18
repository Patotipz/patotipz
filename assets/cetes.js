/* Cálculos de CETES (tasa de rendimiento sobre 360 días, retención de ISR sobre capital). Estimaciones informativas. */
(function (root) {
  'use strict';
  var RETENCION_ISR = 0.90;   // % anual sobre el capital, Ley de Ingresos de la Federación 2026, art. 24
  var PLAZOS = [28, 91, 182, 364];
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function precioTitulo(tasaPct, dias) { return 10 / (1 + tasaPct / 100 * dias / 360); } // valor nominal $10
  function inversion(o) {
    var M = o.monto, d = o.dias, r = o.tasa / 100;
    var interes = M * r * d / 360;
    var retencion = M * (RETENCION_ISR / 100) * d / 365;
    var neto = interes - retencion;
    var anualBruta = Math.pow(1 + r * d / 360, 365 / d) - 1;
    var anualNeta = Math.pow(1 + neto / M, 365 / d) - 1;
    var real = (o.inflacion == null || !isFinite(o.inflacion)) ? null : (1 + anualNeta) / (1 + o.inflacion / 100) - 1;
    return { interes: interes, retencion: retencion, neto: neto, valorFinal: M + neto, anualBruta: anualBruta, anualNeta: anualNeta, real: real, precio: precioTitulo(o.tasa, d) };
  }
  // Reinvertir cada vencimiento (misma tasa) durante un horizonte en años
  function reinversion(o, anios) {
    var inv = inversion(o), n = Math.floor(anios * 365 / o.dias);
    var valor = o.monto * Math.pow(1 + inv.neto / o.monto, n);
    return { periodos: n, valorFinal: valor, gananciaNeta: valor - o.monto };
  }
  var api = { RETENCION_ISR: RETENCION_ISR, PLAZOS: PLAZOS, r2: r2, precioTitulo: precioTitulo, inversion: inversion, reinversion: reinversion };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Cetes = api;
})(typeof window !== 'undefined' ? window : this);
