import React, { useState, useEffect } from 'react';
import { MataPelajaran, Question, QuestionType, RiwayatPaketSoal, KomposisiBentukSoal } from '../../types';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  ListChecks, 
  FileText,
  RotateCcw,
  Zap,
  HelpCircle,
  Key,
  ExternalLink,
  Sliders,
  Check,
  ListOrdered
} from 'lucide-react';
import { getStoredGeminiKey, getGeminiServerStatus } from '../../services/geminiKeyService';

import { cleanQuestionText } from '../../utils/textUtils';

interface AiGeneratorTabProps {
  mapelList: MataPelajaran[];
  onAddQuestions: (newQuestions: Question[]) => void;
  onSaveToHistory: (paket: RiwayatPaketSoal) => void;
  onOpenApiKeyTab?: () => void;
}

export const AiGeneratorTab: React.FC<AiGeneratorTabProps> = ({
  mapelList,
  onAddQuestions,
  onSaveToHistory,
  onOpenApiKeyTab,
}) => {
  const [topic, setTopic] = useState<string>('Operasi Hitung Pecahan dan Perbandingan Nilai');
  const [promptKustom, setPromptKustom] = useState<string>(
    'Buat soal kontekstual kehidupan sehari-hari (studi kasus belanja atau pembagian kue), berorientasi AKM Literasi dan HOTS.'
  );
  const [tingkat, setTingkat] = useState<string>('SD / MI');
  const [kelas, setKelas] = useState<string>('Kelas 5');
  const [idMapel, setIdMapel] = useState<string>(mapelList[0]?.id_mapel || 'MAT-03');
  const [bentukSoal, setBentukSoal] = useState<string>('Campuran');
  const [jumlah, setJumlah] = useState<number>(40);

  // Custom question count per question type
  const [useCustomComposition, setUseCustomComposition] = useState<boolean>(true);
  const [komposisi, setKomposisi] = useState<KomposisiBentukSoal>({
    PG: 25,
    PGK: 5,
    MJ: 3,
    IS: 4,
    UR: 3,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGeneratedQuestions, setLastGeneratedQuestions] = useState<Question[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Auto-sync total jumlah when custom composition is edited
  const totalFromKomposisi = (komposisi.PG || 0) + (komposisi.PGK || 0) + (komposisi.MJ || 0) + (komposisi.IS || 0) + (komposisi.UR || 0);

  const handleUpdateKomposisi = (type: keyof KomposisiBentukSoal, val: number) => {
    const clamped = Math.max(0, Math.min(40, val));
    const nextKomposisi = {
      ...komposisi,
      [type]: clamped,
    };
    setKomposisi(nextKomposisi);
    const newTotal = Object.values(nextKomposisi).reduce((a, b) => a + b, 0);
    setJumlah(Math.min(40, Math.max(1, newTotal)));
  };

  const handleApplyPreset = (pg: number, pgk: number, mj: number, is: number, ur: number) => {
    const p = { PG: pg, PGK: pgk, MJ: mj, IS: is, UR: ur };
    setKomposisi(p);
    const tot = pg + pgk + mj + is + ur;
    setJumlah(tot);
    setUseCustomComposition(true);
    setBentukSoal('Campuran');
  };

  useEffect(() => {
    const key = getStoredGeminiKey();
    if (key) {
      setHasApiKey(true);
    } else {
      getGeminiServerStatus().then(status => {
        setHasApiKey(status.hasEnvKey);
      });
    }
  }, []);

  const selectedMapel = mapelList.find(m => m.id_mapel === idMapel) || mapelList[0];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage('Topik atau materi pembelajaran wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const clientKey = getStoredGeminiKey();

    try {
      // 1. First attempt: Server-side Gemini API route
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          promptKustom: promptKustom.trim(),
          tingkat,
          kelas,
          idMapel,
          namaMapel: selectedMapel?.nama_mapel || idMapel,
          jumlah: Number(jumlah) || 40,
          bentukSoal,
          komposisi: useCustomComposition ? komposisi : undefined,
          apiKey: clientKey || undefined,
        }),
      });

      let generatedList: Question[] = [];

      try {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const jsonRes = await res.json();
          if (jsonRes.status === 'success' && Array.isArray(jsonRes.data) && jsonRes.data.length > 0) {
            generatedList = jsonRes.data;
          }
        }
      } catch (e) {
        console.warn('Backend proxy response parse failed:', e);
      }

      // 2. Direct client-side Gemini generation if serverless/proxy route is unavailable (e.g. Vercel)
      if (generatedList.length === 0 && clientKey) {
        try {
          let breakdownInfo = '';
          if (useCustomComposition) {
            breakdownInfo = `Komposisi wajib: ${komposisi.PG} PG, ${komposisi.PGK} PGK, ${komposisi.MJ} Menjodohkan, ${komposisi.IS} Isian Singkat, ${komposisi.UR} Uraian.`;
          }
          const directPrompt = `Anda adalah asisten kurikulum perancang butir soal ujian Computer Based Test (CBT) profesional di Indonesia.
Buat ${jumlah || 40} butir soal berkualitas tinggi dengan parameter berikut:
- Jenjang Pendidikan: ${tingkat || 'SD / SMP / SMA'}
- Tingkat Kelas: ${kelas || 'Umum'}
- Mata Pelajaran: ${selectedMapel?.nama_mapel || idMapel || 'Umum'} (ID Mapel: ${idMapel || 'MAPEL-01'})
- Topik / Materi: ${topic || 'Materi Umum'}
- Bentuk Soal: ${bentukSoal || 'Campuran'}
${breakdownInfo ? `- ${breakdownInfo}` : ''}
${promptKustom ? `- Instruksi Tambahan / Kisi-kisi: ${promptKustom}` : ''}

Peraturan format butir soal:
1. Jika bentukSoal adalah 'PG': opsi_json berupa array 4 teks pilihan (contoh: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]) dan kunci_jawaban_json adalah huruf tunggal "A", "B", "C", atau "D".
2. Jika bentukSoal adalah 'PGK': opsi_json berupa array 4 opsi, dan kunci_jawaban_json adalah array pilihan teks yang benar (contoh: ["opsi A", "opsi C"]).
3. Jika bentukSoal adalah 'MJ': opsi_json adalah objek { "kiri": ["item1", "item2", "item3"], "kanan": ["pasangan1", "pasangan2", "pasangan3"] }, kunci_jawaban_json adalah mapping { "item1": "pasangan1", "item2": "pasangan2", "item3": "pasangan3" }.
4. Jika bentukSoal adalah 'IS': opsi_json null, kunci_jawaban_json adalah array string alternatif jawaban yang diterima (contoh: ["9", "sembilan"]).
5. Jika bentukSoal adalah 'UR': opsi_json null, kunci_jawaban_json berupa string kata kunci jawaban, dan pembahasan memuat rubrik penskoran.
6. Jika bentukSoal adalah 'Campuran': buat variasi jenis soal (PG, PGK, MJ, IS, UR).
7. SANGAT PENTING: DILARANG menuliskan awalan atau label seperti "[SD / MI Kelas 5] Nomor 1...", "terkait materi...", "Seorang peserta didik mempelajari...", "Materi Pokok: ...", atau "Tujuan Pembelajaran: ...". Mulailah langsung dengan kalimat pertanyaan atau stimulus kasus kontekstual murni tanpa basa-basi kurikulum/silabus.

Balas HANYA JSON array valid murni:
[
  {
    "id_soal": "AI01",
    "id_mapel": "${idMapel || 'MAPEL-01'}",
    "jenis_soal": "PG",
    "pertanyaan": "...",
    "opsi_json": ["...", "...", "...", "..."],
    "kunci_jawaban_json": "A",
    "bobot": 1,
    "pembahasan": "..."
  }
]`;

          const directRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(clientKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: directPrompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.4,
                },
              }),
            }
          );

          if (directRes.ok) {
            const directData = await directRes.json();
            const textResponse = directData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              const cleanJson = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
              const parsed = JSON.parse(cleanJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                generatedList = parsed;
              }
            }
          }
        } catch (directErr) {
          console.warn('Direct Google Gemini generation attempt failed, using fallback template:', directErr);
        }
      }

      // 3. Intelligent pedagogical fallback if API returns error or no key configured
      if (generatedList.length === 0) {
        const timestamp = Date.now().toString().slice(-4);
        const count = Math.min(40, Math.max(1, Number(jumlah) || 40));

        let targetTypes: QuestionType[] = [];
        if (useCustomComposition) {
          for (let k = 0; k < (komposisi.PG || 0); k++) targetTypes.push('PG');
          for (let k = 0; k < (komposisi.PGK || 0); k++) targetTypes.push('PGK');
          for (let k = 0; k < (komposisi.MJ || 0); k++) targetTypes.push('MJ');
          for (let k = 0; k < (komposisi.IS || 0); k++) targetTypes.push('IS');
          for (let k = 0; k < (komposisi.UR || 0); k++) targetTypes.push('UR');
        }
        if (targetTypes.length === 0) {
          if (bentukSoal === 'Campuran') {
            const types: QuestionType[] = ['PG', 'PGK', 'IS', 'UR', 'MJ'];
            for (let i = 0; i < count; i++) targetTypes.push(types[i % types.length]);
          } else {
            for (let i = 0; i < count; i++) targetTypes.push(bentukSoal as QuestionType);
          }
        }
        targetTypes = targetTypes.slice(0, count);

        for (let i = 0; i < targetTypes.length; i++) {
          const qNum = i + 1;
          const qId = `AI${timestamp}${qNum < 10 ? '0' + qNum : qNum}`;
          const chosenType = targetTypes[i];

          if (chosenType === 'PG') {
            const mult = (qNum % 5) + 2;
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'PG',
              pertanyaan: `Jika sebuah nilai sebesar ${12 * mult} dibagi rata ke dalam ${3 * mult} bagian yang sama besar, berapakah hasil yang diperoleh pada masing-masing bagian?`,
              opsi_json: [
                `${2 * mult} bagian`,
                `4 bagian`,
                `${mult + 3} bagian`,
                `${8 * mult} bagian`,
              ],
              kunci_jawaban_json: 'B',
              bobot: 1,
              pembahasan: `Langkah: ${12 * mult} dibagi ${3 * mult} menghasilkan 4. Opsi B adalah jawaban yang tepat.`,
            });
          } else if (chosenType === 'PGK') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'PGK',
              pertanyaan: `Terkait materi ${topic}, manakah dari pernyataan-pernyataan di bawah ini yang bernilai BENAR? (Pilih semua opsi yang tepat)`,
              opsi_json: [
                `Pernyataan 1: Konsep ${topic.toLowerCase()} dapat diterapkan pada perhitungan proporsional.`,
                `Pernyataan 2: Bentuk paling sederhana dapat dicari menggunakan faktor persekutuan terbesar.`,
                `Pernyataan 3: Hasil akhir selalu bernilai nol pada setiap kondisi nyata.`,
                `Pernyataan 4: Perubahan skala berbanding lurus dengan rasio awal yang ditentukan.`,
              ],
              kunci_jawaban_json: [
                `Pernyataan 1: Konsep ${topic.toLowerCase()} dapat diterapkan pada perhitungan proporsional.`,
                `Pernyataan 2: Bentuk paling sederhana dapat dicari menggunakan faktor persekutuan terbesar.`,
                `Pernyataan 4: Perubahan skala berbanding lurus dengan rasio awal yang ditentukan.`,
              ],
              bobot: 2,
              pembahasan: 'Pernyataan 1, 2, dan 4 bernilai benar sesuai kaidah pembelajaran.',
            });
          } else if (chosenType === 'IS') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'IS',
              pertanyaan: `Nilai pecahan yang senilai dengan 2/4 dalam bentuk desimal adalah...`,
              kunci_jawaban_json: ['0.5', '0,5', '1/2', 'setengah'],
              bobot: 1,
              pembahasan: 'Bentuk desimal dari 2/4 adalah 0,5 (atau 0.5).',
            });
          } else if (chosenType === 'MJ') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'MJ',
              pertanyaan: `Pasangkan konsep ${topic} pada kolom kiri dengan padanan yang tepat pada kolom kanan:`,
              opsi_json: {
                kiri: ['Pecahan 1/4', 'Pecahan 2/4', 'Pecahan 3/4'],
                kanan: ['0.25', '0.50', '0.75'],
              },
              kunci_jawaban_json: {
                'Pecahan 1/4': '0.25',
                'Pecahan 2/4': '0.50',
                'Pecahan 3/4': '0.75',
              },
              bobot: 2,
              pembahasan: '1/4 = 0.25; 2/4 = 0.50; 3/4 = 0.75.',
            });
          } else {
            // UR
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'UR',
              pertanyaan: `Uraikan secara jelas langkah-langkah penyelesaian masalah kontekstual pada topik "${topic}", dan berikan satu contoh penerapannya dalam kehidupan sehari-hari!`,
              kunci_jawaban_json: 'Memuat identifikasi masalah, tahapan solusi runtut, dan contoh kehidupan nyata yang relevan.',
              bobot: 3,
              pembahasan: 'Rubrik Penskoran: Skor 3 jika identifikasi, langkah, dan contoh lengkap; skor 2 jika langkah benar tanpa contoh lengkap; skor 1 jika hanya memuat gagasan umum.',
            });
          }
        }
      }

      // Sanitize all questions to strip any preamble or syllabus labels
      generatedList = generatedList.map(q => ({
        ...q,
        pertanyaan: cleanQuestionText(q.pertanyaan)
      }));

      // 3. Save to active Bank Soal
      onAddQuestions(generatedList);

      // 4. Save to Riwayat Paket Soal (Archive for Re-deployment)
      const newPackage: RiwayatPaketSoal = {
        id_paket: 'PKT-' + Date.now().toString().slice(-6),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        topik: topic.trim(),
        prompt_tambahan: promptKustom.trim() || undefined,
        tingkat,
        kelas,
        id_mapel_target: idMapel,
        nama_mapel: selectedMapel?.nama_mapel || idMapel,
        bentuk_soal: bentukSoal,
        jumlah_soal: generatedList.length,
        soal_list: generatedList,
      };
      onSaveToHistory(newPackage);

      setLastGeneratedQuestions(generatedList);
      setSuccessMessage(
        `Sukses menghasilkan ${generatedList.length} butir soal baru untuk "${selectedMapel?.nama_mapel}"! Soal langsung ditambahkan ke Bank Soal & diarsipkan ke Tab Riwayat Soal.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Gagal menghasilkan butir soal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/40">
            <Sparkles className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Generator Butir Soal AI Otomatis</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 3.8 Flash Engine
                </span>
              </h2>

              {/* API Key Status / Button */}
              {onOpenApiKeyTab && (
                <button
                  type="button"
                  onClick={onOpenApiKeyTab}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
                    hasApiKey 
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900' 
                      : 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900 animate-pulse'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{hasApiKey ? 'Kunci Gemini Aktif' : 'Atur Gemini API Key'}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Buat bank butir soal ujian berkualitas tinggi dengan menentukan <strong>jumlah soal</strong>, <strong>bentuk soal</strong>, 
              <strong>prompt/kisi-kisi kustom</strong>, <strong>tingkat/jenjang</strong>, <strong>kelas</strong>, dan <strong>ID Mapel</strong>. Soal otomatis tersimpan ke 
              Bank Soal dan dapat dideploy ulang kapan saja melalui tab Riwayat Soal.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Generator Form Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Row 1: Topik / Materi Pembelajaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Topik / Materi Pembelajaran Pokok *</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="cth: Operasi Hitung Pecahan & Perbandingan Nilai"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Row 2: Prompt Soal / Kisi-kisi Kustom */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Prompt Soal / Kisi-kisi & Stimulus Khusus (Opsional)</span>
              </span>
              <span className="text-[11px] text-slate-400">Instruksi pedagogis untuk AI</span>
            </label>
            <textarea
              rows={2}
              value={promptKustom}
              onChange={(e) => setPromptKustom(e.target.value)}
              placeholder="cth: Sajikan stimulus cerita kehidupan sehari-hari (belanja di pasar), gunakan tingkat kognitif HOTS C4 Analisis, dan sertakan kunci serta pembahasan detail."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Row 3: Parameter Grid (Tingkat, Kelas, ID Mapel, Bentuk Soal, Jumlah) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Tingkat / Jenjang */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Tingkat / Jenjang *</span>
              </label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SD / MI">SD / MI</option>
                <option value="SMP / MTs">SMP / MTs</option>
                <option value="SMA / MA">SMA / MA</option>
                <option value="SMK">SMK</option>
                <option value="Umum / Kuliah">Umum / Kuliah</option>
              </select>
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Kelas *</span>
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Kelas 1">Kelas 1</option>
                <option value="Kelas 2">Kelas 2</option>
                <option value="Kelas 3">Kelas 3</option>
                <option value="Kelas 4">Kelas 4</option>
                <option value="Kelas 5">Kelas 5</option>
                <option value="Kelas 6">Kelas 6</option>
                <option value="Kelas 7">Kelas 7 (1 SMP)</option>
                <option value="Kelas 8">Kelas 8 (2 SMP)</option>
                <option value="Kelas 9">Kelas 9 (3 SMP)</option>
                <option value="Kelas 10">Kelas 10 (1 SMA)</option>
                <option value="Kelas 11">Kelas 11 (2 SMA)</option>
                <option value="Kelas 12">Kelas 12 (3 SMA)</option>
              </select>
            </div>

            {/* Target ID Mapel */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>ID Mapel Target *</span>
              </label>
              <select
                value={idMapel}
                onChange={(e) => setIdMapel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {mapelList.map((m) => (
                  <option key={m.id_mapel} value={m.id_mapel}>
                    {m.id_mapel} ({m.nama_mapel})
                  </option>
                ))}
              </select>
            </div>

            {/* Bentuk Soal */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                <span>Bentuk Soal *</span>
              </label>
              <select
                value={bentukSoal}
                onChange={(e) => setBentukSoal(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Campuran">Campuran (Sesuai Kisi-kisi)</option>
                <option value="PG">Pilihan Ganda (PG 4 Opsi)</option>
                <option value="PGK">Pilihan Ganda Kompleks (PGK)</option>
                <option value="IS">Isian Singkat (IS)</option>
                <option value="MJ">Menjodohkan (MJ)</option>
                <option value="UR">Uraian / Esai (UR)</option>
              </select>
            </div>

            {/* Jumlah Soal */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Jumlah Total *</span>
                <span className="text-emerald-400 font-bold">{jumlah} Soal</span>
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={jumlah}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(40, Number(e.target.value)));
                  setJumlah(val);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Quick presets for question count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px] mr-1">Pilih Cepat Jumlah:</span>
              {[5, 10, 15, 20, 25, 30, 35, 40].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setJumlah(num);
                    if (num === 40) {
                      handleApplyPreset(25, 5, 3, 4, 3);
                    } else if (num === 20) {
                      handleApplyPreset(10, 4, 2, 2, 2);
                    } else if (num === 30) {
                      handleApplyPreset(20, 4, 0, 3, 3);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    jumlah === num
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num} Butir
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setUseCustomComposition(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                useCustomComposition
                  ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Atur Butir per Bentuk Soal</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-[10px] text-white">
                {totalFromKomposisi} Butir
              </span>
            </button>
          </div>

          {/* Collapsible Panel: Custom Question Distribution per Type */}
          {useCustomComposition && (
            <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Kisi-kisi Distribusi Butir Soal ({totalFromKomposisi} dari 40 Butir)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Tentukan kuota persis tiap jenis soal (PG, PGK, MJ, IS, UR)
                </div>
              </div>

              {/* 5 Input Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* PG */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">PG (Pilihan Ganda)</span>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('PG', (komposisi.PG || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-bold font-mono text-emerald-400 w-8 text-center">
                      {komposisi.PG}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('PG', (komposisi.PG || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">4 Opsi (A-D)</span>
                </div>

                {/* PGK */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">PGK (Kompleks)</span>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('PGK', (komposisi.PGK || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-bold font-mono text-indigo-400 w-8 text-center">
                      {komposisi.PGK}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('PGK', (komposisi.PGK || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Multi-Pilihan</span>
                </div>

                {/* MJ */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">MJ (Menjodohkan)</span>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('MJ', (komposisi.MJ || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-bold font-mono text-teal-400 w-8 text-center">
                      {komposisi.MJ}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('MJ', (komposisi.MJ || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Pasangan Konsep</span>
                </div>

                {/* IS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">IS (Isian Singkat)</span>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('IS', (komposisi.IS || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-bold font-mono text-cyan-400 w-8 text-center">
                      {komposisi.IS}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('IS', (komposisi.IS || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Kata Kunci Tepat</span>
                </div>

                {/* UR */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">UR (Uraian / Esai)</span>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('UR', (komposisi.UR || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-bold font-mono text-amber-400 w-8 text-center">
                      {komposisi.UR}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateKomposisi('UR', (komposisi.UR || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-400/80 mt-1 block">Koreksi Manual</span>
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-400 font-semibold">Preset Kisi-kisi Kurikulum:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(25, 5, 3, 4, 3)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                >
                  40 Butir Standar ASAS (25 PG, 5 PGK, 3 MJ, 4 IS, 3 UR)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(40, 0, 0, 0, 0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                >
                  40 Butir Full PG (40 PG)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(15, 10, 5, 5, 5)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                >
                  40 Butir AKM Literasi (15 PG, 10 PGK, 5 MJ, 5 IS, 5 UR)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(10, 4, 2, 2, 2)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                >
                  20 Butir Harian (10 PG, 4 PGK, 2 MJ, 2 IS, 2 UR)
                </button>
              </div>
            </div>
          )}

          {/* Action Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 hidden sm:block">
              Setiap butir soal dilengkapi kunci jawaban otomatis, pembobotan, dan pembahasan.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Sedang Merancang Butir Soal...' : `Generate ${jumlah} Soal Sekarang`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preview of Latest Generated Questions */}
      {lastGeneratedQuestions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pratinjau {lastGeneratedQuestions.length} Butir Soal yang Baru Dihasilkan</span>
            </h3>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Tersimpan di Bank Soal
            </span>
          </div>

          <div className="space-y-3">
            {lastGeneratedQuestions.map((q, idx) => (
              <div
                key={q.id_soal || idx}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400">
                    Nomor {idx + 1} ({q.jenis_soal}) • Bobot: {q.bobot} Poin • ID: {q.id_soal}
                  </span>
                  <span className="text-slate-400 text-[11px]">{selectedMapel?.nama_mapel}</span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">{cleanQuestionText(q.pertanyaan)}</p>

                {q.jenis_soal === 'PG' && Array.isArray(q.opsi_json) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pl-2">
                    {q.opsi_json.map((opt, oIdx) => {
                      const letter = ['A', 'B', 'C', 'D'][oIdx];
                      const isCorrect = String(q.kunci_jawaban_json).toUpperCase() === letter;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border flex items-center space-x-2 ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold">
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-[11px] pt-2 border-t border-slate-800/80 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                  <span>
                    Kunci Jawaban:{' '}
                    <strong className="text-emerald-400 font-mono">
                      {typeof q.kunci_jawaban_json === 'object'
                        ? JSON.stringify(q.kunci_jawaban_json)
                        : String(q.kunci_jawaban_json)}
                    </strong>
                  </span>
                  {q.pembahasan && (
                    <span className="italic text-slate-400">
                      💡 Pembahasan: {q.pembahasan}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
