/* Motor de cálculo laboral México 2026. Estimaciones informativas.
   Fuentes: Anexo 8 RMF 2026 (tarifa mensual Art. 96 LISR), Decreto subsidio para el empleo (DOF 31-dic-2025),
   INEGI (UMA 2026), CONASAMI (salario mínimo 2026), Ley del Seguro Social. */
(function (root) {
  'use strict';
  var C = {
    year: 2026,
    UMA_D: 117.31, UMA_M: 3566.22,
    SM_GEN: 315.04, SM_FRONT: 440.87,
    SUBSIDIO: 535.65, SUBSIDIO_LIM: 11492.66, // 15.02% de la UMA mensual (desde feb-2026)
    TOPE_SBC_UMA: 25,
    IMSS_SBC: 0.375 + 0.25 + 0.625 + 1.125,   // % sobre SBC: pensionados + dinero + invalidez y vida + CEAV
    IMSS_EXC: 0.40,                            // % sobre excedente de 3 UMA
    DIAS_MES: 30.4
  };
  var TARIFA = [ // [límite inferior, cuota fija, % excedente]
    [0.01, 0.00, 1.92], [844.60, 16.22, 6.40], [7168.52, 420.95, 10.88], [12598.03, 1011.68, 16.00],
    [14644.65, 1339.14, 17.92], [17533.65, 1856.84, 21.36], [35362.84, 5665.16, 23.52],
    [55736.69, 10457.09, 30.00], [106410.51, 25659.23, 32.00], [141880.67, 37009.69, 34.00],
    [425642.00, 133488.54, 35.00]
  ];
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function isrTarifa(base) {
    if (!(base > 0)) return 0;
    var row = TARIFA[0];
    for (var i = 0; i < TARIFA.length; i++) { if (base >= TARIFA[i][0]) row = TARIFA[i]; }
    return row[1] + (base - row[0]) * row[2] / 100;
  }
  function vacDias(anioServicio) {
    var k = Math.max(1, Math.floor(anioServicio));
    if (k <= 5) return 12 + (k - 1) * 2;
    return 22 + 2 * Math.floor((k - 6) / 5);
  }
  function factorIntegracion(anioServicio, diasAguinaldo, primaVac) {
    var pv = (primaVac == null ? 25 : primaVac) / 100;
    return 1 + ((diasAguinaldo == null ? 15 : diasAguinaldo) + vacDias(anioServicio) * pv) / 365;
  }
  function mensualDe(monto, frecuencia) {
    if (frecuencia === 'quincenal') return monto * 2;
    if (frecuencia === 'semanal') return monto * C.DIAS_MES / 7;
    return monto;
  }
  function periodoDe(mensual, frecuencia) {
    if (frecuencia === 'quincenal') return mensual / 2;
    if (frecuencia === 'semanal') return mensual * 7 / C.DIAS_MES;
    return mensual;
  }
  function imssMensual(salarioMensual, anioServicio, diasAguinaldo) {
    var sd = salarioMensual / 30;
    var sbc = Math.min(sd * factorIntegracion(anioServicio, diasAguinaldo), C.TOPE_SBC_UMA * C.UMA_D);
    var base = sbc * C.IMSS_SBC / 100;
    var exc = Math.max(0, sbc - 3 * C.UMA_D) * C.IMSS_EXC / 100;
    return { sbc: sbc, cuota: (base + exc) * C.DIAS_MES };
  }
  function sueldoNeto(o) {
    var mensual = mensualDe(o.bruto, o.frecuencia);
    var imss = imssMensual(mensual, o.anioServicio || 1, o.diasAguinaldo == null ? 15 : o.diasAguinaldo);
    var isrBruto = isrTarifa(mensual);
    var sub = mensual <= C.SUBSIDIO_LIM ? C.SUBSIDIO : 0;
    var subAplicado = Math.min(sub, isrBruto);
    var isr = isrBruto - subAplicado;
    var neto = mensual - imss.cuota - isr;
    return {
      brutoMensual: r2(mensual), imss: r2(imss.cuota), sbcDiario: r2(imss.sbc), isrTarifa: r2(isrBruto),
      subsidio: r2(subAplicado), isr: r2(isr), netoMensual: r2(neto), netoPeriodo: r2(periodoDe(neto, o.frecuencia)),
      tasaEfectiva: mensual > 0 ? (mensual - neto) / mensual : 0
    };
  }
  // Retención sobre pagos anuales (aguinaldo, etc.): Art. 174 RISR
  function isrPagoAnual(gravable, mensualOrdinario) {
    if (!(gravable > 0)) return 0;
    var q = gravable / 365 * C.DIAS_MES;
    var rate = (isrTarifa(mensualOrdinario + q) - isrTarifa(mensualOrdinario)) / q;
    return gravable * rate;
  }
  // Pagos por separación: Art. 95 LISR
  function isrSeparacion(gravable, mensualOrdinario, anios) {
    if (!(gravable > 0)) return 0;
    var n = Math.max(1, anios), q = gravable / n;
    var rate = (isrTarifa(mensualOrdinario + q) - isrTarifa(mensualOrdinario)) / q;
    return gravable * rate;
  }
  function aguinaldo(o) {
    var dias = o.diasAguinaldo == null ? 15 : o.diasAguinaldo;
    var sd = o.salarioMensual / 30;
    var frac = Math.min(1, Math.max(0, (o.diasTrabajados == null ? 365 : o.diasTrabajados) / 365));
    var bruto = sd * dias * frac;
    var exento = Math.min(bruto, 30 * C.UMA_D);
    var grav = bruto - exento;
    var isr = isrPagoAnual(grav, o.salarioMensual);
    return { dias: r2(dias * frac), bruto: r2(bruto), exento: r2(exento), gravable: r2(grav), isr: r2(isr), neto: r2(bruto - isr) };
  }
  function diffDias(a, b) { return Math.round((b - a) / 86400000); }
  function antiguedad(ingreso, baja) { // devuelve años cumplidos y fracción
    var years = baja.getFullYear() - ingreso.getFullYear();
    var ann = new Date(ingreso.getFullYear() + years, ingreso.getMonth(), ingreso.getDate());
    if (ann > baja) { years--; ann = new Date(ingreso.getFullYear() + years, ingreso.getMonth(), ingreso.getDate()); }
    var next = new Date(ingreso.getFullYear() + years + 1, ingreso.getMonth(), ingreso.getDate());
    var frac = diffDias(ann, baja) / Math.max(1, diffDias(ann, next));
    return { cumplidos: years, fraccion: frac, total: years + frac, diasDesdeAniv: diffDias(ann, baja) + 1 };
  }
  function anioCompleto(total) { var e = Math.floor(total), f = total - e; return Math.max(1, f > 0.5 ? e + 1 : e); }

  function finiquito(o) {
    var ing = new Date(o.ingreso + 'T00:00:00'), baja = new Date(o.baja + 'T00:00:00');
    var sd = o.salarioMensual / 30, diasAg = o.diasAguinaldo == null ? 15 : o.diasAguinaldo;
    var ant = antiguedad(ing, baja);
    var inicioAnio = new Date(baja.getFullYear(), 0, 1);
    var desde = ing > inicioAnio ? ing : inicioAnio;
    var diasAnio = diffDias(desde, baja) + 1;
    var conc = [];
    var sueldoPend = (o.diasPendientes || 0) * sd;
    conc.push({ k: 'Sueldo pendiente (' + (o.diasPendientes || 0) + ' días)', v: sueldoPend, grav: true });
    var agBruto = sd * diasAg * Math.min(1, diasAnio / 365);
    conc.push({ k: 'Aguinaldo proporcional (' + r2(diasAg * Math.min(1, diasAnio / 365)) + ' días)', v: agBruto, tipo: 'aguinaldo' });
    var anioServ = ant.cumplidos + 1;
    var vacAnio = vacDias(anioServ);
    var vacProp = Math.max(0, vacAnio * (ant.diasDesdeAniv / 365) - (o.vacTomadas || 0));
    var vacTotalDias = vacProp + (o.vacPendientes || 0);
    var vacMonto = vacTotalDias * sd;
    conc.push({ k: 'Vacaciones pendientes (' + r2(vacTotalDias) + ' días)', v: vacMonto, grav: true });
    var prima = vacMonto * 0.25;
    conc.push({ k: 'Prima vacacional 25%', v: prima, tipo: 'prima' });
    return { ant: ant, sd: sd, conceptos: conc, anioServ: anioServ, vacDiasAnio: vacAnio, diasAnio: diasAnio };
  }
  function totalizarFiniquito(f, salarioMensual) {
    var bruto = 0, grav = 0, exento = 0;
    f.conceptos.forEach(function (c) {
      bruto += c.v;
      if (c.tipo === 'aguinaldo') { var ex = Math.min(c.v, 30 * C.UMA_D); exento += ex; grav += c.v - ex; }
      else if (c.tipo === 'prima') { var ex2 = Math.min(c.v, 15 * C.UMA_D); exento += ex2; grav += c.v - ex2; }
      else grav += c.v;
    });
    var isr = isrPagoAnual(grav, salarioMensual);
    return { bruto: bruto, exento: exento, gravable: grav, isr: isr, neto: bruto - isr };
  }
  // o.motivo: 'renuncia' | 'despido_injustificado' | 'despido_justificado'
  function liquidacion(o) {
    var f = finiquito(o);
    var fin = totalizarFiniquito(f, o.salarioMensual);
    var sd = o.salarioMensual / 30;
    var sdi = sd * factorIntegracion(f.anioServ, o.diasAguinaldo);
    var anios = f.ant.total;
    var indem = o.motivo === 'despido_injustificado';
    var conc = [];
    var tres = indem ? 90 * sdi : 0;
    var veinte = indem ? 20 * anios * sdi : 0;
    var topeSM = 2 * (o.zonaFrontera ? C.SM_FRONT : C.SM_GEN);
    var sdPrima = Math.min(sd, topeSM);
    var aplicaPrima = o.motivo !== 'renuncia' || anios >= 15;
    var prima = aplicaPrima ? 12 * anioCompleto(anios) * sdPrima : 0;
    if (indem) { conc.push({ k: 'Indemnización constitucional (3 meses)', v: tres }); conc.push({ k: '20 días por año de servicio (' + r2(anios) + ' años)', v: veinte }); }
    if (aplicaPrima) conc.push({ k: 'Prima de antigüedad (12 días por año, tope 2 salarios mínimos)', v: prima });
    var sep = tres + veinte + prima;
    var exSep = Math.min(sep, 90 * C.UMA_D * anioCompleto(anios));
    var gravSep = sep - exSep;
    var isrSep = isrSeparacion(gravSep, o.salarioMensual, anioCompleto(anios));
    return {
      finiquito: f, finTot: fin, conceptosSep: conc, sdi: sdi, sepBruto: sep, sepExento: exSep, sepGravable: gravSep,
      isrSep: isrSep, isrTotal: fin.isr + isrSep, brutoTotal: fin.bruto + sep, netoTotal: fin.neto + sep - isrSep
    };
  }
  var api = { C: C, TARIFA: TARIFA, r2: r2, isrTarifa: isrTarifa, vacDias: vacDias, factorIntegracion: factorIntegracion,
    mensualDe: mensualDe, periodoDe: periodoDe, imssMensual: imssMensual, sueldoNeto: sueldoNeto, aguinaldo: aguinaldo,
    isrPagoAnual: isrPagoAnual, isrSeparacion: isrSeparacion, antiguedad: antiguedad, anioCompleto: anioCompleto,
    finiquito: finiquito, totalizarFiniquito: totalizarFiniquito, liquidacion: liquidacion };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Laboral = api;
})(typeof window !== 'undefined' ? window : this);
