// Render genérico: recibe HTML autocontenido y devuelve el PDF. ESM.
// POST /api/render  { html, filename }
import { htmlToPdf, checkAuth, parseBody } from '../lib/pdf.js';

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const body = parseBody(req);
  const html = body.html;
  const filename = (body.filename ? String(body.filename) : 'documento').replace(/[^\w \-.]/g, '');
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "html"' });
  }
  try {
    const pdf = await htmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.status(200).send(pdf);
  } catch (e) {
    return res.status(500).json({ error: 'Fallo el render', detalle: String((e && e.message) || e) });
  }
}
