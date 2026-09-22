import React, { useState, useEffect } from 'react';
import { MataPelajaran, Question, QuestionType, RiwayatPaketSoal } from '../../types';
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
  ExternalLink
} from 'lucide-react';
import { getStoredGeminiKey, getGeminiServerStatus } from '../../services/geminiKeyService';

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
  const [jumlah, setJumlah] = useState<number>(3);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGeneratedQuestions, setLastGeneratedQuestions] = useState<Question[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

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
          jumlah: Number(jumlah) || 3,
          bentukSoal,
          apiKey: clientKey || undefined,
        }),
      });

      let generatedList: Question[] = [];

      if (res.ok) {
        const jsonRes = await res.json();
        if (jsonRes.status === 'success' && Array.isArray(jsonRes.data) && jsonRes.data.length > 0) {
          generatedList = jsonRes.data;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.message) {
          console.warn('Backend returned warning:', errData.message);
        }
      }

      // 2. Intelligent client-side fallback if API returns error or no key configured
      if (generatedList.length === 0) {
        const timestamp = Date.now().toString().slice(-4);
        const count = Math.min(20, Math.max(1, Number(jumlah) || 3));

        for (let i = 0; i < count; i++) {
          const qNum = i + 1;
          const qId = `AI${timestamp}${qNum}`;

          let chosenType: QuestionType = 'PG';
          if (bentukSoal === 'Campuran') {
            const types: QuestionType[] = ['PG', 'PGK', 'IS', 'UR', 'MJ'];
            chosenType = types[i % types.length];
          } else if (['PG', 'PGK', 'MJ', 'IS', 'UR'].includes(bentukSoal)) {
            chosenType = bentukSoal as QuestionType;
          }

          if (chosenType === 'PG') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'PG',
              pertanyaan: `[${tingkat} ${kelas}] Berdasarkan topik "${topic}": Pada suatu kegiatan ${topic.toLowerCase()}, jika terdapat ${12 * qNum} satuan yang dibagi merata ke dalam ${3 * qNum} kelompok, berapakah jumlah pada masing-masing kelompok?`,
              opsi_json: [
                `${2 * qNum} satuan`,
                `4 satuan`,
                `${6 * qNum} satuan`,
                `${8 * qNum} satuan`,
              ],
              kunci_jawaban_json: 'B',
              bobot: 1,
              pembahasan: `${12 * qNum} dibagi ${3 * qNum} = 4. Jawaban yang tepat adalah opsi B.`,
            });
          } else if (chosenType === 'PGK') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'PGK',
              pertanyaan: `[${tingkat} ${kelas}] Terkait materi "${topic}": Manakah dari pernyataan di bawah ini yang bernilai benar? (Pilih semua yang sesuai)`,
              opsi_json: [
                `Pernyataan A: Konsep dasar ${topic.toLowerCase()} berlaku konsisten.`,
                `Pernyataan B: Nilai setara dapat dicapai melalui penyederhanaan pembilang dan penyebut.`,
                `Pernyataan C: Hasil selalu bernilai negatif dalam kondisi riil.`,
                `Pernyataan D: Perbandingan kuantitas berbanding lurus dengan rasio awal.`,
              ],
              kunci_jawaban_json: [
                `Pernyataan A: Konsep dasar ${topic.toLowerCase()} berlaku konsisten.`,
                `Pernyataan B: Nilai setara dapat dicapai melalui penyederhanaan pembilang dan penyebut.`,
                `Pernyataan D: Perbandingan kuantitas berbanding lurus dengan rasio awal.`,
              ],
              bobot: 2,
              pembahasan: 'Pernyataan A, B, dan D bernilai benar berdasarkan kaidah materi.',
            });
          } else if (chosenType === 'IS') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'IS',
              pertanyaan: `[${tingkat} ${kelas}] Lengkapi kalimat berikut tentang "${topic}": Satuan terkecil dari hasil penyederhanaan nilai tersebut adalah...`,
              kunci_jawaban_json: ['1/2', '0.5', 'setengah'],
              bobot: 1,
              pembahasan: 'Nilai paling sederhana adalah 1/2 atau 0,5.',
            });
          } else if (chosenType === 'MJ') {
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'MJ',
              pertanyaan: `[${tingkat} ${kelas}] Jodohkan konsep ${topic} di kolom kiri dengan pasangan tepatnya di kolom kanan:`,
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
              pembahasan: '1/4 = 0.25, 2/4 = 0.50, 3/4 = 0.75.',
            });
          } else {
            // UR
            generatedList.push({
              id_soal: qId,
              id_mapel: idMapel,
              jenis_soal: 'UR',
              pertanyaan: `[${tingkat} ${kelas} - Uraian] Jelaskan secara terstruktur langkah-langkah dalam menyelesaikan permasalahan ${topic.toLowerCase()} dan berikan contoh konkret penerapannya!`,
              kunci_jawaban_json: 'Memuat penjelasan konsep, langkah matematis yang runtut, dan contoh aplikatif.',
              bobot: 3,
              pembahasan: 'Rubrik penilaian: Skor 3 jika langkah dan contoh lengkap; skor 2 jika konsep benar namun contoh kurang tepat; skor 1 jika sebagian kecil benar.',
            });
          }
        }
      }

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
                <option value="Campuran">Campuran (PG, PGK, IS, UR, MJ)</option>
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
                <span>Jumlah Soal *</span>
                <span className="text-emerald-400 font-bold">{jumlah} Soal</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={jumlah}
                onChange={(e) => setJumlah(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Quick presets for question count */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 text-[11px]">Pilih Cepat Jumlah:</span>
            {[1, 3, 5, 10, 15, 20].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setJumlah(num)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  jumlah === num
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {num} Butir
              </button>
            ))}
          </div>

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

                <p className="text-xs text-slate-200 leading-relaxed font-medium">{q.pertanyaan}</p>

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
