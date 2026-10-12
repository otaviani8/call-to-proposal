// Arma el HTML de la propuesta (marca 2026) a partir de los datos de la llamada. ESM.
// Lo usan api/propuesta.js (datos ya armados) y api/propuesta-desde-transcripcion.js (los saca
// Claude de la transcripción). El template es HTML autocontenido con tokens {{ASÍ}}.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { presupuestoItems, normalizar } from '../services.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(__dirname, '..', 'templates', 'propuesta.html'), 'utf8');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const limpio = (s) => String(s == null ? '' : s).trim();

// Topes de largo por campo: con estos máximos ninguna página desborda.
// Son los mismos que se le piden a Claude en api/propuesta-desde-transcripcion.js.
export const TOPES = {
  cliente: 48, cliente_descriptor: 110, diag_lead: 180, diag_t: 80, diag_d: 210,
  oportunidad: 260, paso: 150, ficha: 56, llamada2: 40,
};
export function tope(s, n) {
  s = limpio(s);
  if (s.length <= n) return s;
  const corte = s.slice(0, n - 1);
  const i = corte.lastIndexOf(' ');
  return (i > n * 0.6 ? corte.slice(0, i) : corte).replace(/[,.;:\s]+$/, '') + '…';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function mesAnio(d = new Date()) {
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
export function fechaCorta(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Ficha de la llamada: solo los datos que aparecieron. Nunca un renglón vacío.
const FICHA = [
  ['vende', 'Qué vende'],
  ['a_quien', 'A quién le vende'],
  ['zonas_hoy', 'Dónde reparte hoy'],
  ['zonas_nuevas', 'Dónde quiere llegar'],
  ['pedido_minimo', 'Pedido mínimo'],
  ['como_llegan', 'Cómo entran hoy los nuevos'],
  ['quien_contesta', 'Quién les contesta'],
];

export function armarPropuestaHTML(d = {}) {
  const claves = normalizar(Array.isArray(d.servicios) ? d.servicios : []);
  const items = presupuestoItems(claves, { pauta: d.pauta, honorario: d.honorario, pautaArs: d.pauta_ars });
  const diag = (Array.isArray(d.diag) ? d.diag : []).filter((x) => x && limpio(x.t))
    .map((x) => ({ t: tope(x.t, TOPES.diag_t), d: tope(x.d, TOPES.diag_d) }));
  const pasos = (Array.isArray(d.pasos) ? d.pasos : []).map((p) => tope(p, TOPES.paso));

  const diagHTML = diag.slice(0, 3).map((x, i) =>
    `<div class="dg__r"><div class="dg__n">${String(i + 1).padStart(2, '0')}</div><div><h3>${esc(x.t)}</h3>${limpio(x.d) ? `<p>${esc(x.d)}</p>` : ''}</div></div>`
  ).join('');

  const fichaRows = FICHA.filter(([k]) => limpio(d[k])).map(([k, label]) =>
    `<div class="fi__r"><div class="fi__k">${esc(label)}</div><div class="fi__v">${esc(tope(d[k], TOPES.ficha))}</div></div>`
  ).join('');
  const fichaHTML = fichaRows
    ? `<div class="eb">De la llamada</div><div class="mt2">${fichaRows}</div>`
    : '';

  const llamada2 = limpio(d.llamada2)
    ? `Lo repasamos juntos en la llamada del ${esc(tope(d.llamada2, TOPES.llamada2))}. Si lo decidís con alguien más, sumalo.`
    : '';

  const texto = {
    CLIENTE: tope(d.cliente, TOPES.cliente) || 'Cliente',
    CLIENTE_DESCRIPTOR: tope(d.cliente_descriptor, TOPES.cliente_descriptor),
    FECHA_MES: limpio(d.fecha_mes) || mesAnio(),
    DIAG_LEAD: tope(d.diag_lead, TOPES.diag_lead),
    OPORTUNIDAD: tope(d.oportunidad, TOPES.oportunidad),
    PASO_1: limpio(pasos[0]),
    PASO_2: limpio(pasos[1]),
    PASO_3: limpio(pasos[2]),
    PASO_4: limpio(pasos[3]),
    CLIENTE_CUIT: limpio(d.cuit),
    PRES_FECHA: limpio(d.pres_fecha) || fechaCorta(),
    PRES_SUBTOTAL: items.subtotal,
    PRES_TOTAL: items.total,
    PRES_PAUTA_NOTA: `Aparte de estos honorarios, la publicidad se paga desde la cuenta del Cliente, directo a Meta: no se factura ni pasa por Acme. Publicidad mensual acordada: ARS ${items.pautaArs}.`,
  };
  const crudo = {
    DIAG_HTML: diagHTML,
    FICHA_HTML: fichaHTML,
    LLAMADA2: llamada2,
    PRES_ITEMS_HTML: items.html,
  };

  let html = TEMPLATE;
  for (const k in crudo) html = html.split('{{' + k + '}}').join(crudo[k]);
  for (const k in texto) html = html.split('{{' + k + '}}').join(esc(texto[k]));
  return html;
}
