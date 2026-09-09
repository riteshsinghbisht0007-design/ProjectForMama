import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { GoogleGenAI } from '@google/genai';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'ocr-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/ocr', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json');
              try {
                const payload = JSON.parse(body || '{}');
                const imageBase64 = payload.image; // data:image/... or raw base64
                let mimeType = payload.mimeType || 'image/jpeg';

                // Normalize mimeType
                if (mimeType.includes('pdf')) {
                  mimeType = 'application/pdf';
                } else if (mimeType.includes('png')) {
                  mimeType = 'image/png';
                } else if (mimeType.includes('webp')) {
                  mimeType = 'image/webp';
                } else {
                  mimeType = 'image/jpeg';
                }

                const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                if (!apiKey) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      error:
                        'Gemini API key is not configured in .env (GEMINI_API_KEY). Please configure it for live AI OCR or fill details manually.',
                    })
                  );
                  return;
                }

                if (!imageBase64) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing document image or PDF payload' }));
                  return;
                }

                const cleanBase64 = imageBase64.includes('base64,')
                  ? imageBase64.split('base64,')[1]
                  : imageBase64;

                const ai = new GoogleGenAI({ apiKey });
                const prompt = `You are a certified legal document OCR assistant specialized in judicial warrants, court summons, notices, and charge sheets.
Analyze this court summon document image or PDF and extract all factual legal particulars into this exact JSON format:
{
  "summonNumber": "string (summon, warrant, notice, or CNR number found in the document, or empty string)",
  "caseNumber": "string (FIR number, case number, or CC number found in the document, or empty string)",
  "personName": "string (name of person summoned / respondent / accused as printed, or empty string)",
  "fatherName": "string (father or spouse name if mentioned, or empty string)",
  "address": "string (complete address with house/flat, street, area, landmark, pincode as written, or empty string)",
  "courtName": "string (name of the court / bench / judge, or empty string)",
  "courtAddress": "string (court complex location and room number, or empty string)",
  "policeStation": "string (police station jurisdiction if mentioned, or empty string)",
  "district": "string (district name if mentioned, or empty string)",
  "state": "string (state name if mentioned, or empty string)",
  "issueDate": "string (issue date in YYYY-MM-DD format if present, or empty string)",
  "hearingDate": "string (court appearance / hearing date in YYYY-MM-DD format, or empty string)",
  "issuingAuthority": "string (designation of Judge, Magistrate, or Officer, or empty string)",
  "officerDetails": "string (assigned serving officer if mentioned, or empty string)",
  "offenseCharges": "string (legal IPC/BNS/CrPC/NI Act sections or charges summary, or empty string)",
  "urgency": "Standard, High, or Urgent based on timeline and nature of offense"
}
IMPORTANT: Return ONLY valid JSON. If any field cannot be verified or is illegible in the document, set it to an empty string "". Never invent fictional names or addresses.`;

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { text: prompt },
                        {
                          inlineData: {
                            data: cleanBase64,
                            mimeType: mimeType,
                          },
                        },
                      ],
                    },
                  ],
                });

                const text = response.text || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  res.statusCode = 200;
                  res.end(jsonMatch[0]);
                } else {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ rawText: text }));
                }
              } catch (err: any) {
                console.error('OCR Extraction Server Error:', err);
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    error: err.message || 'Failed to process document with Gemini AI OCR',
                  })
                );
              }
            });
          });
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});
