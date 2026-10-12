// Arma la propuesta + presupuesto de un cliente y devuelve el PDF. ESM.
// POST /api/propuesta  { filename, data: {
//   cliente, cliente_descriptor, fecha_mes, diag_lead, diag:[{t,d}×3], oportunidad,
//   vende, a_quien, zonas_hoy, zonas_nuevas, pedido_minimo, como_llegan, quien_contesta,
//   pasos:[4 frases "en tu caso"], llamada2, honorario (USD/mes, default 500),
//   pauta_ars (default 400000), cuit, pres_fecha, servicios (opcional, compat) } }
// Todos los campos nuevos son opcionales: si faltan, la propuesta sale sin ese renglón.
// Diseño: marca 2026 (templates/propuesta.html).
import { htmlToPdf, checkAuth, parseBody } from '../lib/pdf.js';
import { armarPropuestaHTML } from '../lib/propuesta-html.js';

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const body = parseBody(req);
  const d = body.data || {};
  const filename = (body.filename ? String(body.filename) : ((d.cliente || 'Cliente') + ' - Plan de trabajo')).replace(/[^\w \-.áéíóúñÁÉÍÓÚÑ]/g, '');

  try {
    const pdf = await htmlToPdf(armarPropuestaHTML(d));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.pdf"`);
    return res.status(200).send(pdf);
  } catch (e) {
    return res.status(500).json({ error: 'Fallo el render de la propuesta', detalle: String((e && e.message) || e) });
  }
}
