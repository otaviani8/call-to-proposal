// Lee la transcripción de la llamada 1 y saca los campos de la propuesta con Claude. ESM.
// Reemplaza al prompt que vivía en Plantilla.gs (Apps Script): ahora vive acá, versionado,
// y el Apps Script solo manda la transcripción.
import { TOPES } from './propuesta-html.js';

const MODELO = process.env.PROPUESTA_MODEL || 'claude-sonnet-5-5';

const INSTRUCCIONES = `
Sos el asistente de Martín Acosta, dueño de Acme. Acabás de leer la transcripción de su primera llamada (20 minutos) con el dueño de una empresa que le vende a comercios: una distribuidora, un importador o una fábrica. Con eso armás los campos del plan de trabajo que se le manda ese mismo día, antes de la segunda llamada.

QUÉ ES ACME Y QUÉ HACE
Suma comercios nuevos a la cartera del cliente, que compran y vuelven a comprar. Cuatro pasos:
1. El plan: qué comercios buscar, en qué zonas y en qué orden, con su lista de precios y su pedido mínimo.
2. Atraer: anuncios en Facebook, Instagram y Google para los dueños de esos comercios. Antes de llegar a su equipo, el comercio completa unas preguntas (qué negocio tiene, en qué zona está y si llega al pedido mínimo).
3. Cerrar: su equipo recibe mensajes armados para cada pregunta del comercio, y se mide cuánto tarda en contestar.
4. Fidelizar y medir: aviso por WhatsApp cuando a cada comercio le toca reponer, búsqueda de los clientes que dejaron de comprar, y cada semana cuántos comercios entraron y cuánto costó cada uno.

REGLAS DURAS
- Nada inventado. Cada dato sale de lo que se dijo en la llamada. Si un dato no apareció, el campo va vacío (""). Mejor vacío que supuesto.
- Los números, tal cual los dijo (pedido mínimo, cantidad de comercios, zonas). Nunca los redondees ni los estimes.
- El sujeto es el trabajo, nunca la debilidad del cliente. Se cuenta lo que pasa como un hecho de su operación, sin achicarlo: "Los comercios nuevos dependen de los dos preventistas", nunca "no vende nada" ni "está estancado".
- Castellano de Argentina, de vos, llano y concreto, como habla un dueño con otro. Oraciones cortas. Cada palabra se gana su lugar.
- Sin signos de apertura de pregunta o exclamación, sin emojis, sin raya (—), sin punto y coma.
- Prohibido: garantías, promesas de ventas, de consultas o de plazos ("vas a vender", "te garantizamos"), precios u honorarios, y jerga: leads, embudo, funnel, B2B, ROI, engagement, performance, potenciar, impulsar, escalar, soluciones, a medida, acompañamos.
- Nunca "reporte" ni "informe": lo que ve el cliente es su panel (cada comercio que entra, de qué zona es y en qué quedó) y los números de cada semana. Nunca "planilla".
- No nombres a terceros que no están en la charla de trabajo (el sobrino que hizo los anuncios, una agencia anterior): se cuenta el hecho, sin quién.
- Al cliente de tu cliente se lo nombra por su rubro: almacenes, ferreterías, casas de electricidad, corralones, kioscos, estéticas.
- Respetá los largos máximos de cada campo. Si no entra, decí menos, no cortes la frase.

LOS CAMPOS
- cliente: el nombre de la empresa como lo dijo. Si no lo dijo, el nombre y apellido del dueño.
- cliente_descriptor: qué vende, a quién y dónde, en una línea. Ej.: "Artículos de limpieza para almacenes y autoservicios · Zona sur del Gran Buenos Aires".
- contacto: nombre de la persona con la que habló Martín.
- vende, a_quien, zonas_hoy, zonas_nuevas, pedido_minimo, como_llegan (cómo le llegan hoy los comercios nuevos), quien_contesta (quién les contesta a los comercios y en qué horario): una frase corta cada uno, solo si se dijo.
- diag_lead: una o dos oraciones que presentan los tres puntos. Ej.: "Esto sale de lo que nos contaste en la llamada. Son los tres puntos que ordenan el plan."
- diag: exactamente tres puntos de lo que se vio en la llamada, los que más ordenan el plan. Cada uno con t (el hecho, como titular) y d (una o dos oraciones con el detalle que dio él, con sus números).
- oportunidad: dónde está la oportunidad, en dos o tres oraciones, atada a sus zonas, sus comercios y su pedido mínimo.
- pasos: cuatro frases, una por paso (plan, atraer, cerrar, fidelizar y medir), cada una con lo que ese paso significa en SU caso. La primera arranca con "En tu caso:". Si para un paso no hay dato, escribí la frase más concreta que permita lo que se dijo, sin inventar.
- llamada2: día y hora de la segunda llamada si quedó acordada (ej. "jueves 15 a las 11"). Si no, "".
- pauta_ars: lo que dijo que puede poner por mes en publicidad, en pesos, como número (ej. 600000). Si no lo dijo o lo dijo en dólares, 0.
- alertas: notas para Martín que NO van en el documento: datos que faltaron, objeciones que aparecieron, si pidió garantía, si nombró a un socio que decide, si algo no cierra con el perfil (vende al público, no tiene quién conteste, no llega a 500 mil pesos de publicidad). Frases cortas.
`.trim();

const S = (n, desc) => ({ type: 'string', maxLength: n, description: `${desc} Máximo ${n} caracteres.` });

const TOOL = {
  name: 'armar_propuesta',
  description: 'Devuelve los campos del plan de trabajo sacados de la transcripción.',
  input_schema: {
    type: 'object',
    properties: {
      cliente: S(TOPES.cliente, 'Nombre de la empresa.'),
      cliente_descriptor: S(TOPES.cliente_descriptor, 'Qué vende, a quién y dónde.'),
      contacto: S(60, 'Nombre de la persona.'),
      vende: S(TOPES.ficha, 'Qué vende.'),
      a_quien: S(TOPES.ficha, 'A qué comercios le vende.'),
      zonas_hoy: S(TOPES.ficha, 'Dónde reparte hoy.'),
      zonas_nuevas: S(TOPES.ficha, 'Dónde quiere llegar.'),
      pedido_minimo: S(TOPES.ficha, 'Pedido mínimo.'),
      como_llegan: S(TOPES.ficha, 'Cómo le llegan hoy los comercios nuevos.'),
      quien_contesta: S(TOPES.ficha, 'Quién les contesta y en qué horario.'),
      diag_lead: S(TOPES.diag_lead, 'Presentación de los tres puntos.'),
      diag: {
        type: 'array', minItems: 3, maxItems: 3,
        items: { type: 'object', properties: { t: S(TOPES.diag_t, 'El hecho, como titular.'), d: S(TOPES.diag_d, 'El detalle, con sus números.') }, required: ['t', 'd'] },
      },
      oportunidad: S(TOPES.oportunidad, 'Dónde está la oportunidad.'),
      pasos: { type: 'array', minItems: 4, maxItems: 4, items: S(TOPES.paso, 'Lo que el paso significa en su caso.') },
      llamada2: S(TOPES.llamada2, 'Día y hora de la segunda llamada, o vacío.'),
      pauta_ars: { type: 'number', description: 'Publicidad mensual en pesos que dijo, o 0.' },
      alertas: { type: 'array', items: { type: 'string', maxLength: 160 }, description: 'Notas internas para Martín.' },
    },
    required: ['cliente', 'cliente_descriptor', 'diag_lead', 'diag', 'oportunidad', 'pasos', 'llamada2', 'pauta_ars', 'alertas'],
  },
};

export async function extraerCampos(transcripcion, { apiKey = process.env.ANTHROPIC_API_KEY, modelo = MODELO } = {}) {
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY');
  const texto = String(transcripcion || '').slice(0, 120000);
  if (texto.trim().length < 200) throw new Error('La transcripción está vacía o es demasiado corta');
  // Los modelos 5.5 no aceptan forzar la herramienta (tool_choice "tool"): se pide en el mensaje
  // y, si contesta con texto, se reintenta una vez.
  for (let intento = 1; intento <= 2; intento++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 4000,
        system: INSTRUCCIONES,
        tools: [TOOL],
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: `Transcripción de la llamada:\n\n${texto}\n\nRespondé SOLO llamando a la herramienta ${TOOL.name}.` }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Claude ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    const uso = (j.content || []).find((b) => b.type === 'tool_use' && b.name === TOOL.name);
    if (uso) return { campos: uso.input, modelo, uso: j.usage };
  }
  throw new Error('Claude no devolvió los campos');
}
