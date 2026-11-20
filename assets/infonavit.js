/* Tasa de interés del crédito Infonavit según el salario (en UMA mensual). Tabla proporcionada por el autor del sitio;
   extremos 3.69% y 10.45% coinciden con el rango oficial 2026 publicado por medios. Confirma tu tasa en Mi Cuenta Infonavit. */
(function (root) {
  'use strict';
  var UMA_M = 3566.22;
  // [salario en UMA (hasta), salario mensual en pesos, tasa anual %]. La última fila aplica de 6.6 UMA en adelante.
  var TASAS = [[2.6, 9272.18, 3.69], [2.7, 9628.8, 3.88], [2.8, 9985.43, 4.07], [2.9, 10342.05, 4.26], [3.0, 10698.67, 4.45], [3.1, 11055.29, 4.64], [3.2, 11411.92, 4.83], [3.3, 11768.54, 5.02], [3.4, 12125.16, 5.21], [3.5, 12481.78, 5.4], [3.6, 12838.41, 5.59], [3.7, 13195.03, 5.78], [3.8, 13551.65, 5.96], [3.9, 13908.27, 6.15], [4.0, 14264.9, 6.34], [4.1, 14621.52, 6.53], [4.2, 14978.14, 6.72], [4.3, 15334.76, 6.91], [4.4, 15691.39, 7.1], [4.5, 16048.01, 7.29], [4.6, 16404.63, 7.48], [4.7, 16761.25, 7.67], [4.8, 17117.88, 7.86], [4.9, 17474.5, 8.05], [5.0, 17831.12, 8.19], [5.1, 18187.74, 8.33], [5.2, 18544.36, 8.47], [5.3, 18900.99, 8.61], [5.4, 19257.61, 8.76], [5.5, 19614.23, 8.9], [5.6, 19970.85, 9.04], [5.7, 20327.48, 9.18], [5.8, 20684.1, 9.32], [5.9, 21040.72, 9.46], [6.0, 21397.34, 9.6], [6.1, 21753.97, 9.74], [6.2, 22110.59, 9.89], [6.3, 22467.21, 10.03], [6.4, 22823.83, 10.17], [6.5, 23180.46, 10.31], [6.6, 23537.08, 10.45]];
  function tasaPara(salario) {
    if (!(salario > 0)) return null;
    for (var i = 0; i < TASAS.length; i++) if (salario <= TASAS[i][1] + 0.005) return TASAS[i];
    return TASAS[TASAS.length - 1];
  }
  var api = { UMA_M: UMA_M, TASAS: TASAS, tasaPara: tasaPara };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.InfonavitTasas = api;
})(typeof window !== 'undefined' ? window : this);
