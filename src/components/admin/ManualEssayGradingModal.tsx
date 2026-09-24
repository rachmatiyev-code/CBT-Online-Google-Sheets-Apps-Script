import React, { useState, useEffect } from 'react';
import { HasilUjian, Question } from '../../types';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  HelpCircle, 
  BookOpen, 
  User, 
  GraduationCap, 
  FileText, 
  Award, 
  Calendar,
  Sparkles,
  Check,
  RotateCcw,
  MessageSquare
} from 'lucide-react';

interface ManualEssayGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasil: HasilUjian | null;
  bankSoal: Question[];
  onSaveGrading: (updatedHasil: HasilUjian) => Promise<void> | void;
}

export const ManualEssayGradingModal: React.FC<ManualEssayGradingModalProps> = ({
  isOpen,
  onClose,
  hasil,
  bankSoal,
  onSaveGrading,
}) => {
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [catatanGuru, setCatatanGuru] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (hasil) {
      setLocalScores({ ...(hasil.skor_per_soal || {}) });
      setCatatanGuru(hasil.catatan_guru || '');
      setSaveSuccess(false);
    }
  }, [hasil, isOpen]);

  if (!isOpen || !hasil) return null;

  // Filter questions for this exam
  const studentAnswerKeys = Object.keys(hasil.jawaban_siswa || {});
  
  // Find questions in bank matching student answers or mapel
  const questionsByAnswerKey = bankSoal.filter(q => studentAnswerKeys.includes(q.id_soal));
  const questionsByMapel = bankSoal.filter(q => q.id_mapel === hasil.id_mapel);
  const examQuestionsPool = questionsByAnswerKey.length > 0 ? questionsByAnswerKey : questionsByMapel;

  // Filter Uraian (UR) questions
  let uraianQuestions = examQuestionsPool.filter(q => q.jenis_soal === 'UR');
  if (uraianQuestions.length === 0) {
    uraianQuestions = bankSoal.filter(q => q.jenis_soal === 'UR' && (q.id_mapel === hasil.id_mapel || studentAnswerKeys.includes(q.id_soal)));
  }

  // Prioritize Uraian questions, fallback to exam questions or student answers
  const questionsToReview: Question[] = uraianQuestions.length > 0 
    ? uraianQuestions 
    : (examQuestionsPool.length > 0 
        ? examQuestionsPool 
        : studentAnswerKeys.map(k => ({
            id_soal: k,
            id_mapel: hasil.id_mapel,
            jenis_soal: 'UR' as const,
            pertanyaan: `Pertanyaan butir (${k})`,
            bobot: 1,
            opsi_json: [],
            kunci_jawaban_json: '',
            pembahasan: '',
            url_gambar: undefined,
          }))
      );

  // Calculate live scores
  const allExamQuestions = examQuestionsPool.length > 0 ? examQuestionsPool : questionsToReview;
  
  let calculatedTotalBobot = 0;
  let calculatedTotalSkor = 0;

  allExamQuestions.forEach((q) => {
    const b = Number(q.bobot) || 1;
    calculatedTotalBobot += b;
    const s = localScores[q.id_soal] !== undefined ? Number(localScores[q.id_soal]) : (hasil.skor_per_soal[q.id_soal] || 0);
    calculatedTotalSkor += s;
  });

  // Ensure totalBobot matches hasil if bank was updated
  const totalBobotToUse = hasil.total_bobot > 0 ? hasil.total_bobot : calculatedTotalBobot;
  const nilaiAkhirKalkulasi = totalBobotToUse > 0 
    ? Math.round((calculatedTotalSkor / totalBobotToUse) * 100 * 100) / 100 
    : 0;

  const handleScoreChange = (idSoal: string, newScore: number, maxBobot: number) => {
    const clamped = Math.max(0, Math.min(maxBobot, Number(newScore) || 0));
    setLocalScores(prev => ({
      ...prev,
      [idSoal]: Math.round(clamped * 100) / 100
    }));
  };

  const handleQuickPercent = (idSoal: string, percent: number, maxBobot: number) => {
    const val = Math.round((maxBobot * (percent / 100)) * 100) / 100;
    handleScoreChange(idSoal, val, maxBobot);
  };

  const handleSave = async (markComplete: boolean = true) => {
    setIsSaving(true);
    try {
      const updatedHasil: HasilUjian = {
        ...hasil,
        skor_per_soal: localScores,
        skor_total: Math.round(calculatedTotalSkor * 100) / 100,
        total_bobot: totalBobotToUse,
        nilai_akhir: Math.min(100, Math.max(0, nilaiAkhirKalkulasi)),
        status_koreksi: markComplete ? 'SELESAI' : 'PENDING_URAIAN',
        catatan_guru: catatanGuru.trim() || undefined,
      };

      await onSaveGrading(updatedHasil);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Save manual grading failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl text-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Skoring Manual & Koreksi Uraian
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  hasil.status_koreksi === 'SELESAI'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                }`}>
                  {hasil.status_koreksi === 'SELESAI' ? 'Koreksi Selesai' : 'Perlu Koreksi Uraian'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan jawaban esai/uraian siswa dengan rubrik penilaian dan rekap nilai otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Meta & Live Score Banner */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Nama Siswa</span>
            <div className="text-sm font-bold text-white flex items-center space-x-1.5 mt-0.5">
              <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{hasil.nama_siswa}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">NISN: {hasil.nisn}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Kelas & Mapel</span>
            <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Kelas {hasil.kelas}</span>
            </div>
            <span className="text-[11px] text-indigo-300 font-medium truncate block">{hasil.nama_mapel}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Skor Diperoleh</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
              {calculatedTotalSkor} <span className="text-slate-400 text-xs font-normal">/ {totalBobotToUse} Poin</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {hasil.skor_total !== calculatedTotalSkor && (
                <span className="text-amber-400 font-medium">Diperbarui dari {hasil.skor_total}</span>
              )}
            </span>
          </div>

          <div className="text-right sm:text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Nilai Akhir (Skala 100)</span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${
                nilaiAkhirKalkulasi >= 75 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {nilaiAkhirKalkulasi}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {nilaiAkhirKalkulasi >= 75 ? 'Tuntas (KKM)' : 'Remedial'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Questions List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {questionsToReview.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Tidak ada butir soal uraian pada ujian ini.</p>
              <p className="text-xs text-slate-500">Semua butir soal bertipe objektif (PG, PGK, IS, MJ) telah dinilai otomatis oleh sistem.</p>
            </div>
          ) : (
            questionsToReview.map((q, idx) => {
              const studentAnswer = hasil.jawaban_siswa?.[q.id_soal];
              const maxBobot = Number(q.bobot) || 1;
              const currentScore = localScores[q.id_soal] !== undefined 
                ? localScores[q.id_soal] 
                : (hasil.skor_per_soal?.[q.id_soal] || 0);

              return (
                <div 
                  key={q.id_soal}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-md transition"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                        Soal #{idx + 1} ({q.id_soal})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                        {q.jenis_soal === 'UR' ? 'Uraian / Esai' : q.jenis_soal}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center space-x-1 font-medium">
                      <span>Bobot Maksimal:</span>
                      <span className="font-bold text-emerald-400 font-mono">{maxBobot} Poin</span>
                    </div>
                  </div>

                  {/* Pertanyaan */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Teks Pertanyaan:</span>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      {q.pertanyaan}
                    </p>
                    {q.url_gambar && (
                      <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-slate-800">
                        <img 
                          src={q.url_gambar} 
                          alt="Stimulus Soal" 
                          referrerPolicy="no-referrer"
                          className="w-full max-h-48 object-contain bg-black/40"
                        />
                      </div>
                    )}
                  </div>

                  {/* Jawaban Siswa */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-indigo-300 flex items-center space-x-1.5 uppercase tracking-wide">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Jawaban Siswa:</span>
                    </span>
                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs sm:text-sm text-slate-100 font-mono whitespace-pre-wrap leading-relaxed">
                      {studentAnswer ? String(studentAnswer) : (
                        <span className="text-slate-500 italic font-sans">(Siswa tidak mengisi jawaban / kosong)</span>
                      )}
                    </div>
                  </div>

                  {/* Rubrik / Kunci Guru */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                    <div className="text-slate-400 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-slate-300">Kunci Jawaban / Rubrik Penilaian:</span>
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {typeof q.kunci_jawaban_json === 'object' 
                        ? JSON.stringify(q.kunci_jawaban_json) 
                        : String(q.kunci_jawaban_json)}
                    </div>
                    {q.pembahasan && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <strong className="text-slate-300">Pedoman Penskoran:</strong> {q.pembahasan}
                      </div>
                    )}
                  </div>

                  {/* Input Skor & Fast Preset Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200">Beri Nilai:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={maxBobot}
                        value={currentScore}
                        onChange={(e) => handleScoreChange(q.id_soal, parseFloat(e.target.value) || 0, maxBobot)}
                        className="w-20 bg-slate-800 border border-indigo-500/60 rounded-xl px-2.5 py-1.5 text-sm font-bold text-white text-center font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">/ {maxBobot} Poin</span>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-slate-400 mr-1">Cepat:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickPercent(q.id_soal, 0, maxBobot)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 transition"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPercent(q.id_soal, 50, maxBobot)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-indigo-300 transition"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPercent(q.id_soal, 75, maxBobot)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-teal-300 transition"
                      >
                        75%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPercent(q.id_soal, 100, maxBobot)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white transition shadow-sm"
                      >
                        Maksimal
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Teacher Overall Notes */}
          <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Catatan / Umpan Balik Guru untuk Siswa (Opsional):</span>
            </label>
            <textarea
              rows={2}
              value={catatanGuru}
              onChange={(e) => setCatatanGuru(e.target.value)}
              placeholder="cth: Jawaban nomor 3 cukup runtut, namun perlu memperkuat analisis pada bagian contoh konkret."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              Nilai Akhir Baru: <strong className="text-white font-mono text-sm">{nilaiAkhirKalkulasi}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="Simpan perubahan skor namun biarkan status tetap PENDING URAIAN untuk ditinjau kembali"
            >
              Simpan Draf
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan & Tuntaskan Koreksi'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
