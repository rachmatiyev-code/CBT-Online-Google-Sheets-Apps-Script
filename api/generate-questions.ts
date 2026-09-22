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
    const { topic, promptKustom, tingkat, kelas, idMapel, namaMapel, jumlah, bentukSoal, apiKey } = body;
    const resolvedKey = apiKey || (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;

    if (!resolvedKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Kunci Gemini API belum diatur. Silakan atur di menu API Key Gemini.',
      });
    }

    const ai = new GoogleGenAI({ apiKey: resolvedKey.trim() });

    const systemPrompt = `Anda adalah asisten kurikulum dan perancang butir soal Computer Based Test (CBT) profesional di Indonesia.
Buat ${jumlah || 3} butir soal berkualitas tinggi dengan parameter berikut:
- Jenjang Pendidikan: ${tingkat || 'SD / SMP / SMA'}
- Tingkat Kelas: ${kelas || 'Umum'}
- Mata Pelajaran: ${namaMapel || idMapel || 'Umum'} (ID Mapel: ${idMapel || 'MAPEL-01'})
- Topik / Materi Pembelajaran: ${topic || 'Materi Umum'}
- Bentuk Soal: ${bentukSoal || 'Campuran'}
${promptKustom ? `- Instruksi Tambahan / Kisi-kisi / Stimulus: ${promptKustom}` : ''}

Peraturan format butir soal:
1. Jika bentukSoal adalah 'PG': opsi_json berupa array 4 teks pilihan (contoh: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]) dan kunci_jawaban_json adalah huruf tunggal "A", "B", "C", atau "D".
2. Jika bentukSoal adalah 'PGK': opsi_json berupa array 4 opsi, dan kunci_jawaban_json adalah array pilihan teks yang benar (contoh: ["opsi A", "opsi C"]).
3. Jika bentukSoal adalah 'MJ': opsi_json adalah objek { "kiri": ["item1", "item2", "item3"], "kanan": ["pasangan1", "pasangan2", "pasangan3"] }, kunci_jawaban_json adalah mapping yang benar { "item1": "pasangan1", "item2": "pasangan2", "item3": "pasangan3" }.
4. Jika bentukSoal adalah 'IS': opsi_json null, kunci_jawaban_json adalah array string alternatif jawaban yang diterima (contoh: ["9", "sembilan"]).
5. Jika bentukSoal adalah 'UR': opsi_json null, kunci_jawaban_json berupa string kata kunci jawaban, dan pembahasan memuat rubrik penskoran.
6. Jika bentukSoal adalah 'Campuran': buat variasi jenis soal (PG, PGK, MJ, IS, UR).

Output WAJIB berupa JSON array murni tanpa format markdown codeblock:
[
  {
    "id_soal": "AI01",
    "id_mapel": "${idMapel || 'MAPEL-01'}",
    "jenis_soal": "PG",
    "pertanyaan": "Teks pertanyaan yang jelas, berbobot, dan kontekstual...",
    "opsi_json": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "kunci_jawaban_json": "A",
    "bobot": 1,
    "pembahasan": "Penjelasan rinci konsep jawaban..."
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const rawText = response.text || '[]';
    const cleanJson = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const questions = JSON.parse(cleanJson);

    return res.status(200).json({
      status: 'success',
      data: questions,
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Vercel generate-questions error:', error);
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Gagal memproses pembuatan soal dengan AI.',
    });
  }
}
