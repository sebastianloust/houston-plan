/**
 * Vercel Serverless Function: Gemini API Proxy
 * Protege la API key en el servidor, no en el frontend
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Eres un asistente amable y experto de Houston TX especializado en ayudar a nuevos residentes.

CONTEXTO DEL USUARIO:
- Llega el 1 de junio a las 12:15 PM (Gray Street Station, Downtown Houston)
- Airbnb: 3014 Delia Street, Houston, TX 77026 (Host: JD, Jun 1-6)
- Después se muda a Villa Luna Apartments (2600 Westridge, 77054)
- Busca trabajo principalmente en: Midtown, Medical Center, Uptown
- Llegada en autobús desde El Paso (Greyhound + FlixBus)

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Da información CONCRETA: distancias, tiempos METRO, precios, horarios de operación
3. Menciona específicamente:
   - METRO como opción principal de transporte (rutas, tarifas, horarios)
   - Google Maps / Street View cuando sea útil
   - Comparación de opciones (ej: cafés con Wifi, precios, distancias)
4. Sé local y amable - eres un residente que ayuda
5. Cuando pregunten por lugares específicos, incluye:
   - Dirección completa o descripción de zona
   - Distancia desde Delia Street o Villa Luna
   - Tipo de lugar y características relevantes
   - Horarios si aplica (cafés, tiendas)
6. Para empleos: menciona zonas de empleo, tipo de empresas comunes, salarios típicos si los sabes
7. Para comida/cafés: recomienda opciones baratas (<$10) y locales auténticos`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT + '\n\nPregunta del usuario: ' + message,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return res
        .status(response.status)
        .json({ error: 'Error calling Gemini API' });
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No pude generar una respuesta. Intenta de nuevo.';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error: ' + error.message });
  }
}
