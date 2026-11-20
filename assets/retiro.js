/* Deducción fiscal por aportaciones a retiro (LISR art. 151, fracc. V) y proyección de ahorro para el retiro.
   ISR anual estimado a partir de la tarifa mensual vigente (anual ≈ 12 × tarifa mensual de base/12). Estimación informativa. */
(function (root) {
  'use strict';
  var UMA_D = 117.31;                       // 2026
  var UMA_ANUAL = UMA_D * 365;              // 42,818.15
  var TOPE_UMA = 5 * UMA_ANUAL;             // 214,090.75
  var TARIFA = [[0.01, 0.00, 1.92], [844.60, 16.22, 6.40], [7168.52, 420.95, 10.88], [12598.03, 1011.68, 16.00], [14644.65, 1339.14, 17.92], [17533.65, 1856.84, 21.36], [35362.84, 5665.16, 23.52], [55736.69, 10457.09, 30.00], [106410.51, 25659.23, 32.00], [141880.67, 37009.69, 34.00], [425642.00, 133488.54, 35.00]];
  function isrMes(b) { if (!(b > 0)) return 0; var r = TARIFA[0]; for (var i = 0; i < TARIFA.length; i++) if (b >= TARIFA[i][0]) r = TARIFA[i]; return r[1] + (b - r[0]) * r[2] / 100; }
  function isrAnual(base) { return 12 * isrMes(base / 12); }
  function tasaMarginal(base) { var b = base / 12, r = TARIFA[0]; for (var i = 0; i < TARIFA.length; i++) if (b >= TARIFA[i][0]) r = TARIFA[i]; return r[2]; }
  function deduccion(o) {
    var tope10 = 0.10 * o.ingresos, tope = Math.min(tope10, TOPE_UMA);
    var deducible = Math.min(o.aporteAnual, tope);
    var base0 = Math.max(0, o.ingresos - (o.otras || 0)), base1 = Math.max(0, base0 - deducible);
    var ahorro = isrAnual(base0) - isrAnual(base1);
    return { tope10: tope10, topeUMA: TOPE_UMA, tope: tope, limita: tope10 <= TOPE_UMA ? '10% de tus ingresos' : '5 UMA anuales',
      deducible: deducible, excedente: Math.max(0, o.aporteAnual - tope), ahorro: ahorro, costoNeto: o.aporteAnual - ahorro,
      marginal: tasaMarginal(base0), isrSin: isrAnual(base0), isrCon: isrAnual(base1) };
  }
  // Saldo a la edad de retiro con aportación mensual creciente opcional (g % anual)
  function proyeccion(o) {
    var n = Math.max(0, Math.round((o.edadRetiro - o.edad) * 12)), rm = o.tasa / 100 / 12, g = (o.crece || 0) / 100;
    var s = o.inicial || 0, ap = o.mensual, aport = s;
    for (var m = 1; m <= n; m++) { s = s * (1 + rm) + ap; aport += ap; if (m % 12 === 0) ap *= 1 + g; }
    var f = Math.pow(1 + o.inflacion / 100, n / 12);
    var real = s / f;
    return { meses: n, final: s, aportado: aport, real: real, rentaMensualReal: real * (o.retiroPct / 100) / 12 };
  }
  var api = { UMA_ANUAL: UMA_ANUAL, TOPE_UMA: TOPE_UMA, isrAnual: isrAnual, deduccion: deduccion, proyeccion: proyeccion };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Retiro = api;
})(typeof window !== 'undefined' ? window : this);
