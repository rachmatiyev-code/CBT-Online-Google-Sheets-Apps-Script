import { GoogleGenAI } from '@google/genai';

interface ApiRequest {
  method?: string;
  body?: any;
  headers: Record<string, any>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawKey = body?.apiKey !== undefined ? body.apiKey : ((req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY);
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (!key) {
      return res.status(400).json({ status: 'error', message: 'Kunci API tidak boleh kosong.' });
    }

    const ai = new GoogleGenAI({ apiKey: key.trim() });
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Kirim kata: PONG',
    });

    const elapsed = Date.now() - startTime;
    const text = response.text || 'PONG';

    return res.status(200).json({
      status: 'success',
      message: `Kunci Gemini API valid dan terverifikasi! (Respon ${elapsed}ms)`,
      model: 'gemini-3.8-flash',
      reply: text.trim(),
    });
  } catch (error: any) {
    console.error('Vercel function validate-gemini-key error:', error);
    return res.status(400).json({
      status: 'error',
      message: error?.message || 'Kunci API tidak valid atau gagal terhubung.',
    });
  }
}
