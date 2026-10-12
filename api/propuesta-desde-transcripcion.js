// De la transcripción de la llamada 1 al PDF del plan de trabajo, en un solo paso. ESM.
// POST /api/propuesta-desde-transcripcion  (header x-api-key)
//   { transcripcion, filename?, honorario? (USD/mes, default 500), cuit?, formato? ("json" para ver solo los campos) }
// Devuelve el PDF, con los campos en el header X-Propuesta-Campos (JSON en base64) para que el
// Apps Script los guarde en la planilla y le mande las alertas al dueño.
import { htmlToPdf, checkAuth, parseBody } from '../lib/pdf.js';
import { armarPropuestaHTML } from '../lib/propuesta-html.js';
import { extraerCampos } from '../lib/propuesta-claude.js';

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const body = parseBody(req);
  let resultado;
  try {
    resultado = await extraerCampos(body.transcripcion);
  } catch (e) {
    return res.status(422).json({ error: 'No se pudieron sacar los campos de la transcripción', detalle: String((e && e.message) || e) });
  }
  const campos = { ...resultado.campos, honorario: Number(body.honorario) > 0 ? Number(body.honorario) : 500, cuit: body.cuit || '' };
  if (body.formato === 'json') return res.status(200).json({ campos, modelo: resultado.modelo, uso: resultado.uso });

  const filename = (body.filename ? String(body.filename) : `${campos.cliente || 'Cliente'} - Plan de trabajo`).replace(/[^\w \-.áéíóúñÁÉÍÓÚÑ]/g, '');
  try {
    const pdf = await htmlToPdf(armarPropuestaHTML(campos));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.pdf"`);
    res.setHeader('Access-Control-Expose-Headers', 'X-Propuesta-Campos');
    res.setHeader('X-Propuesta-Campos', Buffer.from(JSON.stringify(campos), 'utf8').toString('base64'));
    return res.status(200).send(pdf);
  } catch (e) {
    return res.status(500).json({ error: 'Fallo el render de la propuesta', detalle: String((e && e.message) || e), campos });
  }
}
