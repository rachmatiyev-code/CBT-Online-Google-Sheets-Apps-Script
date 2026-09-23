import React, { useState, useEffect } from 'react';
import { ViewMode, MataPelajaran, Question, Siswa, HasilUjian } from './types';
import { 
  getMataPelajaran, 
  saveMataPelajaran, 
  getBankSoal, 
  saveBankSoal, 
  getDataSiswa, 
  saveSiswa, 
  getHasilUjian, 
  saveHasilUjian, 
  resetDatabaseToDefault,
  hitungSkorOtomatis,
  getGasWebappUrl,
  kirimHasilKeGoogleSheets
} from './services/gasService';
import { Navbar } from './components/Navbar';
import { StudentLogin } from './components/StudentLogin';
import { ExamScreen } from './components/ExamScreen';
import { ExamResultScreen } from './components/ExamResultScreen';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  // Database States (lazily initialized from localStorage / defaults on first render)
  const [mapelList, setMapelList] = useState<MataPelajaran[]>(() => getMataPelajaran());
  const [soalList, setSoalList] = useState<Question[]>(() => getBankSoal());
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => getDataSiswa());
  const [hasilList, setHasilList] = useState<HasilUjian[]>(() => getHasilUjian());
  const [gasUrl, setGasUrl] = useState<string>(() => getGasWebappUrl());

  // Active Exam Session States
  const [activeMapel, setActiveMapel] = useState<MataPelajaran | null>(null);
  const [activeSiswa, setActiveSiswa] = useState<Siswa | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [latestHasil, setLatestHasil] = useState<HasilUjian | null>(null);

  // Initialize data on mount
  useEffect(() => {
    setMapelList(getMataPelajaran());
    setSoalList(getBankSoal());
    setSiswaList(getDataSiswa());
    setHasilList(getHasilUjian());
    setGasUrl(getGasWebappUrl());
  }, []);

  // Sync state helpers
  const handleUpdateMapel = (updated: MataPelajaran[]) => {
    setMapelList(updated);
    saveMataPelajaran(updated);
  };

  const handleUpdateSoal = (updated: Question[]) => {
    setSoalList(updated);
    saveBankSoal(updated);
  };

  const handleUpdateSiswa = (updated: Siswa[]) => {
    setSiswaList(updated);
    saveSiswa(updated);
  };

  const handleUpdateHasil = (updated: HasilUjian[]) => {
    setHasilList(updated);
    saveHasilUjian(updated);
  };

  const handleResetDatabase = () => {
    resetDatabaseToDefault();
    setMapelList(getMataPelajaran());
    setSoalList(getBankSoal());
    setSiswaList(getDataSiswa());
    setHasilList(getHasilUjian());
  };

  // Start exam flow
  const handleStartExam = (selectedMapel: MataPelajaran, student: Siswa, enteredToken: string) => {
    // Filter questions for the selected subject
    let subjectQuestions = soalList.filter(s => s.id_mapel === selectedMapel.id_mapel);

    if (selectedMapel.acak_soal) {
      subjectQuestions = [...subjectQuestions].sort(() => Math.random() - 0.5);
    }

    setActiveMapel(selectedMapel);
    setActiveSiswa(student);
    setActiveQuestions(subjectQuestions);
    setViewMode('ujian');
  };

  // Submit exam flow
  const handleSubmitExam = async (
    answers: Record<string, any>, 
    durationMinutes: number, 
    violations: number
  ) => {
    if (!activeMapel || !activeSiswa) return;

    // 1. Calculate Score using automated scoring function
    const scoringResult = hitungSkorOtomatis(activeQuestions, answers);

    // 2. Format Timestamp
    const now = new Date();
    const formattedTimestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    // 3. Construct Hasil Record
    const newHasil: HasilUjian = {
      id_hasil: 'H-' + Date.now().toString().slice(-6),
      timestamp: formattedTimestamp,
      nisn: activeSiswa.nisn,
      nama_siswa: activeSiswa.nama_siswa,
      kelas: activeSiswa.kelas,
      id_mapel: activeMapel.id_mapel,
      nama_mapel: activeMapel.nama_mapel,
      jawaban_siswa: answers,
      skor_per_soal: scoringResult.skorPerSoal,
      skor_total: scoringResult.totalSkor,
      total_bobot: scoringResult.totalBobot,
      nilai_akhir: scoringResult.nilaiAkhir,
      status_koreksi: scoringResult.statusKoreksi,
      pelanggaran_curang: violations,
      durasi_menit: durationMinutes,
    };

    // 4. Save to local spreadsheet database simulator
    const updatedHasilList = [newHasil, ...hasilList];
    handleUpdateHasil(updatedHasilList);
    setLatestHasil(newHasil);

    // 5. If live Google Apps Script Web App URL is connected, post payload with text/plain (anti-CORS) to HasilUjian tab
    const targetGasUrl = getGasWebappUrl();
    if (targetGasUrl) {
      kirimHasilKeGoogleSheets(newHasil, targetGasUrl).then((res) => {
        if (!res.success) {
          console.warn('Google Sheets sync warning:', res.message);
        }
      }).catch((err) => {
        console.error('Google Sheets sync err:', err);
      });
    }

    // 6. Navigate to Exam Result view
    setViewMode('hasil');
  };

  const handleBackToHome = () => {
    setActiveMapel(null);
    setActiveSiswa(null);
    setActiveQuestions([]);
    setLatestHasil(null);
    setViewMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Application Bar */}
      <Navbar
        currentMode={viewMode}
        onModeChange={(mode) => {
          if (viewMode === 'ujian' && mode !== 'ujian') {
            if (!confirm('Anda sedang dalam sesi ujian. Yakin ingin keluar? Jawaban Anda belum tersimpan.')) {
              return;
            }
          }
          setViewMode(mode);
        }}
        gasConnected={Boolean(gasUrl)}
        gasUrl={gasUrl}
        studentName={activeSiswa?.nama_siswa}
        mapelName={activeMapel?.nama_mapel}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {viewMode === 'login' && (
          <StudentLogin
            mapelList={mapelList}
            soalList={soalList}
            siswaList={siswaList}
            onStartExam={handleStartExam}
          />
        )}

        {viewMode === 'ujian' && activeMapel && activeSiswa && (
          <ExamScreen
            mapel={activeMapel}
            siswa={activeSiswa}
            questions={activeQuestions}
            onSubmitExam={handleSubmitExam}
          />
        )}

        {viewMode === 'hasil' && latestHasil && activeMapel && (
          <ExamResultScreen
            hasil={latestHasil}
            mapel={activeMapel}
            questions={activeQuestions}
            onBackToHome={handleBackToHome}
          />
        )}

        {viewMode === 'admin' && (
          <AdminDashboard
            mapelList={mapelList}
            soalList={soalList}
            siswaList={siswaList}
            hasilList={hasilList}
            onUpdateMapel={handleUpdateMapel}
            onUpdateSoal={handleUpdateSoal}
            onUpdateSiswa={handleUpdateSiswa}
            onUpdateHasil={handleUpdateHasil}
            onResetDatabase={handleResetDatabase}
          />
        )}
      </main>
    </div>
  );
}
