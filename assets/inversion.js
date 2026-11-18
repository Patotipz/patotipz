/* Proyección de ahorro/inversión con aportaciones mensuales. Capitalización mensual; la retención de ISR
   (0.90% anual en 2026 sobre el capital) se descuenta cada mes del saldo. Estimaciones informativas. */
(function (root) {
  'use strict';
  var RET = 0.90;
  function proyectar(o) {
    var rm = (o.tasa / 100) / 12 - (o.retencion === false ? 0 : RET / 100 / 12);
    var n = Math.round(o.anios * 12), saldo = o.inicial, aport = 0, serie = [];
    for (var m = 1; m <= n; m++) {
      saldo = saldo * (1 + rm) + o.mensual; aport += o.mensual;
      if (m % 12 === 0 || m === n) serie.push({ mes: m, saldo: saldo, aportado: o.inicial + aport });
    }
    var aportado = o.inicial + aport, f = o.inflacion == null ? null : Math.pow(1 + o.inflacion / 100, n / 12);
    return { n: n, rm: rm, final: saldo, aportado: aportado, ganancia: saldo - aportado,
      real: f == null ? null : saldo / f, gananciaReal: f == null ? null : saldo / f - aportado, serie: serie };
  }
  // Aportación mensual necesaria para llegar a una meta
  function aporteParaMeta(o) {
    var base = proyectar({ inicial: o.inicial, mensual: 0, anios: o.anios, tasa: o.tasa, retencion: o.retencion, inflacion: null });
    var unit = proyectar({ inicial: 0, mensual: 1, anios: o.anios, tasa: o.tasa, retencion: o.retencion, inflacion: null });
    var falta = o.meta - base.final;
    return falta <= 0 ? 0 : falta / unit.final;
  }
  var api = { RET: RET, proyectar: proyectar, aporteParaMeta: aporteParaMeta };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Inversion = api;
})(typeof window !== 'undefined' ? window : this);
