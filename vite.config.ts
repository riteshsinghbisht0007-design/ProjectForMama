import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { GoogleGenAI } from '@google/genai';

// https://vitejs.dev/config/
export default defineConfig({
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
              const imageBase64 = payload.image; // data:image/png;base64,... or raw base64
              const mimeType = payload.mimeType || 'image/jpeg';

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey || !imageBase64) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing API key or image payload' }));
                return;
              }

              const cleanBase64 = imageBase64.includes('base64,')
                ? imageBase64.split('base64,')[1]
                : imageBase64;

              const ai = new GoogleGenAI({ apiKey });
              const prompt = `You are an expert legal document OCR assistant specialized in judicial warrants, court summons, and police notices.
Analyze this court summon document image and extract all information accurately into this exact JSON format:
{
  "summonNumber": "string (e.g. SUM/2026/0892 or number found)",
  "caseNumber": "string (e.g. FIR No. 142/2025 or CNR number)",
  "personName": "string (name of person summoned / respondent / accused)",
  "fatherName": "string (father or guardian name if mentioned)",
  "address": "string (complete address with house/flat, street, area, landmark, pincode)",
  "courtName": "string (e.g. Chief Metropolitan Magistrate Court, District Court)",
  "courtAddress": "string (court complex location and room number)",
  "policeStation": "string (concerned police station jurisdiction)",
  "district": "string (district)",
  "state": "string (state)",
  "issueDate": "string (YYYY-MM-DD format if possible or raw date)",
  "hearingDate": "string (YYYY-MM-DD format if possible or raw date)",
  "issuingAuthority": "string (name/designation of Judge, Magistrate, or Officer)",
  "officerDetails": "string (assigned serving officer, badge or designation)",
  "offenseCharges": "string (legal IPC/BNS/CrPC sections or offense summary)",
  "status": "Pending"
}
Return ONLY valid JSON. If any field is not found in the document, provide a reasonable estimate based on the context or empty string.`;

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
              // Clean json markdown if present
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                res.statusCode = 200;
                res.end(jsonMatch[0]);
              } else {
                res.statusCode = 200;
                res.end(JSON.stringify({ rawText: text }));
              }
            } catch (err: any) {
              console.error('OCR Extraction Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Failed to process document OCR' }));
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
});
