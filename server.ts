import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to resolve Gemini client with custom or env key
function getGeminiClient(customKey?: string): GoogleGenAI {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Kunci Gemini API belum diatur. Silakan masukkan API Key di menu 'API Key Gemini' pada Admin Dashboard.");
  }
  return new GoogleGenAI({ apiKey: key.trim() });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Gemini status check
app.get("/api/gemini-status", (_req, res) => {
  const hasEnvKey = !!process.env.GEMINI_API_KEY;
  res.json({
    hasEnvKey,
    defaultModel: "gemini-3.8-flash",
  });
});

// Gemini API Key Validation / Ping endpoint
app.post("/api/validate-gemini-key", async (req, res) => {
  try {
    const key = (req.body?.apiKey as string) || (req.headers["x-gemini-api-key"] as string) || process.env.GEMINI_API_KEY;
    if (!key || !key.trim()) {
      return res.status(400).json({ status: "error", message: "Kunci API tidak boleh kosong." });
    }

    const ai = new GoogleGenAI({ apiKey: key.trim() });
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Kirim kata: PONG",
    });

    const elapsed = Date.now() - startTime;
    const text = response.text || "";

    res.json({
      status: "success",
      message: `Kunci Gemini API valid dan terverifikasi! (Respon ${elapsed}ms)`,
      model: "gemini-3.8-flash",
      reply: text.trim(),
    });
  } catch (error: any) {
    console.error("Gemini API key validation error:", error);
    res.status(400).json({
      status: "error",
      message: error?.message || "Kunci API tidak valid atau kuota habis.",
    });
  }
});

// Gemini question generation endpoint
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { topic, promptKustom, tingkat, kelas, idMapel, namaMapel, jumlah, bentukSoal, apiKey } = req.body;
    const resolvedKey = apiKey || (req.headers["x-gemini-api-key"] as string) || process.env.GEMINI_API_KEY;
    const ai = getGeminiClient(resolvedKey);

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
    "opsi_json": ["opsi A", "opsi B", "opsi C", "opsi D"],
    "kunci_jawaban_json": "B",
    "bobot": 1,
    "pembahasan": "Penjelasan langkah penyelesaian dan kunci jawaban..."
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '[]';
    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        parsedQuestions = JSON.parse(match[0]);
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error('Format output AI tidak berupa array soal yang valid');
    }

    const timestampBase = Date.now().toString().slice(-4);
    const cleaned = parsedQuestions.map((q, idx) => ({
      id_soal: 'AI' + timestampBase + (idx + 1),
      id_mapel: idMapel || q.id_mapel || 'MAPEL-01',
      jenis_soal: q.jenis_soal || 'PG',
      pertanyaan: q.pertanyaan || 'Pertanyaan',
      opsi_json: q.opsi_json || null,
      kunci_jawaban_json: q.kunci_jawaban_json || 'A',
      bobot: Number(q.bobot) || 1,
      pembahasan: q.pembahasan || '',
    }));

    res.json({ status: 'success', data: cleaned });
  } catch (error: any) {
    console.error('Gemini generation error:', error);
    res.status(500).json({ status: 'error', message: error?.message || 'Gagal menghasilkan soal' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CBT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
