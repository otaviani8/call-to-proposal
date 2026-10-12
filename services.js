// Catálogo de ejemplo para la copia pública. El real (niveles, precios y alias históricos) es privado.
// Exporta lo mismo que usa lib/propuesta-html.js: normalizar y presupuestoItems.

const SERVICIOS = {
  plan_mensual: {
    nombre: 'Plan mensual de adquisición',
    precio: 500, unidad: 'mes', core: true, nivel: 10,
    presDetalle: [
      'Plan de zonas y clientes a buscar',
      'Anuncios en Facebook, Instagram y Google',
      'Preguntas de calificación y mensajes armados para contestar',
      'Panel con cada consulta, su zona y su costo',
    ],
  },
};
const PAUTA_MINIMA_ARS = 400000; // valor de ejemplo

// Saca claves desconocidas y duplicados, y garantiza que haya un servicio principal primero.
function normalizar(claves) {
  const out = [...new Set((claves || []).filter((k) => SERVICIOS[k]))];
  if (!out.some((k) => SERVICIOS[k].core)) out.unshift('plan_mensual');
  return out.sort((a, b) => (SERVICIOS[b].core ? 1 : 0) - (SERVICIOS[a].core ? 1 : 0));
}

// 1000 -> "1.000,00"
function fmtUSD(n) {
  const s = (Number(n) || 0).toFixed(2).split('.');
  return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Filas del presupuesto y totales. La publicidad no se suma: el cliente la paga directo a la plataforma.
function presupuestoItems(claves, opciones = {}) {
  let subtotal = 0;
  const filas = normalizar(claves).map((k, i) => {
    const s0 = SERVICIOS[k];
    const s = s0.core && Number(opciones.honorario) > 0 ? { ...s0, precio: Number(opciones.honorario) } : s0;
    subtotal += s.precio;
    const det = (s.presDetalle || []).map((d) => `<li>${esc(d)}</li>`).join('');
    return `        <tr>\n          <td class="c">${String(i + 1).padStart(3, '0')}</td>\n` +
      `          <td><b>${esc(s.nombre)}</b><ul class="pz__det">${det}</ul></td>\n` +
      `          <td class="r">1,00</td><td class="c">${s.unidad === 'mes' ? 'mes' : 'único'}</td>\n` +
      `          <td class="r">${fmtUSD(s.precio)}</td><td class="r">0,00</td><td class="r">0,00</td>\n` +
      `          <td class="r">${fmtUSD(s.precio)}</td>\n        </tr>`;
  });
  const pautaArs = Math.max(PAUTA_MINIMA_ARS, Number(opciones.pautaArs) || 0);
  return {
    pautaArs: String(Math.round(pautaArs)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    html: filas.join('\n'),
    subtotal: fmtUSD(subtotal),
    total: fmtUSD(subtotal),
    moneda: 'USD',
  };
}

export { SERVICIOS, fmtUSD, presupuestoItems, normalizar };
