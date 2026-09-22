import React, { useState } from 'react';
import { HasilUjian, MataPelajaran, Question } from '../types';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Printer, 
  ArrowLeft, 
  Code2, 
  ChevronDown, 
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';

interface ExamResultScreenProps {
  hasil: HasilUjian;
  mapel: MataPelajaran;
  questions: Question[];
  onBackToHome: () => void;
}

export const ExamResultScreen: React.FC<ExamResultScreenProps> = ({
  hasil,
  mapel,
  questions,
  onBackToHome,
}) => {
  const [showPayload, setShowPayload] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(true);

  const isPassed = hasil.nilai_akhir >= (mapel.kkm || 75);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Main Result Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Banner */}
          <div className="text-center pb-8 border-b border-slate-800">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Lembar Jawaban Berhasil Tersimpan ke Google Sheets</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hasil Evaluasi Ujian Online (CBT)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {mapel.nama_mapel} • Kelas {mapel.kelas}
            </p>
          </div>

          {/* Score & Passing Grade Showcase */}
          <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center border-b border-slate-800">
            {/* Score Display */}
            <div className="flex flex-col items-center sm:items-start space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Nilai Akhir (Skala 0 - 100)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className={`text-5xl sm:text-6xl font-black tracking-tight ${
                  isPassed ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {hasil.nilai_akhir}
                </span>
                <span className="text-sm font-medium text-slate-500">/ 100</span>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isPassed 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isPassed ? 'LULUS (MEMENUHI KKM)' : 'REMEDIAL'}
                </span>
                <span className="text-xs text-slate-400">KKM: {mapel.kkm}</span>
              </div>
            </div>

            {/* Student Meta Details */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Siswa</span>
                <span className="font-semibold text-white">{hasil.nama_siswa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NISN</span>
                <span className="font-mono text-slate-200">{hasil.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas</span>
                <span className="text-slate-200">{hasil.kelas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Durasi Pengerjaan</span>
                <span className="text-slate-200 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{hasil.durasi_menit} Menit</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pelanggaran Anti-Curang</span>
                <span className={`font-semibold ${hasil.pelanggaran_curang > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {hasil.pelanggaran_curang} Kali
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Stats Grid */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-white">{hasil.skor_total}</div>
              <div className="text-xs text-slate-400 mt-1">Skor Diperoleh</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-slate-300">{hasil.total_bobot}</div>
              <div className="text-xs text-slate-400 mt-1">Bobot Maksimal</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-blue-400">{questions.length}</div>
              <div className="text-xs text-slate-400 mt-1">Total Soal</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                {hasil.status_koreksi}
              </div>
              <div className="text-xs text-slate-400 mt-1">Status Koreksi</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onBackToHome}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda Ujian</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPayload(!showPayload)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center space-x-1.5"
              >
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{showPayload ? 'Tutup Payload' : 'Lihat Payload doPost'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950/40"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Nilai</span>
              </button>
            </div>
          </div>

          {/* Educational Payload Viewer (As requested in conversation) */}
          {showPayload && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
              <div className="flex items-center justify-between text-slate-400 mb-2 font-sans font-semibold">
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Struktur Data JSON yang dikirimkan via doPost() ke Google Apps Script:</span>
                </span>
              </div>
              <pre className="text-slate-300 leading-relaxed text-[11px]">
{JSON.stringify(
  {
    action: "submitJawaban",
    id_mapel: hasil.id_mapel,
    nisn: hasil.nisn,
    nama_siswa: hasil.nama_siswa,
    kelas: hasil.kelas,
    durasi_menit: hasil.durasi_menit,
    pelanggaran_curang: hasil.pelanggaran_curang,
    jawaban: hasil.jawaban_siswa,
    skor_hasil: {
      totalSkor: hasil.skor_total,
      totalBobot: hasil.total_bobot,
      nilaiAkhir: hasil.nilai_akhir,
      statusKoreksi: hasil.status_koreksi
    }
  },
  null,
  2
)}
              </pre>
            </div>
          )}
        </div>

        {/* Detailed Question Review & Pembahasan */}
        {mapel.tampilkan_pembahasan && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Review Lembar Jawaban & Pembahasan</h3>
                <p className="text-xs text-slate-400">Kunci jawaban dan evaluasi butir soal</p>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>{showDetails ? 'Sembunyikan' : 'Buka Semua'}</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showDetails && (
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const studentAnswer = hasil.jawaban_siswa[q.id_soal];
                  const earnedScore = hasil.skor_per_soal[q.id_soal] ?? 0;
                  const isFull = earnedScore === q.bobot;
                  const isZero = earnedScore === 0;

                  return (
                    <div 
                      key={q.id_soal}
                      className={`p-5 rounded-2xl border transition ${
                        isFull 
                          ? 'bg-slate-950/70 border-emerald-900/40' 
                          : isZero 
                            ? 'bg-slate-950/70 border-rose-900/40' 
                            : 'bg-slate-950/70 border-amber-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="font-bold text-slate-300">Nomor {idx + 1} ({q.jenis_soal})</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                          isFull 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : isZero 
                              ? 'bg-rose-500/20 text-rose-400' 
                              : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          Skor: {earnedScore} / {q.bobot}
                        </span>
                      </div>

                      <p className="text-sm text-slate-200 font-medium mb-4 leading-relaxed">
                        {q.pertanyaan}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 mb-3">
                        <div>
                          <span className="text-slate-400 block mb-1">Jawaban Anda:</span>
                          <span className="font-semibold text-slate-200">
                            {studentAnswer 
                              ? (typeof studentAnswer === 'object' ? JSON.stringify(studentAnswer) : String(studentAnswer))
                              : '(Tidak Dijawab)'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Kunci Jawaban:</span>
                          <span className="font-semibold text-emerald-400">
                            {typeof q.kunci_jawaban_json === 'object'
                              ? JSON.stringify(q.kunci_jawaban_json)
                              : String(q.kunci_jawaban_json)
                            }
                          </span>
                        </div>
                      </div>

                      {q.pembahasan && (
                        <div className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                          <strong className="text-slate-300">Pembahasan:</strong> {q.pembahasan}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
