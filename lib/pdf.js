// Motor compartido HTML -> PDF (Chromium headless en serverless). ESM.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// `opts` es opcional y no cambia nada para quien no lo pasa (propuesta.js, contrato.js,
// onboarding-deck.js siguen llamando htmlToPdf(html) tal cual). Lo usan dossier.js y
// acta.js, que tienen contenido de largo variable y necesitan encabezado/pie/numeración
// que se repitan solos en cada página — eso Chromium lo resuelve mejor con
// displayHeaderFooter que con trucos de CSS, así que se lo dejamos hacer a él.
//   opts.margin              - override del margen (mm), default 0 en los 4 lados
//   opts.displayHeaderFooter - true para activar header/footer repetidos
//   opts.headerTemplate/footerTemplate - HTML de esas bandas (ver docs de Puppeteer:
//     ancho fijo a la página entera, admiten <span class="pageNumber|totalPages">)
export async function htmlToPdf(html, opts = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfOpts = {
      printBackground: true,
      preferCSSPageSize: true,
      margin: opts.margin || { top: '0', right: '0', bottom: '0', left: '0' },
    };
    if (opts.displayHeaderFooter) {
      pdfOpts.displayHeaderFooter = true;
      pdfOpts.headerTemplate = opts.headerTemplate || '<span></span>';
      pdfOpts.footerTemplate = opts.footerTemplate || '<span></span>';
    }
    const out = await page.pdf(pdfOpts);
    // page.pdf() devuelve Uint8Array; Vercel serializa eso como JSON. Forzar Buffer binario.
    return Buffer.from(out);
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
}

// Auth por clave compartida + CORS. Devuelve true si sigue, o corta con error.
export function checkAuth(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usá POST' }); return false; }
  const key = req.headers['x-api-key'];
  if (!process.env.RENDER_API_KEY || key !== process.env.RENDER_API_KEY) {
    res.status(401).json({ error: 'No autorizado' }); return false;
  }
  return true;
}

export function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}
