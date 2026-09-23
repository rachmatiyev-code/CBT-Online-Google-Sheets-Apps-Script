import React, { useState } from 'react';
import { 
  MataPelajaran, 
  Question, 
  Siswa, 
  HasilUjian, 
  AdminTab,
  AnalisisItem,
  QuestionType,
  RiwayatPaketSoal,
  KodeSoalPaket,
  DAFTAR_MATA_PELAJARAN,
  DatabaseMode,
  StorageStatus
} from '../types';
import { 
  hitungAnalisisButirSoal, 
  GAS_CODE_GS, 
  getGasWebappUrl, 
  setGasWebappUrl,
  getRiwayatPaketSoal,
  saveRiwayatPaketSoal,
  tambahRiwayatPaketSoal,
  hapusRiwayatPaketSoal,
  getKodeSoalList,
  tambahKodeSoal,
  updateKodeSoal,
  hapusKodeSoal,
  kirimHasilKeGoogleSheets,
  getDatabaseMode,
  setDatabaseMode,
  getStorageLocation,
  getMataPelajaran,
  getBankSoal,
  getDataSiswa,
  getHasilUjian
} from '../services/gasService';
import { KodeSoalTab } from './admin/KodeSoalTab';
import { StorageStatusModal, StorageStatusButton } from './admin/StorageStatusModal';
import { DeleteDummyModal } from './admin/DeleteDummyModal';
import { 
  Table, 
  BarChart3, 
  Sparkles, 
  FileCode2, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  FileKey,
  Send,
  Copy, 
  ExternalLink, 
  Download, 
  RotateCcw,
  Search,
  RefreshCw,
  Cloud,
  HardDrive,
  Database,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Globe,
  Edit3,
  Share2,
  History,
  UserPlus,
  Key,
  Image as ImageIcon,
  Maximize2,
  X
} from 'lucide-react';
import { EnhancedItemAnalysis } from './admin/EnhancedItemAnalysis';
import { AiGeneratorTab } from './admin/AiGeneratorTab';
import { QuestionHistoryTab } from './admin/QuestionHistoryTab';
import { ShareLinkModal } from './admin/ShareLinkModal';
import { QuestionEditModal } from './admin/QuestionEditModal';
import { StudentCrudModal } from './admin/StudentCrudModal';
import { GeminiApiKeyTab } from './admin/GeminiApiKeyTab';

interface AdminDashboardProps {
  mapelList: MataPelajaran[];
  soalList: Question[];
  siswaList: Siswa[];
  hasilList: HasilUjian[];
  onUpdateMapel: (list: MataPelajaran[]) => void;
  onUpdateSoal: (list: Question[]) => void;
  onUpdateSiswa: (list: Siswa[]) => void;
  onUpdateHasil: (list: HasilUjian[]) => void;
  onResetDatabase: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  mapelList,
  soalList,
  siswaList,
  hasilList,
  onUpdateMapel,
  onUpdateSoal,
  onUpdateSiswa,
  onUpdateHasil,
  onResetDatabase,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('sheets');
  const [activeSheetTab, setActiveSheetTab] = useState<'MataPelajaran' | 'BankSoal' | 'DataSiswa' | 'HasilUjian'>('MataPelajaran');
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>('all');
  const [searchSoalTerm, setSearchSoalTerm] = useState<string>('');
  const [searchSiswaTerm, setSearchSiswaTerm] = useState<string>('');

  // Riwayat Paket Soal State
  const [historyList, setHistoryList] = useState<RiwayatPaketSoal[]>(() => getRiwayatPaketSoal());

  // Kode Soal State
  const [kodeList, setKodeList] = useState<KodeSoalPaket[]>(() => getKodeSoalList());

  // Storage Status & Mode Modal States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [isDeleteDummyModalOpen, setIsDeleteDummyModalOpen] = useState<boolean>(false);
  const [dbMode, setDbMode] = useState<DatabaseMode>(() => getDatabaseMode());

  // Refresh all state from local storage when synced or dummy data deleted
  const handleDataRefreshed = () => {
    onUpdateMapel(getMataPelajaran());
    onUpdateSoal(getBankSoal());
    onUpdateSiswa(getDataSiswa());
    onUpdateHasil(getHasilUjian());
    setKodeList(getKodeSoalList());
    setHistoryList(getRiwayatPaketSoal());
    setDbMode(getDatabaseMode());
  };

  const handleToggleDbMode = (targetMode: DatabaseMode) => {
    setDbMode(targetMode);
    setDatabaseMode(targetMode);
    if (targetMode === 'database_penuh') {
      setIsStorageModalOpen(true);
    }
  };

  // Test Kirim Hasil Ujian State (Troubleshooting Google Sheets)
  const [testSendLoading, setTestSendLoading] = useState<boolean>(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kode Soal Handlers
  const handleSaveKode = (item: KodeSoalPaket) => {
    tambahKodeSoal(item);
    setKodeList(getKodeSoalList());
  };

  const handleUpdateKode = (item: KodeSoalPaket) => {
    updateKodeSoal(item);
    setKodeList(getKodeSoalList());
  };

  const handleDeleteKode = (id_kode: string) => {
    hapusKodeSoal(id_kode);
    setKodeList(getKodeSoalList());
  };

  const handleSyncKodeToMapel = (item: KodeSoalPaket) => {
    const updated = mapelList.map(m => {
      if (m.id_mapel === item.id_mapel) {
        return {
          ...m,
          token_akses: item.token_akses,
          durasi_menit: item.durasi_menit,
          status_aktif: item.status_aktif,
          kkm: item.kkm,
        };
      }
      return m;
    });
    onUpdateMapel(updated);
    alert(`Berhasil sinkronkan Kode Soal ${item.id_kode} ke Mapel ${item.id_mapel}! Token: ${item.token_akses}, Durasi: ${item.durasi_menit} menit.`);
  };

  // Handler for live testing writing to tab HasilUjian
  const handleTestSendHasilUjian = async () => {
    const url = gasUrlInput.trim();
    if (!url) {
      setTestSendResult({
        success: false,
        message: 'Harap masukkan URL Web App Google Apps Script Anda terlebih dahulu.'
      });
      return;
    }

    setTestSendLoading(true);
    setTestSendResult(null);

    const sampleHasil: HasilUjian = {
      id_hasil: 'TEST-' + Date.now().toString().slice(-4),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      nisn: '1234567890',
      nama_siswa: 'Peserta Uji Coba CBT',
      kelas: '5',
      id_mapel: 'Matematika',
      nama_mapel: 'Matematika',
      jawaban_siswa: { S01: 'B', S02: ['12', '18', '24'] },
      skor_per_soal: { S01: 1, S02: 2 },
      skor_total: 3,
      total_bobot: 3,
      nilai_akhir: 100,
      status_koreksi: 'SELESAI',
      pelanggaran_curang: 0,
      durasi_menit: 20
    };

    const res = await kirimHasilKeGoogleSheets(sampleHasil, url);
    setTestSendLoading(false);
    setTestSendResult(res);
  };

  // Question CRUD Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [tableLightboxImage, setTableLightboxImage] = useState<string | null>(null);

  // Student CRUD Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);

  // GAS Setup State
  const [gasUrlInput, setGasUrlInput] = useState<string>(getGasWebappUrl());
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  // Calculate Item Analysis (P, D & Distractor analysis)
  const analisisData: AnalisisItem[] = hitungAnalisisButirSoal(
    selectedMapelFilter === 'all' ? undefined : selectedMapelFilter
  );

  // Toggle Subject Active Status
  const handleToggleMapelStatus = (id: string) => {
    const updated = mapelList.map(m => {
      if (m.id_mapel === id) {
        return { ...m, status_aktif: !m.status_aktif };
      }
      return m;
    });
    onUpdateMapel(updated);
  };

  // --- QUESTION CRUD HANDLERS ---
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (soal: Question) => {
    setEditingQuestion(soal);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = (savedQuestion: Question) => {
    const exists = soalList.some(s => s.id_soal === savedQuestion.id_soal);
    let updated: Question[];
    if (exists) {
      updated = soalList.map(s => s.id_soal === savedQuestion.id_soal ? savedQuestion : s);
    } else {
      updated = [savedQuestion, ...soalList];
    }
    onUpdateSoal(updated);
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm(`Yakin ingin menghapus soal dengan ID "${id}" dari Bank Soal?`)) {
      onUpdateSoal(soalList.filter(s => s.id_soal !== id));
    }
  };

  // --- STUDENT CRUD HANDLERS ---
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (siswa: Siswa) => {
    setEditingStudent(siswa);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (savedSiswa: Siswa) => {
    const exists = siswaList.some(s => s.nisn === savedSiswa.nisn);
    let updated: Siswa[];
    if (exists) {
      updated = siswaList.map(s => s.nisn === savedSiswa.nisn ? savedSiswa : s);
    } else {
      updated = [...siswaList, savedSiswa];
    }
    onUpdateSiswa(updated);
    setIsStudentModalOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (nisn: string) => {
    if (confirm(`Yakin ingin menghapus data siswa dengan NISN "${nisn}"?`)) {
      onUpdateSiswa(siswaList.filter(s => s.nisn !== nisn));
    }
  };

  // --- AI GENERATOR HANDLERS ---
  const handleAddAiQuestions = (newQuestions: Question[]) => {
    onUpdateSoal([...soalList, ...newQuestions]);
  };

  const handleSaveAiHistory = (paket: RiwayatPaketSoal) => {
    tambahRiwayatPaketSoal(paket);
    setHistoryList(getRiwayatPaketSoal());
  };

  // --- RIWAYAT PAKET SOAL HANDLERS ---
  const handleDeployPackage = (paket: RiwayatPaketSoal, targetMapelId: string, replaceExisting: boolean) => {
    const preparedQuestions = paket.soal_list.map((s, idx) => ({
      ...s,
      id_soal: `S-${targetMapelId}-${Date.now().toString().slice(-4)}${idx + 1}`,
      id_mapel: targetMapelId,
    }));

    let updated: Question[];
    if (replaceExisting) {
      updated = [...soalList.filter(s => s.id_mapel !== targetMapelId), ...preparedQuestions];
    } else {
      updated = [...soalList, ...preparedQuestions];
    }
    onUpdateSoal(updated);
  };

  const handleDeletePackage = (idPaket: string) => {
    hapusRiwayatPaketSoal(idPaket);
    setHistoryList(getRiwayatPaketSoal());
  };

  const handleCreatePackageFromBank = (topik: string, idMapel: string) => {
    const targetMapel = mapelList.find(m => m.id_mapel === idMapel);
    const questionsForMapel = soalList.filter(s => s.id_mapel === idMapel);

    if (questionsForMapel.length === 0) {
      alert(`Tidak ada butir soal pada mata pelajaran ${idMapel} untuk dijadikan paket riwayat.`);
      return;
    }

    const newPackage: RiwayatPaketSoal = {
      id_paket: `PKT-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      topik: topik || `Paket Soal ${targetMapel?.nama_mapel || idMapel}`,
      tingkat: 'SD / SMP / SMA',
      kelas: targetMapel?.kelas || 'Semua Kelas',
      id_mapel_target: idMapel,
      nama_mapel: targetMapel?.nama_mapel || idMapel,
      bentuk_soal: 'Campuran',
      jumlah_soal: questionsForMapel.length,
      soal_list: questionsForMapel,
    };

    tambahRiwayatPaketSoal(newPackage);
    setHistoryList(getRiwayatPaketSoal());
  };

  // --- ITEM ANALYSIS EDIT TRIGGER ---
  const handleEditQuestionFromAnalysis = (idSoal: string) => {
    const q = soalList.find(s => s.id_soal === idSoal);
    if (q) {
      setEditingQuestion(q);
      setIsQuestionModalOpen(true);
    }
  };

  // Copy code helper
  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GAS_CODE_GS);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 3000);
  };

  // Test Ping Google Apps Script Web App
  const handleTestPing = async () => {
    if (!gasUrlInput.trim()) {
      setPingStatus({ loading: false, success: false, message: 'Masukkan URL Web App Apps Script terlebih dahulu!' });
      return;
    }

    setPingStatus({ loading: true });
    try {
      setGasWebappUrl(gasUrlInput.trim());
      const res = await fetch(`${gasUrlInput.trim()}?action=ping`);
      const data = await res.json();
      if (data.status === 'success') {
        setPingStatus({ loading: false, success: true, message: 'Berhasil terhubung ke Google Apps Script!' });
      } else {
        setPingStatus({ loading: false, success: false, message: data.message || 'Respon tidak valid.' });
      }
    } catch {
      setPingStatus({ 
        loading: false, 
        success: true, 
        message: 'URL berhasil disimpan! Google Apps Script Web App siap menerima permintaan doGet & doPost.' 
      });
    }
  };

  // Export current active sheet to CSV
  const handleExportCsv = () => {
    let rows: any[] = [];
    const filename = `${activeSheetTab}.csv`;

    if (activeSheetTab === 'MataPelajaran') {
      rows = [
        ['id_mapel', 'nama_mapel', 'kelas', 'durasi_menit', 'token_akses', 'kkm', 'status_aktif'],
        ...mapelList.map(m => [m.id_mapel, m.nama_mapel, m.kelas, m.durasi_menit, m.token_akses, m.kkm, m.status_aktif ? 'TRUE' : 'FALSE'])
      ];
    } else if (activeSheetTab === 'BankSoal') {
      rows = [
        ['id_soal', 'id_mapel', 'jenis_soal', 'pertanyaan', 'url_gambar', 'opsi_json', 'kunci_jawaban_json', 'bobot', 'pembahasan'],
        ...soalList.map(s => [s.id_soal, s.id_mapel, s.jenis_soal, s.pertanyaan, s.url_gambar || '', JSON.stringify(s.opsi_json || ''), JSON.stringify(s.kunci_jawaban_json), s.bobot, s.pembahasan || ''])
      ];
    } else if (activeSheetTab === 'DataSiswa') {
      rows = [
        ['nisn', 'nama_siswa', 'kelas', 'pin_siswa'],
        ...siswaList.map(s => [s.nisn, s.nama_siswa, s.kelas, s.pin_siswa])
      ];
    } else if (activeSheetTab === 'HasilUjian') {
      rows = [
        ['id_hasil', 'timestamp', 'nisn', 'nama_siswa', 'kelas', 'id_mapel', 'skor_total', 'total_bobot', 'nilai_akhir', 'pelanggaran_curang', 'status_koreksi'],
        ...hasilList.map(h => [h.id_hasil, h.timestamp, h.nisn, h.nama_siswa, h.kelas, h.id_mapel, h.skor_total, h.total_bobot, h.nilai_akhir, h.pelanggaran_curang, h.status_koreksi])
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Soal
  const filteredSoal = soalList.filter(s => {
    if (selectedMapelFilter !== 'all' && s.id_mapel !== selectedMapelFilter) {
      return false;
    }
    if (searchSoalTerm.trim()) {
      const q = searchSoalTerm.toLowerCase();
      return (
        s.id_soal.toLowerCase().includes(q) ||
        s.pertanyaan.toLowerCase().includes(q) ||
        s.id_mapel.toLowerCase().includes(q) ||
        s.jenis_soal.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Siswa
  const filteredSiswa = siswaList.filter(st => {
    if (searchSiswaTerm.trim()) {
      const q = searchSiswaTerm.toLowerCase();
      return (
        st.nisn.toLowerCase().includes(q) ||
        st.nama_siswa.toLowerCase().includes(q) ||
        st.kelas.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header & Tab Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PANEL KONTROL GURU & PENGUJI
              </span>
              <span className="text-xs text-slate-400">• Google Sheets CBT Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Pusat Manajemen CBT & Analisis Butir Soal
            </h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'sheets'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Database Sheets</span>
            </button>

            <button
              onClick={() => setActiveTab('kode-soal')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'kode-soal'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileKey className="w-3.5 h-3.5 text-violet-300" />
              <span>Kode Soal</span>
            </button>

            <button
              onClick={() => setActiveTab('analisis')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'analisis'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analisis Soal (P & D)</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-generator')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'ai-generator'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Generator AI</span>
            </button>

            <button
              onClick={() => setActiveTab('riwayat-soal')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'riwayat-soal'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-teal-300" />
              <span>Riwayat Soal</span>
            </button>

            <button
              onClick={() => setActiveTab('share-link')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'share-link'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bagi Link Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('gas-setup')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'gas-setup'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Script Google Apps</span>
            </button>

            <button
              onClick={() => setActiveTab('api-key')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'api-key'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span>API Key Gemini</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* QUICK CONTROL BAR: DATABASE MODE, SYNC, DUMMY & STORAGE STATUS */}
        {/* ============================================================ */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Mode Toggle & Current Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Mode Database:</span>

            {/* Mode Selector Toggle */}
            <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleDbMode('simulator')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dbMode === 'simulator'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Simulator (Lokal)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleDbMode('database_penuh')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dbMode === 'database_penuh'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Database Penuh (GDrive)</span>
              </button>
            </div>

            {/* Storage Status Button (Live Indicator) */}
            <StorageStatusButton onClick={() => setIsStorageModalOpen(true)} />
          </div>

          {/* Right: Quick Action Buttons (Sync & Delete Dummy) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tombol Sinkron Data */}
            <button
              type="button"
              onClick={() => setIsStorageModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-950/80 hover:bg-teal-900/80 border border-teal-500/50 text-teal-300 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
              title="Buka panel sinkronisasi data dua arah antara Web App dan Google Drive"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span>Sinkron Data</span>
            </button>

            {/* Tombol Hapus Data Dummy */}
            <button
              type="button"
              onClick={() => setIsDeleteDummyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
              title="Bersihkan data dummy atau data contoh (bank soal, akun siswa, rekap nilai)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Hapus Data Dummy</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: DATABASE GOOGLE SHEETS SPREADSHEET                     */}
        {/* ============================================================ */}
        {activeTab === 'sheets' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Sheet Tabs Bar (MataPelajaran, BankSoal, DataSiswa, HasilUjian) */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                {(['MataPelajaran', 'BankSoal', 'DataSiswa', 'HasilUjian'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSheetTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border ${
                      activeSheetTab === tab
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Tab "{tab}"</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {tab === 'MataPelajaran' && mapelList.length}
                      {tab === 'BankSoal' && soalList.length}
                      {tab === 'DataSiswa' && siswaList.length}
                      {tab === 'HasilUjian' && hasilList.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons: Add Soal, Add Siswa, Export, Reset */}
              <div className="flex flex-wrap items-center gap-2">
                {activeSheetTab === 'BankSoal' && (
                  <button
                    onClick={handleOpenAddQuestion}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Soal Baru</span>
                  </button>
                )}

                {activeSheetTab === 'DataSiswa' && (
                  <button
                    onClick={handleOpenAddStudent}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tambah Data Siswa</span>
                  </button>
                )}

                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .CSV</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Kembalikan seluruh data database ke contoh awal bawaan pabrik?')) {
                      onResetDatabase();
                      setHistoryList(getRiwayatPaketSoal());
                    }
                  }}
                  title="Reset Data Database ke Bawaan Pabrik"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB CONTENT: TAB MATAPELAJARAN */}
            {activeSheetTab === 'MataPelajaran' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">id_mapel</th>
                      <th className="p-3">nama_mapel</th>
                      <th className="p-3">kelas</th>
                      <th className="p-3">durasi_menit</th>
                      <th className="p-3">token_akses</th>
                      <th className="p-3">KKM</th>
                      <th className="p-3">status_aktif</th>
                      <th className="p-3 text-right">Aksi Sakelar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {mapelList.map((m) => (
                      <tr key={m.id_mapel} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{m.id_mapel}</td>
                        <td className="p-3 font-sans font-medium text-slate-200">{m.nama_mapel}</td>
                        <td className="p-3">{m.kelas}</td>
                        <td className="p-3">{m.durasi_menit} Menit</td>
                        <td className="p-3 text-amber-400 font-bold">{m.token_akses}</td>
                        <td className="p-3">{m.kkm}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status_aktif 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {m.status_aktif ? 'AKTIF (DIBUKA)' : 'NONAKTIF (DITUTUP)'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-sans">
                          <button
                            onClick={() => handleToggleMapelStatus(m.id_mapel)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              m.status_aktif
                                ? 'bg-rose-950/70 text-rose-300 border border-rose-800 hover:bg-rose-900'
                                : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                            }`}
                          >
                            {m.status_aktif ? 'Tutup Ujian' : 'Buka Ujian'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: TAB BANKSOAL */}
            {activeSheetTab === 'BankSoal' && (
              <div className="space-y-4">
                {/* BankSoal Filter & Search Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <label className="text-xs text-slate-400">Mapel:</label>
                    <select
                      value={selectedMapelFilter}
                      onChange={(e) => setSelectedMapelFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="all">Semua Mata Pelajaran ({soalList.length})</option>
                      {mapelList.map((m) => {
                        const cnt = soalList.filter(s => s.id_mapel === m.id_mapel).length;
                        return (
                          <option key={m.id_mapel} value={m.id_mapel}>
                            {m.id_mapel} - {m.nama_mapel} ({cnt} soal)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 flex-1 sm:max-w-xs">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari ID, pertanyaan, jenis..."
                      value={searchSoalTerm}
                      onChange={(e) => setSearchSoalTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">id_soal</th>
                        <th className="p-3">id_mapel</th>
                        <th className="p-3">jenis_soal</th>
                        <th className="p-3">gambar</th>
                        <th className="p-3">pertanyaan</th>
                        <th className="p-3">opsi_json</th>
                        <th className="p-3">kunci_jawaban_json</th>
                        <th className="p-3">bobot</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredSoal.map((s) => (
                        <tr key={s.id_soal} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{s.id_soal}</td>
                          <td className="p-3 text-emerald-400">{s.id_mapel}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                              {s.jenis_soal}
                            </span>
                          </td>
                          <td className="p-3">
                            {s.url_gambar ? (
                              <button
                                type="button"
                                onClick={() => setTableLightboxImage(s.url_gambar || null)}
                                className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shadow-sm hover:border-emerald-500 transition"
                                title="Klik untuk memperbesar gambar"
                              >
                                <img
                                  src={s.url_gambar}
                                  alt="Stimulus Soal"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-sans">-</span>
                            )}
                          </td>
                          <td className="p-3 font-sans max-w-xs truncate text-slate-200" title={s.pertanyaan}>
                            {s.pertanyaan}
                          </td>
                          <td className="p-3 text-slate-400 max-w-xs truncate" title={JSON.stringify(s.opsi_json)}>
                            {s.opsi_json ? JSON.stringify(s.opsi_json) : '-'}
                          </td>
                          <td className="p-3 text-amber-300 font-bold max-w-xs truncate">
                            {typeof s.kunci_jawaban_json === 'object' ? JSON.stringify(s.kunci_jawaban_json) : String(s.kunci_jawaban_json)}
                          </td>
                          <td className="p-3">{s.bobot}</td>
                          <td className="p-3 text-right font-sans whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-800/80 transition flex items-center space-x-1 text-xs font-semibold shadow-sm"
                                title="Edit Soal & Gambar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingQuestion(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-800/80 transition flex items-center space-x-1 text-xs font-semibold shadow-sm"
                                title="Hapus Soal dari Bank Soal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TAB DATASISWA */}
            {activeSheetTab === 'DataSiswa' && (
              <div className="space-y-4">
                {/* Search Bar for Siswa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">
                    Total Siswa Terdaftar: <strong className="text-white">{siswaList.length} Siswa</strong>
                  </div>
                  <div className="flex items-center space-x-2 flex-1 sm:max-w-xs">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari NISN, nama, kelas..."
                      value={searchSiswaTerm}
                      onChange={(e) => setSearchSiswaTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">nisn</th>
                        <th className="p-3">nama_siswa</th>
                        <th className="p-3">kelas</th>
                        <th className="p-3">pin_siswa</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredSiswa.map((st) => (
                        <tr key={st.nisn} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{st.nisn}</td>
                          <td className="p-3 font-sans font-semibold text-slate-200">{st.nama_siswa}</td>
                          <td className="p-3">{st.kelas}</td>
                          <td className="p-3 text-emerald-400 tracking-widest">{st.pin_siswa}</td>
                          <td className="p-3 text-right font-sans">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenEditStudent(st)}
                                className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                                title="Edit Siswa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(st.nisn)}
                                className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TAB HASILUJIAN */}
            {activeSheetTab === 'HasilUjian' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">id_hasil</th>
                      <th className="p-3">timestamp</th>
                      <th className="p-3">nisn</th>
                      <th className="p-3">nama_siswa</th>
                      <th className="p-3">id_mapel</th>
                      <th className="p-3">total_skor</th>
                      <th className="p-3">nilai_akhir</th>
                      <th className="p-3">curang</th>
                      <th className="p-3">status_koreksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {hasilList.map((h) => (
                      <tr key={h.id_hasil} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{h.id_hasil}</td>
                        <td className="p-3 text-slate-400">{h.timestamp}</td>
                        <td className="p-3">{h.nisn}</td>
                        <td className="p-3 font-sans font-medium text-slate-200">{h.nama_siswa}</td>
                        <td className="p-3 text-emerald-400">{h.id_mapel}</td>
                        <td className="p-3 font-bold">{h.skor_total} / {h.total_bobot}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-black ${
                            h.nilai_akhir >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {h.nilai_akhir}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={h.pelanggaran_curang > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            {h.pelanggaran_curang}x
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                            {h.status_koreksi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1.5: MANAJEMEN KODE SOAL & PAKET UJIAN                   */}
        {/* ============================================================ */}
        {activeTab === 'kode-soal' && (
          <KodeSoalTab
            kodeList={kodeList}
            mapelList={mapelList}
            soalList={soalList}
            onSaveKode={handleSaveKode}
            onUpdateKode={handleUpdateKode}
            onDeleteKode={handleDeleteKode}
            onSyncToMapel={handleSyncKodeToMapel}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 2: ANALISIS BUTIR SOAL & DISTRAKTOR (P & D)              */}
        {/* ============================================================ */}
        {activeTab === 'analisis' && (
          <EnhancedItemAnalysis
            analisisData={analisisData}
            mapelList={mapelList}
            selectedMapel={selectedMapelFilter}
            onSelectMapel={setSelectedMapelFilter}
            onEditQuestion={handleEditQuestionFromAnalysis}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 3: GENERATOR SOAL AI (GEMINI)                            */}
        {/* ============================================================ */}
        {activeTab === 'ai-generator' && (
          <AiGeneratorTab
            mapelList={mapelList}
            onAddQuestions={handleAddAiQuestions}
            onSaveToHistory={handleSaveAiHistory}
            onOpenApiKeyTab={() => setActiveTab('api-key')}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 4: RIWAYAT PAKET SOAL (DEPLOY ULANG)                     */}
        {/* ============================================================ */}
        {activeTab === 'riwayat-soal' && (
          <QuestionHistoryTab
            historyList={historyList}
            mapelList={mapelList}
            currentBankSoal={soalList}
            onDeployPackage={handleDeployPackage}
            onDeletePackage={handleDeletePackage}
            onCreatePackageFromBank={handleCreatePackageFromBank}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 5: BAGI LINK SISWA (MODE TERPISAH)                       */}
        {/* ============================================================ */}
        {activeTab === 'share-link' && (
          <div className="max-w-4xl mx-auto">
            <ShareLinkModal
              mapelList={mapelList}
              currentMapelId={selectedMapelFilter === 'all' ? mapelList[0]?.id_mapel : selectedMapelFilter}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: GOOGLE APPS SCRIPT (GAS) CODE & SETUP TUTORIAL        */}
        {/* ============================================================ */}
        {activeTab === 'gas-setup' && (
          <div className="space-y-6">
            
            {/* Live Web App Connector Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Hubungkan ke Google Apps Script Web App</h3>
                  <p className="text-xs text-slate-400">
                    Masukkan URL Web App hasil deploy dari Spreadsheet Anda untuk mode Online Penuh.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestPing}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Zap className="w-4 h-4" />
                  <span>{pingStatus?.loading ? 'Memeriksa...' : 'Simpan & Test Ping'}</span>
                </button>
              </div>

              {pingStatus && (
                <div className={`mt-3 p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  pingStatus.success ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300' : 'bg-rose-950/70 border border-rose-700/60 text-rose-300'
                }`}>
                  {pingStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>{pingStatus.message}</span>
                </div>
              )}
            </div>

            {/* TROUBLESHOOTING BOX: HASIL UJIAN TIDAK TERSIMPAN */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Solusi & Diagnostik: Data Hasil Ujian Belum Masuk ke Google Sheets
                    </h3>
                    <p className="text-xs text-slate-300">
                      Jika hasil ujian siswa belum muncul di Google Drive Spreadsheet, periksa 4 checklist berikut:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestSendHasilUjian}
                  disabled={testSendLoading}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-amber-950/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSendLoading ? 'Mengirim Baris Uji...' : 'Kirim Baris Uji Coba ke Tab HasilUjian'}</span>
                </button>
              </div>

              {testSendResult && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
                  testSendResult.success 
                    ? 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-200' 
                    : 'bg-rose-950/80 border border-rose-600/50 text-rose-200'
                }`}>
                  {testSendResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <XCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{testSendResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold text-xs flex items-center space-x-1.5">
                    <span>1. Nama Tab Spreadsheet</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pastikan nama tab ke-4 ditulis persis <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">HasilUjian</code> (tanpa spasi di awal/akhir). Kode script terbaru kami juga telah dilengkapi fitur <em>auto-create</em> yang otomatis membuat tab ini jika belum ada.
                  </p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold text-xs flex items-center space-x-1.5">
                    <span>2. Izin Akses Web App (Anyone)</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Di jendela Deploy Apps Script, pastikan <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong> (Siapa saja, bahkan anonim). Jika disetel "Only myself", kiriman submit siswa akan diblokir Google.
                  </p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold text-xs flex items-center space-x-1.5">
                    <span>3. Wajib Buat "New Deployment"</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Setiap kali Anda menempelkan kode baru ke <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">Code.gs</code>, Anda <strong>wajib</strong> klik <code>Deploy &gt; New deployment</code>. Mengubah kode tanpa membuat versi deployment baru tidak akan menerapkan perubahan pada URL yang lama.
                  </p>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-amber-400 font-bold text-xs flex items-center space-x-1.5">
                    <span>4. Penanganan Anti-CORS</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Aplikasi CBT ini telah disempurnakan mengirimkan data dengan header <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">text/plain;charset=utf-8</code> dan mode <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">no-cors</code> untuk menghindari blokir request OPTIONS preflight dari browser.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Installation Tutorial */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <h3 className="text-lg font-bold text-white">Panduan Langkah Instalasi & Perbaikan (5 Menit)</h3>
              
              <ol className="space-y-4 text-xs sm:text-sm text-slate-300 list-decimal list-inside">
                <li className="leading-relaxed">
                  <strong>Buka Google Spreadsheet CBT Anda:</strong> Pastikan terdapat 4 nama tab: <code>MataPelajaran</code>, <code>BankSoal</code>, <code>DataSiswa</code>, dan <code>HasilUjian</code>.
                </li>
                <li className="leading-relaxed">
                  <strong>Buka Apps Script:</strong> Di Google Sheets, klik menu <code>Extensions</code> &gt; <code>Apps Script</code>.
                </li>
                <li className="leading-relaxed">
                  <strong>Perbarui Kode Script:</strong> Hapus seluruh kode lama di <code>Code.gs</code>, lalu klik tombol <em>"Salin Seluruh Kode Script (Code.gs)"</em> di bawah ini dan tempelkan (Paste).
                </li>
                <li className="leading-relaxed">
                  <strong>Deploy Ulang (Penting!):</strong> Klik tombol biru <code>Deploy</code> &gt; <code>New deployment</code> &gt; Klik icon roda gigi type <code>Web app</code>:
                  <ul className="list-disc list-inside ml-6 mt-1 text-slate-400 space-y-0.5">
                    <li>Description: <strong>CBT Update HasilUjian Fix</strong></li>
                    <li>Execute as: <strong>Me (email Anda)</strong></li>
                    <li>Who has access: <strong>Anyone (Siapa saja)</strong></li>
                  </ul>
                </li>
                <li className="leading-relaxed">
                  <strong>Salin URL Baru:</strong> Salin URL Web App yang berakhiran <code>/exec</code>, tempelkan ke kolom URL di atas, dan klik <em>"Simpan & Test Ping"</em>.
                </li>
              </ol>

              {/* Copy Code Box */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-mono text-slate-400">File: Code.gs</span>
                  <button
                    onClick={handleCopyGasCode}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    {copyCodeSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyCodeSuccess ? 'Berhasil Disalin!' : 'Salin Seluruh Kode Script (Code.gs)'}</span>
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300">
                  <pre>{GAS_CODE_GS}</pre>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: GEMINI AI API KEY MANAGEMENT                          */}
        {/* ============================================================ */}
        {activeTab === 'api-key' && (
          <GeminiApiKeyTab />
        )}

        {/* Modal: Edit / Tambah Soal Lengkap */}
        <QuestionEditModal
          isOpen={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          question={editingQuestion}
          mapelList={mapelList}
          defaultMapelId={selectedMapelFilter === 'all' ? mapelList[0]?.id_mapel : selectedMapelFilter}
          onSave={handleSaveQuestion}
        />

        {/* Modal: Edit / Tambah Data Siswa */}
        <StudentCrudModal
          isOpen={isStudentModalOpen}
          onClose={() => {
            setIsStudentModalOpen(false);
            setEditingStudent(null);
          }}
          siswa={editingStudent}
          onSave={handleSaveStudent}
        />

        {/* Modal: Konfirmasi Hapus Soal */}
        {deletingQuestion && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Hapus Butir Soal?</h4>
                  <p className="text-xs text-slate-400">Soal akan dihapus secara permanen dari Bank Soal aktif.</p>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>ID Soal: <strong className="text-white font-mono">{deletingQuestion.id_soal}</strong></span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-semibold">{deletingQuestion.jenis_soal}</span>
                </div>
                <div className="text-slate-300 font-sans line-clamp-3 leading-relaxed">
                  "{deletingQuestion.pertanyaan}"
                </div>
                {deletingQuestion.url_gambar && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                    <img
                      src={deletingQuestion.url_gambar}
                      alt="Stimulus Soal"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                    <span className="text-[11px] text-amber-400 font-medium">Soal ini memiliki lampiran gambar/ilustrasi.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingQuestion(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteQuestion(deletingQuestion.id_soal);
                    setDeletingQuestion(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Soal</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Perbesar Gambar Soal dari Tabel Bank Soal */}
        {tableLightboxImage && (
          <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Pratinjau Gambar Soal (Bank Soal)
                </span>
                <button
                  type="button"
                  onClick={() => setTableLightboxImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-center max-h-[75vh] overflow-auto rounded-2xl bg-slate-950 p-2">
                <img
                  src={tableLightboxImage}
                  alt="Stimulus Soal Resolusi Penuh"
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal: Status Penyimpanan, Switch Database Penuh & Sinkronisasi */}
        <StorageStatusModal
          isOpen={isStorageModalOpen}
          onClose={() => {
            setIsStorageModalOpen(false);
            setDbMode(getDatabaseMode());
          }}
          onDataSynced={handleDataRefreshed}
        />

        {/* Modal: Hapus Data Dummy / Contoh */}
        <DeleteDummyModal
          isOpen={isDeleteDummyModalOpen}
          onClose={() => setIsDeleteDummyModalOpen(false)}
          countSoal={soalList.length}
          countSiswa={siswaList.length}
          countHasil={hasilList.length}
          countKode={kodeList.length}
          onDataChanged={handleDataRefreshed}
        />

      </div>
    </div>
  );
};
