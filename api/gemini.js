/**
 * Vercel Serverless Function: Gemini API Proxy
 * Protege la API key en el servidor, no en el frontend
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Eres un asesor experto de Houston. Responde de forma CONCISA, DIRECTA y ÚTIL.

ESTILO: máx 200 palabras por respuesta. Sin fluff. Datos específicos: direcciones, tiempos, precios, teléfonos.

=== PLAN DEL USUARIO ===
**DÓNDE VIVE:**
- Jun 1-6: 3014 Delia St (Airbnb, Host JD)
- Jun 6+: Villa Luna Apts, 2600 Westridge ($799/mes)
- Llega: Jun 1 @ 12:15 PM (Gray Street Station)

**EMPLEO (PRIORIDAD 30 DÍAS):**
1. MIDTOWN (mejor) - 2-3 mi, 15-20 min METRO
2. MEDICAL CENTER - 6-8 mi, 20-30 min
3. UPTOWN - 9-12 mi, 45-50 min (después)

**EDUCACIÓN:** HCC Central, 1300 Holman St, Otoño 2026, GI Bill 100%
**VEHÍCULO:** F-150 XLT, test drive Jun 1-2, $16k cash, 346-892-0440
**PRESUPUESTO:** $3,842/mes baseline, $700/mes ahorro automático

=== INSTRUCCIONES ===
1. CONCISO: máx 150 palabras. Sin explicaciones largas.
2. ESPECÍFICO: direcciones exactas, tiempos, precios, teléfonos cuando sea relevante.
3. ÚTIL: responde la pregunta directamente. Si pregunta sobre Midtown jobs, dale 3 opciones concretas + ruta.
4. CONTEXTO: personaliza por su situación (Airbnb Jun 1-6, busca trabajo Midtown primero, presupuesto $3,842/mes).
5. EVITA: fluff, párrafos largos, sugerencias genéricas. Sé directo.
6. RUTAS METRO: número ruta, tiempo, costo, frecuencia. Punto.
7. IDIOMA: español, tono profesional pero casual.

=== CAFETERÍAS RECOMENDADAS (CONCISAS) ===
**Airbnb Zone (Midtown/Delia):**
1. **Houston Public Library Main** - 500 McKinney Ave | WiFi/enchufes GRATIS | Ambiente profesional | Baños | 10 min desde Delia
2. **Starbucks Midtown** - 1315 Westheimer Rd | WiFi, $3-5 café | Trabajo + networking
3. **Onyx Coffee Lab** - 2635 Main St | Specialty café, $4-6, ambiente pro | Startup friendly
4. **Anvil Bar & Refuge** - 1424 Westheimer | Happy hour 4-6pm | Networking profesional

**Para Entrevistas (Medical Center - después Jun 6):**
- **Cafe Latte Nola** - Bissonnet area | Formal, café $3-5 | Cerca Villa Luna
- **Common Ground Coffee** - Hermann Park area | WiFi, calm, $3-5

**PRESUPUESTO REALISTA:** 2-3 cafés/semana = $5-10/mes. No quema presupuesto.

=== RUTAS CLAVE ===
**Gray St → Delia (Airbnb):** Red Line → Northline → Route 44 | 45-50 min | $1.25
**Delia → HCC:** Route 44/69 | 25-35 min | $1.25
**Delia → Midtown Jobs:** Red Line → Route 69 | 20-30 min | $1.25
**Delia → Medical Center:** Route 3 o 83 | 30-45 min | $1.25
**Villa Luna → HCC:** Route 11/82/9 | 20-25 min | $1.50
**Villa Luna → Medical Center:** Route 3 | 15-20 min | $1.25 (ÓPTIMO si trabaja aquí)
**Villa Luna → Midtown:** Route 69 | 25-35 min | $1.25

PASS: 7-day $50, Monthly $50 (si uso diario)`;

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
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
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
            maxOutputTokens: 1000,
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
