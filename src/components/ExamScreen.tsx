import React, { useState, useEffect, useRef } from 'react';
import { MataPelajaran, Siswa, Question } from '../types';
import { 
  Clock, 
  AlertTriangle, 
  Check, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Maximize2, 
  Image as ImageIcon,
  X,
  ShieldAlert,
  ListFilter
} from 'lucide-react';
import { cleanQuestionText } from '../utils/textUtils';

interface ExamScreenProps {
  mapel: MataPelajaran;
  siswa: Siswa;
  questions: Question[];
  onSubmitExam: (answers: Record<string, any>, durationMinutes: number, violations: number) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  mapel,
  siswa,
  questions: rawQuestions,
  onSubmitExam,
}) => {
  // Filter out any draft questions so students only take active questions
  const questions = React.useMemo(() => {
    return rawQuestions.filter(q => !q.is_draft);
  }, [rawQuestions]);
  // Navigation & Answers State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  
  // Timer State (in seconds)
  const initialSeconds = (mapel.durasi_menit || 45) * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Anti-Cheat Proctoring State
  const [violations, setViolations] = useState<number>(0);
  const [showCheatWarning, setShowCheatWarning] = useState<boolean>(false);

  // Modals & Image Lightbox
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showQuestionPaletteMobile, setShowQuestionPaletteMobile] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // 1. Timer countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. Anti-cheat tab switch detector
  useEffect(() => {
    if (!mapel.anti_curang) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => {
          const next = prev + 1;
          setShowCheatWarning(true);
          return next;
        });
      }
    };

    const handleWindowBlur = () => {
      setViolations((prev) => {
        const next = prev + 1;
        setShowCheatWarning(true);
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [mapel.anti_curang]);

  const currentQuestion = questions[currentIndex];

  // Helper to format remaining time
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Answer modification handlers
  const handleSelectOption = (optionLetter: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id_soal]: optionLetter
    }));
  };

  const handleTogglePGK = (optionText: string) => {
    setAnswers(prev => {
      const currentList: string[] = Array.isArray(prev[currentQuestion.id_soal]) 
        ? [...prev[currentQuestion.id_soal]] 
        : [];
      const idx = currentList.indexOf(optionText);
      if (idx > -1) {
        currentList.splice(idx, 1);
      } else {
        currentList.push(optionText);
      }
      return {
        ...prev,
        [currentQuestion.id_soal]: currentList
      };
    });
  };

  const handleMatchingChange = (leftKey: string, rightVal: string) => {
    setAnswers(prev => {
      const currentMap = typeof prev[currentQuestion.id_soal] === 'object' && prev[currentQuestion.id_soal] !== null
        ? { ...prev[currentQuestion.id_soal] }
        : {};
      currentMap[leftKey] = rightVal;
      return {
        ...prev,
        [currentQuestion.id_soal]: currentMap
      };
    });
  };

  const handleTextAnswerChange = (val: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id_soal]: val
    }));
  };

  const toggleDoubtful = () => {
    setDoubtful(prev => ({
      ...prev,
      [currentQuestion.id_soal]: !prev[currentQuestion.id_soal]
    }));
  };

  // Checking question status
  const isQuestionAnswered = (qId: string) => {
    const val = answers[qId];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  };

  const answeredCount = questions.filter(q => isQuestionAnswered(q.id_soal)).length;
  const doubtfulCount = questions.filter(q => doubtful[q.id_soal]).length;
  const unansweredCount = questions.length - answeredCount;

  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000));
    onSubmitExam(answers, elapsedMinutes, violations);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* 1. Exam Top Bar: Subject, Student Info, Timer & Anti-Cheat */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Subject & Student Info */}
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
              {mapel.id_mapel}
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                {mapel.nama_mapel}
              </h2>
              <p className="text-xs text-slate-400">
                Peserta: <strong className="text-slate-200">{siswa.nama_siswa}</strong> (NISN: {siswa.nisn} • {siswa.kelas})
              </p>
            </div>
          </div>

          {/* Right: Timer & Palette Trigger */}
          <div className="flex items-center space-x-3">
            {/* Anti-cheat status pill */}
            {mapel.anti_curang && (
              <div 
                title={`Pelanggaran tercatat: ${violations} kali`}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                  violations > 0 
                    ? 'bg-rose-950/80 border-rose-700/80 text-rose-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${violations > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>Anti-Curang: {violations > 0 ? `${violations}x Peringatan` : 'Aman'}</span>
              </div>
            )}

            {/* Countdown Timer */}
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base ${
              secondsLeft < 300 
                ? 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse' 
                : 'bg-slate-950 border-slate-700 text-emerald-400'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsLeft)}</span>
            </div>

            {/* Mobile Palette Toggle Button */}
            <button
              onClick={() => setShowQuestionPaletteMobile(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center space-x-1"
            >
              <ListFilter className="w-4 h-4" />
              <span>Daftar Soal</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Exam Body */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Center Column: Active Question Workspace */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col justify-between min-h-[520px]">
          
          <div>
            {/* Question Header & Type Badge */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Soal Nomor {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentQuestion.jenis_soal === 'PG' && 'Pilihan Ganda'}
                  {currentQuestion.jenis_soal === 'PGK' && 'Pilihan Ganda Kompleks'}
                  {currentQuestion.jenis_soal === 'MJ' && 'Menjodohkan (Matching)'}
                  {currentQuestion.jenis_soal === 'IS' && 'Isian Singkat'}
                  {currentQuestion.jenis_soal === 'UR' && 'Uraian / Esai'}
                </span>
              </div>

              <div className="text-xs text-slate-400">
                Bobot: <strong className="text-slate-200">{currentQuestion.bobot} Poin</strong>
              </div>
            </div>

            {/* Optional Question Image */}
            {currentQuestion.url_gambar && (
              <div className="mb-6 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/70 max-w-lg shadow-lg">
                <img
                  src={currentQuestion.url_gambar}
                  alt="Ilustrasi Soal"
                  referrerPolicy="no-referrer"
                  onClick={() => setLightboxImage(currentQuestion.url_gambar || null)}
                  className="w-full max-h-72 object-contain mx-auto cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
                />
                <button
                  type="button"
                  onClick={() => setLightboxImage(currentQuestion.url_gambar || null)}
                  className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 text-white hover:bg-emerald-600 text-xs font-medium flex items-center space-x-1.5 shadow-md backdrop-blur-sm transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Perbesar Gambar</span>
                </button>
              </div>
            )}

            {/* Question Text */}
            <div className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed mb-8">
              {cleanQuestionText(currentQuestion.pertanyaan)}
            </div>

            {/* Interactive Inputs according to Question Type */}
            
            {/* TYPE 1: PG (Pilihan Ganda Biasa) */}
            {currentQuestion.jenis_soal === 'PG' && (
              <div className="space-y-3">
                {Array.isArray(currentQuestion.opsi_json) && currentQuestion.opsi_json.map((opsi, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx); // A, B, C, D...
                  const isSelected = answers[currentQuestion.id_soal] === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left p-4 rounded-xl border flex items-start space-x-3 transition ${
                        isSelected
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-sm sm:text-base leading-relaxed pt-0.5">{opsi}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TYPE 2: PGK (Pilihan Ganda Kompleks - Checkbox) */}
            {currentQuestion.jenis_soal === 'PGK' && (
              <div className="space-y-3">
                <p className="text-xs text-amber-400 font-medium mb-2">
                  *Pilihan Ganda Kompleks: Anda dapat mencentang lebih dari satu jawaban yang benar.
                </p>
                {Array.isArray(currentQuestion.opsi_json) && currentQuestion.opsi_json.map((opsi, oIdx) => {
                  const currentSelectedList: string[] = Array.isArray(answers[currentQuestion.id_soal])
                    ? answers[currentQuestion.id_soal]
                    : [];
                  const isChecked = currentSelectedList.includes(opsi);

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleTogglePGK(opsi)}
                      className={`w-full text-left p-4 rounded-xl border flex items-start space-x-3 transition ${
                        isChecked
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 mt-0.5 transition ${
                        isChecked
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border-2 border-slate-600 bg-slate-900'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-sm sm:text-base leading-relaxed">{opsi}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TYPE 3: MJ (Menjodohkan / Matching Pairs) */}
            {currentQuestion.jenis_soal === 'MJ' && (
              <div className="space-y-4">
                <p className="text-xs text-blue-400 font-medium">
                  *Jodohkan setiap item di kolom kiri dengan pasangan yang tepat di kolom kanan:
                </p>
                {typeof currentQuestion.opsi_json === 'object' && currentQuestion.opsi_json !== null && 'kiri' in currentQuestion.opsi_json && (
                  <div className="space-y-3">
                    {(currentQuestion.opsi_json as { kiri: string[]; kanan: string[] }).kiri.map((kiriItem) => {
                      const userPairs = answers[currentQuestion.id_soal] || {};
                      const currentVal = userPairs[kiriItem] || '';

                      return (
                        <div key={kiriItem} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="font-semibold text-sm text-slate-200">{kiriItem}</span>
                          <select
                            value={currentVal}
                            onChange={(e) => handleMatchingChange(kiriItem, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- Pilih Pasangan --</option>
                            {(currentQuestion.opsi_json as { kiri: string[]; kanan: string[] }).kanan.map((kananItem) => (
                              <option key={kananItem} value={kananItem}>{kananItem}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TYPE 4: IS (Isian Singkat) */}
            {currentQuestion.jenis_soal === 'IS' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ketik Jawaban Singkat Anda:
                </label>
                <input
                  type="text"
                  value={answers[currentQuestion.id_soal] || ''}
                  onChange={(e) => handleTextAnswerChange(e.target.value)}
                  placeholder="Ketik jawaban di sini (tidak sensitif huruf besar/kecil)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-sm sm:text-base text-white focus:outline-none focus:border-emerald-500 transition"
                />
                <p className="text-xs text-slate-500">
                  *Sistem akan mencocokkan kata kunci jawaban secara otomatis.
                </p>
              </div>
            )}

            {/* TYPE 5: UR (Uraian / Essay) */}
            {currentQuestion.jenis_soal === 'UR' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tuliskan Penjelasan Lengkap Anda:
                </label>
                <textarea
                  rows={6}
                  value={answers[currentQuestion.id_soal] || ''}
                  onChange={(e) => handleTextAnswerChange(e.target.value)}
                  placeholder="Tuliskan uraian atau langkah-langkah penyelesaian secara rinci..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition leading-relaxed resize-y"
                />
              </div>
            )}

          </div>

          {/* Bottom Question Controls Bar */}
          <div className="pt-8 border-t border-slate-800 mt-8 flex flex-wrap items-center justify-between gap-3">
            
            {/* Previous Button */}
            <button
              id="btn-prev-soal"
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Doubtful / Ragu-Ragu Toggle Button */}
            <button
              id="btn-ragu-ragu"
              type="button"
              onClick={toggleDoubtful}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                doubtful[currentQuestion.id_soal]
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {doubtful[currentQuestion.id_soal] ? '✓ Ditandai Ragu-ragu' : 'Ragu-ragu'}
            </button>

            {/* Next or Finish Button */}
            {currentIndex < questions.length - 1 ? (
              <button
                id="btn-next-soal"
                type="button"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition flex items-center space-x-1 shadow-md shadow-emerald-950/40"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-konfirmasi-selesai"
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shadow-md shadow-indigo-950/40"
              >
                <Send className="w-4 h-4" />
                <span>Selesai & Kumpulkan</span>
              </button>
            )}

          </div>

        </div>

        {/* Right Column: Question Palette Navigation (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-white">Nomor Soal</h3>
            <span className="text-xs text-slate-400">
              Terjawab {answeredCount} / {questions.length}
            </span>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-5 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const answered = isQuestionAnswered(q.id_soal);
              const isDoubt = doubtful[q.id_soal];
              const isCurrent = idx === currentIndex;

              let btnBg = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
              if (isDoubt) {
                btnBg = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
              } else if (answered) {
                btnBg = 'bg-emerald-600 text-white font-semibold border-emerald-500';
              }

              return (
                <button
                  key={q.id_soal}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-11 rounded-xl text-xs font-medium border flex items-center justify-center transition relative ${btnBg} ${
                    isCurrent ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                >
                  <span>{idx + 1}</span>
                  {answers[q.id_soal] && typeof answers[q.id_soal] === 'string' && answers[q.id_soal].length === 1 && (
                    <span className="absolute bottom-1 right-1 text-[9px] opacity-80 uppercase">
                      {answers[q.id_soal]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-slate-800 mt-5 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0" />
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 shrink-0" />
              <span>Belum dijawab</span>
            </div>
          </div>

          {/* Finish Exam Button in Palette */}
          <div className="pt-5 mt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold text-xs transition flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kumpulkan Ujian Sekarang</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Mobile Question Palette Drawer */}
      {showQuestionPaletteMobile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-80 max-w-full bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <h3 className="text-base font-bold text-white">Daftar Nomor Soal</h3>
                <button
                  type="button"
                  onClick={() => setShowQuestionPaletteMobile(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const answered = isQuestionAnswered(q.id_soal);
                  const isDoubt = doubtful[q.id_soal];
                  const isCurrent = idx === currentIndex;

                  let btnBg = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (isDoubt) btnBg = 'bg-amber-500 text-slate-950 font-bold';
                  else if (answered) btnBg = 'bg-emerald-600 text-white font-semibold';

                  return (
                    <button
                      key={q.id_soal}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowQuestionPaletteMobile(false);
                      }}
                      className={`h-11 rounded-xl text-xs font-medium border flex items-center justify-center ${btnBg} ${
                        isCurrent ? 'ring-2 ring-emerald-400' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowQuestionPaletteMobile(false);
                setShowConfirmModal(true);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Selesai & Kumpulkan</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Anti-Cheat Warning Modal */}
      {showCheatWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-700 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Peringatan Anti-Curang!</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              Anda terdeteksi berpindah jendela / tab browser atau membuka aplikasi lain. Tindakan ini dicatat ke log server ujian Google Sheets.
            </p>
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 mb-6 font-medium">
              Total Peringatan: {violations} kali
            </div>
            <button
              type="button"
              onClick={() => setShowCheatWarning(false)}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
            >
              Saya Mengerti & Kembali Mengerjakan
            </button>
          </div>
        </div>
      )}

      {/* 5. Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Konfirmasi Selesai Ujian</h3>
            <p className="text-xs text-slate-400 mb-5">
              Periksa ringkasan jawaban Anda sebelum mengumpulkan lembar ujian.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50">
                <div className="text-xl font-bold text-emerald-400">{answeredCount}</div>
                <div className="text-[11px] text-slate-400">Dijawab</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/50">
                <div className="text-xl font-bold text-amber-400">{doubtfulCount}</div>
                <div className="text-[11px] text-slate-400">Ragu-ragu</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50">
                <div className="text-xl font-bold text-rose-400">{unansweredCount}</div>
                <div className="text-[11px] text-slate-400">Kosong</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-start space-x-2.5 mb-6">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>Masih terdapat {unansweredCount} soal yang belum Anda jawab. Anda tetap ingin mengumpulkan?</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Batal & Lanjut Cek
              </button>
              <button
                id="btn-final-submit"
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition flex items-center justify-center space-x-1.5"
              >
                <span>{isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Image Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Perbesaran Gambar Soal"
              referrerPolicy="no-referrer"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
