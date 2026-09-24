import React, { useState, useEffect, useMemo } from 'react';
import { MataPelajaran, Siswa, Question, DatabaseMode } from '../types';
import { getKodeSoalList } from '../services/gasService';
import { 
  KeyRound, 
  Clock, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  ShieldAlert, 
  ArrowRight,
  Sparkles,
  Info,
  Layers
} from 'lucide-react';

interface StudentLoginProps {
  mapelList: MataPelajaran[];
  soalList: Question[];
  siswaList: Siswa[];
  dbMode?: DatabaseMode;
  onStartExam: (selectedMapel: MataPelajaran, student: Siswa, enteredToken: string) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  mapelList,
  soalList,
  siswaList,
  dbMode = 'simulator',
  onStartExam,
}) => {
  // Filter student list: if full database mode (GDrive) is active, strictly exclude dummy records
  const filteredSiswaList = useMemo(() => {
    if (dbMode === 'database_penuh') {
      const real = siswaList.filter(s => !s.is_dummy);
      return real.length > 0 ? real : siswaList.filter(s => !s.is_dummy);
    }
    return siswaList;
  }, [siswaList, dbMode]);

  const [selectedMapelId, setSelectedMapelId] = useState<string>(mapelList[0]?.id_mapel || '');
  const [selectedKodeSoal, setSelectedKodeSoal] = useState<string>('');
  const [selectedNisn, setSelectedNisn] = useState<string>(() => filteredSiswaList[0]?.nisn || '');
  const [manualNisn, setManualNisn] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [enteredToken, setEnteredToken] = useState<string>('');
  const [agreedToRules, setAgreedToRules] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFromSharedLink, setIsFromSharedLink] = useState<boolean>(false);

  // Initialize from URL parameters if accessed via shared student link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qMapel = params.get('mapel');
      const qNisn = params.get('nisn');
      const qMode = params.get('mode');
      const qKode = params.get('kode');

      if (qMode === 'siswa' || qMapel || qNisn || qKode) {
        setIsFromSharedLink(true);
      }

      if (qKode) {
        setSelectedKodeSoal(qKode);
      }

      if (qMapel && mapelList.some(m => m.id_mapel === qMapel)) {
        setSelectedMapelId(qMapel);
      }
      if (qNisn) {
        setManualNisn(qNisn);
        const matched = filteredSiswaList.find(s => s.nisn === qNisn);
        if (matched) {
          setSelectedNisn(matched.nisn);
          setEnteredPin(matched.pin_siswa);
        } else {
          setSelectedNisn(qNisn);
        }
      }
    }
  }, [mapelList, filteredSiswaList]);

  useEffect(() => {
    if (!selectedMapelId && mapelList.length > 0) {
      setSelectedMapelId(mapelList[0].id_mapel);
    }
  }, [mapelList, selectedMapelId]);

  useEffect(() => {
    if (!selectedNisn && filteredSiswaList.length > 0) {
      setSelectedNisn(filteredSiswaList[0].nisn);
      if (dbMode === 'simulator') {
        setEnteredPin(filteredSiswaList[0].pin_siswa);
      }
    }
  }, [filteredSiswaList, selectedNisn, dbMode]);

  const currentMapel = mapelList.find(m => m.id_mapel === selectedMapelId);
  const currentSiswa = filteredSiswaList.find(s => s.nisn === (selectedNisn || manualNisn));

  // Determine active exam package if any
  const allPackages = useMemo(() => getKodeSoalList(), []);
  const activePackage = useMemo(() => {
    const pkgId = selectedKodeSoal || currentMapel?.kode_soal_aktif;
    if (pkgId && pkgId !== 'ALL') {
      return allPackages.find(p => p.id_kode === pkgId);
    }
    return null;
  }, [selectedKodeSoal, currentMapel?.kode_soal_aktif, allPackages]);

  // Question count depends on package or subject bank
  const countSoal = useMemo(() => {
    if (activePackage) {
      return activePackage.jumlah_soal;
    }
    return soalList.filter(s => s.id_mapel === selectedMapelId && !s.is_draft).length;
  }, [activePackage, soalList, selectedMapelId]);

  // Expected token
  const expectedToken = activePackage?.token_akses || currentMapel?.token_akses || '';

  const handleQuickStudentSelect = (siswa: Siswa) => {
    setSelectedNisn(siswa.nisn);
    setManualNisn(siswa.nisn);
    setEnteredPin(siswa.pin_siswa);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentMapel) {
      setErrorMessage('Silakan pilih mata pelajaran terlebih dahulu.');
      return;
    }

    // 1. Check if exam is ACTIVE
    if (!currentMapel.status_aktif) {
      setErrorMessage(
        `Ujian "${currentMapel.nama_mapel}" saat ini statusnya NONAKTIF / ditutup oleh Guru. Hubungi guru pengawas untuk mengaktifkan status ujian!`
      );
      return;
    }

    // 2. Validate Student NISN & PIN
    const finalNisn = (selectedNisn || manualNisn).trim();
    if (!finalNisn) {
      setErrorMessage('Silakan pilih atau masukkan NISN Anda.');
      return;
    }

    let studentToUse = currentSiswa;
    if (!studentToUse) {
      // If student is entering credentials directly
      studentToUse = {
        nisn: finalNisn,
        nama_siswa: `Siswa (${finalNisn})`,
        kelas: currentMapel.kelas || '5',
        pin_siswa: enteredPin.trim()
      };
    } else {
      if (enteredPin.trim() !== studentToUse.pin_siswa.trim()) {
        setErrorMessage('PIN Siswa salah! Silakan periksa kembali kartu ujian Anda.');
        return;
      }
    }

    // 3. Validate Token
    if (expectedToken && enteredToken.trim().toUpperCase() !== expectedToken.trim().toUpperCase()) {
      setErrorMessage(
        `Token Ujian tidak valid. (Petunjuk token ujian: ${expectedToken})`
      );
      return;
    }

    // 4. Validate Rules
    if (!agreedToRules) {
      setErrorMessage('Anda harus menyetujui tata tertib ujian sebelum memulai.');
      return;
    }

    if (countSoal === 0) {
      setErrorMessage('Belum ada butir soal yang siap dikerjakan pada ujian ini.');
      return;
    }

    // Pass mapel with active package attached
    const finalMapel: MataPelajaran = {
      ...currentMapel,
      kode_soal_aktif: activePackage ? activePackage.id_kode : currentMapel.kode_soal_aktif,
      durasi_menit: activePackage?.durasi_menit || currentMapel.durasi_menit,
      token_akses: expectedToken
    };

    onStartExam(finalMapel, studentToUse, enteredToken.trim().toUpperCase());
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Exam Rules & Identity Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tata Tertib Ujian Online</h3>
                <p className="text-xs text-slate-400">Harap dibaca dengan cermat</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>Ujian dikerjakan secara mandiri tanpa membuka buku atau catatan lain.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Fitur Anti-Curang Aktif:</strong> Dilarang berpindah tab browser atau meminimalkan layar. Sistem mencatat setiap pelanggaran.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>Timer hitung mundur berjalan otomatis sejak tombol "Mulai Ujian" ditekan.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>Jawaban otomatis tersimpan dan dikirimkan ke <strong>Google Sheets</strong> saat waktu habis atau tombol Selesai ditekan.</span>
              </li>
            </ul>

            {/* Google Sheets Architecture Note */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-xs text-slate-300">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Arsitektur Bebas Biaya</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Aplikasi ini membaca bank soal dan merekap nilai langsung menggunakan Google Sheets & Google Apps Script tanpa Firebase maupun Google Cloud.
              </p>
            </div>
          </div>

          {/* Quick Demo Helper: Only show in simulator mode when not accessed from a live shared student link */}
          {dbMode === 'simulator' && !isFromSharedLink && filteredSiswaList.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Akun Siswa Demo (Klik Cepat):</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredSiswaList.slice(0, 4).map((s) => (
                  <button
                    key={s.nisn}
                    type="button"
                    onClick={() => handleQuickStudentSelect(s)}
                    className={`text-left p-2 rounded-lg border text-xs transition ${
                      selectedNisn === s.nisn
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium truncate">{s.nama_siswa}</p>
                    <p className="text-[10px] text-slate-400">NISN: {s.nisn} • PIN: {s.pin_siswa}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Login Form */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Masuk Ujian Siswa</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pilih mata pelajaran, masukkan identitas dan token ujian dari pengawas.
            </p>
          </div>

          {isFromSharedLink && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm flex items-start space-x-3">
              <Sparkles className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="text-white block">Tautan Khusus Siswa Terdeteksi</strong>
                <span>Mata pelajaran <strong>{currentMapel?.nama_mapel}</strong> telah otomatis dipilih. Silakan masukkan NISN & PIN resmi Anda lalu ketikkan Token Ujian untuk mulai.</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs sm:text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* 1. Mata Pelajaran Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mata Pelajaran Ujian
              </label>
              <select
                id="select-mapel"
                value={selectedMapelId}
                onChange={(e) => setSelectedMapelId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {mapelList.map((m) => (
                  <option key={m.id_mapel} value={m.id_mapel}>
                    {m.nama_mapel} (Kelas {m.kelas}) - {m.status_aktif ? '🟢 AKTIF' : '🔴 DITUTUP'}
                  </option>
                ))}
              </select>

              {/* Subject Meta Badges */}
              {currentMapel && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {activePackage && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-700/60">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Paket: [{activePackage.id_kode}] {activePackage.nama_kode}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Durasi: {activePackage?.durasi_menit || currentMapel.durasi_menit} Menit</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>{countSoal} Butir Soal</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    <span>KKM: {currentMapel.kkm}</span>
                  </span>
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border ${
                    currentMapel.status_aktif
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                      : 'bg-rose-950/70 text-rose-300 border-rose-700/60'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${currentMapel.status_aktif ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span>Status: {currentMapel.status_aktif ? 'Terbuka (AKTIF)' : 'Ditutup (NONAKTIF)'}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 2. NISN & Nama Siswa Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  NISN / Nomor Peserta
                </label>
                {filteredSiswaList.length > 0 ? (
                  <select
                    id="select-siswa-nisn"
                    value={selectedNisn}
                    onChange={(e) => {
                      const found = filteredSiswaList.find(s => s.nisn === e.target.value);
                      setSelectedNisn(e.target.value);
                      setManualNisn(e.target.value);
                      if (found && dbMode === 'simulator') setEnteredPin(found.pin_siswa);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    {filteredSiswaList.map((s) => (
                      <option key={s.nisn} value={s.nisn}>
                        {s.nisn} - {s.nama_siswa} ({s.kelas})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-siswa-nisn"
                    type="text"
                    value={manualNisn}
                    onChange={(e) => {
                      setManualNisn(e.target.value);
                      setSelectedNisn(e.target.value);
                    }}
                    placeholder="Masukkan NISN Siswa..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  PIN Siswa (4 Digit)
                </label>
                <input
                  id="input-pin-siswa"
                  type="password"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Ketik PIN Anda..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition tracking-widest font-mono"
                  required
                />
              </div>
            </div>

            {/* 3. Token Ujian */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Token Ujian</span>
                </label>
                {expectedToken && (
                  <button
                    type="button"
                    onClick={() => setEnteredToken(expectedToken)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Salin Token Ujian: {expectedToken}
                  </button>
                )}
              </div>
              <input
                id="input-token-ujian"
                type="text"
                value={enteredToken}
                onChange={(e) => setEnteredToken(e.target.value.toUpperCase())}
                placeholder="Ketik token di sini (misal: MTK3A)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Agreement Checkbox */}
            <div className="pt-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-xs text-slate-400 leading-relaxed">
                  Saya menyatakan akan mengerjakan ujian ini secara jujur, tertib, dan menyetujui seluruh ketentuan tata tertib ujian.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-4">
              <button
                id="btn-mulai-ujian"
                type="submit"
                disabled={!currentMapel?.status_aktif}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg transition ${
                  currentMapel?.status_aktif
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <span>Mulai Kerjakan Ujian Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
