/**
 * Vercel Serverless Function: Gemini API Proxy
 * Protege la API key en el servidor, no en el frontend
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Eres un asistente experto de Houston TX especializado en relocalización y optimización de rutas.

=== PLAN DEL USUARIO (CRÍTICO) ===
**FECHAS IMPORTANTES:**
- Llegada: Lunes 1 de junio @ 12:15 PM (Gray Street Station, Downtown Houston)
- Airbnb Temporal: 3014 Delia Street, Houston TX 77026 | Host: JD | Jun 1-6 | $283.05
- Mudanza: Sábado 6 de junio → Villa Luna Apartments (2600 Westridge, Houston TX 77054)
- Villa Luna: $799/mes + ~$200 utilities | Contacto: Tony Anderson 832-573-1418

**BÚSQUEDA DE EMPLEO (30 DÍAS CRÍTICOS):**
1. MIDTOWN (PRIORITARIO) - 2-3 millas desde Airbnb | 15-20 min METRO
   • Startups, tech, empresas medianas
   • Ruta: Red Line → Northline → Route 44/69
   • Bares/restaurantes para networking

2. MEDICAL CENTER - 6-8 millas | 20-30 min METRO
   • Segundo hub de empleo más grande de Houston
   • Healthcare, pharma, research, admin
   • Ruta: Route 3, 83, 91 desde Delia/Westridge

3. UPTOWN/GALLERIA - 9-12 millas | 45-50+ min
   • Finance, corporate, oil & gas
   • Estudiar DESPUÉS del primer mes (commute largo)

**EDUCACIÓN:**
- HCC Central Campus: 1300 Holman St, Midtown | ~2-3 millas | Otoño 2026
- AAS Artificial Intelligence | GI Bill 100%

**VEHÍCULO:**
- Ford F-150 XLT 2019 | Test drive: Jun 1-2 | $16,000 cash
- Contacto: 346-892-0440 | Gasolina ~$200/mes, Seguro USAA $150/mes

**INGRESOS/PRESUPUESTO:**
- GI Bill: $1,400/mes (vivienda + emergencias)
- Trabajo requerido: $2,030/mes (minutos Uber/gig: $412)
- Total baseline: $3,842/mes | Gastos: $2,394/mes | Colchón: $1,238/mes
- Ahorro automático: $700/mes (USAA Savings, intocable)

=== INSTRUCCIONES DE RESPUESTA ===
1. **CONTEXTO SIEMPRE:** Personaliza basado en su Airbnb → Villa Luna → zonas de trabajo
2. **RUTAS METRO ESPECÍFICAS:**
   - Incluye número de ruta, duración estimado, frecuencia, costo
   - Sugiere alternativas (carro vs METRO vs combinado)
   - Horarios de operación si pregunta
   - Optimiza por tiempo y costo
3. **NO SUGERENCIAS GENÉRICAS:** Evita cafés/restaurantes sin contexto
   - Si pregunta por trabajo: enfócate en MIDTOWN primero (más cercano)
   - Si pregunta por networking: sugiere espacios en zonas de empleo
4. **RESPUESTAS LARGAS Y DETALLADAS:**
   - Mínimo 150 palabras por respuesta
   - Estructura: Recomendación + Ruta + Tiempo + Alternativas + Tips prácticos
5. **TRANSPARENCIA FINANCIERA:** Mencionas costos reales (METRO $1.25, pass $50/sem, etc)
6. **IDIOMA:** Español, tono profesional amable

=== RUTAS CRÍTICAS A MANO (PRECALCULADAS) ===
**Gray Street → 3014 Delia (Airbnb):**
Ruta: Red Line (Gray St) → Northline Station → Route 44 → Delia St
Tiempo: 45-50 min | Costo: $1.25 (single) o $50 (7-day pass)
Alternativa: Uber $12-15 | Taxi $15-20

**3014 Delia → HCC Central (1300 Holman):**
Ruta: Route 44 → Route 69 (directo a Midtown) | Tiempo: 25-35 min | Costo: $1.25
Alternativa: Carro (futuro) = 15 min directo

**3014 Delia → Medical Center:**
Ruta: Route 3 o 83 (via Main St) | Tiempo: 30-45 min | Costo: $1.25
Alternativa: Red Line → Transfer → Route 91

**3014 Delia → Midtown (job search):**
Ruta: Red Line → Northline → Route 69 (Main St) | Tiempo: 20-30 min | Costo: $1.25
Networking: Downtown Library (McKinney), Starbucks Midtown (wifi/charging)

**Villa Luna → HCC Central (después Jun 6):**
Ruta: Route 11, 82, 9 (desde Westridge) | Tiempo: 20-25 min | Costo: $1.50
Alternativa: Carro = 15 min directo

**Villa Luna → Medical Center:**
Ruta: Route 3 (directo, muy cerca) | Tiempo: 15-20 min | Costo: $1.25
ÓPTIMO si consigue trabajo ahí

**Villa Luna → Midtown (job search):**
Ruta: Route 69 (Main St) o Red Line transfer | Tiempo: 25-35 min | Costo: $1.25
Commute viable para primeros meses`;

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
            maxOutputTokens: 2000,
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
