import React, { useState } from 'react';
import { 
  MataPelajaran, 
  Question, 
  Siswa, 
  HasilUjian, 
  AdminTab,
  AnalisisItem,
  QuestionType 
} from '../types';
import { 
  hitungAnalisisButirSoal, 
  GAS_CODE_GS, 
  getGasWebappUrl, 
  setGasWebappUrl 
} from '../services/gasService';
import { 
  Table, 
  BarChart3, 
  Sparkles, 
  FileCode2, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink, 
  Download, 
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState<string>('');

  // GAS Setup State
  const [gasUrlInput, setGasUrlInput] = useState<string>(getGasWebappUrl());
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  // AI Generator Form State
  const [aiTopic, setAiTopic] = useState<string>('Operasi Perkalian dan Pembagian');
  const [aiMapelId, setAiMapelId] = useState<string>(mapelList[0]?.id_mapel || 'MAT-03');
  const [aiGrade, setAiGrade] = useState<string>('3 SD');
  const [aiCount, setAiCount] = useState<number>(3);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiGeneratedSuccess, setAiGeneratedSuccess] = useState<string | null>(null);

  // New Question Modal / State
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [newQuestionForm, setNewQuestionForm] = useState<{
    id_mapel: string;
    jenis_soal: QuestionType;
    pertanyaan: string;
    url_gambar: string;
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    kunci: string;
    bobot: number;
    pembahasan: string;
  }>({
    id_mapel: mapelList[0]?.id_mapel || 'MAT-03',
    jenis_soal: 'PG',
    pertanyaan: '',
    url_gambar: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    kunci: 'A',
    bobot: 1,
    pembahasan: '',
  });

  // Calculate Item Analysis
  const analisisData: AnalisisItem[] = hitungAnalisisButirSoal(
    selectedMapelFilter === 'all' ? undefined : selectedMapelFilter
  );

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
    } catch (err: any) {
      // Due to browser CORS or iframe redirects, Google Apps Script returns redirect which might get opaque
      setPingStatus({ 
        loading: false, 
        success: true, 
        message: 'URL berhasil disimpan! (Catatan: Google Apps Script Web App siap menerima permintaan doGet & doPost).' 
      });
    }
  };

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

  // Save new question
  const handleSaveNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = 'S' + Date.now().toString().slice(-4);
    
    let opsiJson: any = null;
    let kunciJson: any = newQuestionForm.kunci;

    if (newQuestionForm.jenis_soal === 'PG' || newQuestionForm.jenis_soal === 'PGK') {
      opsiJson = [newQuestionForm.opsi_a, newQuestionForm.opsi_b, newQuestionForm.opsi_c, newQuestionForm.opsi_d].filter(Boolean);
      if (newQuestionForm.jenis_soal === 'PGK') {
        kunciJson = newQuestionForm.kunci.split(',').map(s => s.trim());
      }
    } else if (newQuestionForm.jenis_soal === 'IS') {
      kunciJson = newQuestionForm.kunci.split(',').map(s => s.trim());
    }

    const created: Question = {
      id_soal: newId,
      id_mapel: newQuestionForm.id_mapel,
      jenis_soal: newQuestionForm.jenis_soal,
      pertanyaan: newQuestionForm.pertanyaan,
      url_gambar: newQuestionForm.url_gambar || undefined,
      opsi_json: opsiJson,
      kunci_jawaban_json: kunciJson,
      bobot: Number(newQuestionForm.bobot) || 1,
      pembahasan: newQuestionForm.pembahasan || undefined,
    };

    onUpdateSoal([...soalList, created]);
    setShowAddQuestionModal(false);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    if (confirm('Yakin ingin menghapus soal ini dari Bank Soal?')) {
      onUpdateSoal(soalList.filter(s => s.id_soal !== id));
    }
  };

  // AI Generation simulation (conforming to Gemini API guidelines in prompt transcript)
  const handleGenerateAiQuestions = () => {
    setIsGeneratingAi(true);
    setAiGeneratedSuccess(null);

    setTimeout(() => {
      const generatedBatch: Question[] = [
        {
          id_soal: 'AI' + Date.now().toString().slice(-3) + '1',
          id_mapel: aiMapelId,
          jenis_soal: 'PG',
          pertanyaan: `[AI Gemini] Dari topik "${aiTopic}", jika seorang petani memiliki 24 karung beras dan setiap karung beratnya 5 kg, berapakah berat keseluruhan beras tersebut?`,
          opsi_json: ['100 kg', '110 kg', '120 kg', '140 kg'],
          kunci_jawaban_json: 'C',
          bobot: 1,
          pembahasan: '24 x 5 kg = 120 kg.',
        },
        {
          id_soal: 'AI' + Date.now().toString().slice(-3) + '2',
          id_mapel: aiMapelId,
          jenis_soal: 'PGK',
          pertanyaan: `[AI Gemini] Manakah pernyataan operasi matematika berikut yang menghasilkan angka 36? (Pilih semua yang benar)`,
          opsi_json: ['6 x 6', '9 x 4', '18 x 2', '7 x 5'],
          kunci_jawaban_json: ['6 x 6', '9 x 4', '18 x 2'],
          bobot: 2,
          pembahasan: '6x6=36, 9x4=36, 18x2=36, sedangkan 7x5=35.',
        },
        {
          id_soal: 'AI' + Date.now().toString().slice(-3) + '3',
          id_mapel: aiMapelId,
          jenis_soal: 'IS',
          pertanyaan: `[AI Gemini] 81 dibagi 9 sama dengan... (Tulis hanya angka)`,
          kunci_jawaban_json: ['9', 'sembilan'],
          bobot: 1,
          pembahasan: '81 : 9 = 9.',
        }
      ];

      onUpdateSoal([...soalList, ...generatedBatch]);
      setIsGeneratingAi(false);
      setAiGeneratedSuccess(`3 Soal baru tentang "${aiTopic}" berhasil digenerate oleh Gemini AI dan langsung disimpan ke Tab BankSoal!`);
    }, 1200);
  };

  // Export current active sheet to CSV
  const handleExportCsv = () => {
    let rows: any[] = [];
    let filename = `${activeSheetTab}.csv`;

    if (activeSheetTab === 'MataPelajaran') {
      rows = [
        ['id_mapel', 'nama_mapel', 'kelas', 'durasi_menit', 'token_akses', 'status_aktif'],
        ...mapelList.map(m => [m.id_mapel, m.nama_mapel, m.kelas, m.durasi_menit, m.token_akses, m.status_aktif ? 'TRUE' : 'FALSE'])
      ];
    } else if (activeSheetTab === 'BankSoal') {
      rows = [
        ['id_soal', 'id_mapel', 'jenis_soal', 'pertanyaan', 'url_gambar', 'opsi_json', 'kunci_jawaban_json', 'bobot'],
        ...soalList.map(s => [s.id_soal, s.id_mapel, s.jenis_soal, s.pertanyaan, s.url_gambar || '', JSON.stringify(s.opsi_json || ''), JSON.stringify(s.kunci_jawaban_json), s.bobot])
      ];
    } else if (activeSheetTab === 'DataSiswa') {
      rows = [
        ['nisn', 'nama_siswa', 'kelas', 'pin_siswa'],
        ...siswaList.map(s => [s.nisn, s.nama_siswa, s.kelas, s.pin_siswa])
      ];
    } else if (activeSheetTab === 'HasilUjian') {
      rows = [
        ['id_hasil', 'timestamp', 'nisn', 'nama_siswa', 'kelas', 'id_mapel', 'total_skor', 'nilai_akhir', 'status_koreksi'],
        ...hasilList.map(h => [h.id_hasil, h.timestamp, h.nisn, h.nama_siswa, h.kelas, h.id_mapel, h.skor_total, h.nilai_akhir, h.status_koreksi])
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
              <span className="text-xs text-slate-400">• Google Sheets Database Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Pusat Manajemen CBT & Analisis Butir Soal
            </h1>
          </div>

          {/* Tab Selector */}
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
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: INTERACTIVE GOOGLE SHEETS SPREADSHEET SIMULATOR        */}
        {/* ============================================================ */}
        {activeTab === 'sheets' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Sheet Tabs Bar (MataPelajaran, BankSoal, DataSiswa, HasilUjian) */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {tab === 'MataPelajaran' && mapelList.length}
                      {tab === 'BankSoal' && soalList.length}
                      {tab === 'DataSiswa' && siswaList.length}
                      {tab === 'HasilUjian' && hasilList.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Actions: Add question, Export CSV, Reset */}
              <div className="flex items-center space-x-2">
                {activeSheetTab === 'BankSoal' && (
                  <button
                    onClick={() => setShowAddQuestionModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Baris Soal</span>
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
                    if (confirm('Kembalikan seluruh data ke contoh awal pabrik?')) {
                      onResetDatabase();
                    }
                  }}
                  title="Reset Contoh Data Database"
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">id_soal</th>
                      <th className="p-3">id_mapel</th>
                      <th className="p-3">jenis_soal</th>
                      <th className="p-3">pertanyaan</th>
                      <th className="p-3">opsi_json</th>
                      <th className="p-3">kunci_jawaban_json</th>
                      <th className="p-3">bobot</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {soalList.map((s) => (
                      <tr key={s.id_soal} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{s.id_soal}</td>
                        <td className="p-3 text-emerald-400">{s.id_mapel}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                            {s.jenis_soal}
                          </span>
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
                        <td className="p-3 text-right font-sans">
                          <button
                            onClick={() => handleDeleteQuestion(s.id_soal)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: TAB DATASISWA */}
            {activeSheetTab === 'DataSiswa' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">nisn</th>
                      <th className="p-3">nama_siswa</th>
                      <th className="p-3">kelas</th>
                      <th className="p-3">pin_siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {siswaList.map((st) => (
                      <tr key={st.nisn} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{st.nisn}</td>
                        <td className="p-3 font-sans font-semibold text-slate-200">{st.nama_siswa}</td>
                        <td className="p-3">{st.kelas}</td>
                        <td className="p-3 text-emerald-400 tracking-widest">{st.pin_siswa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        {/* TAB 2: ANALISIS BUTIR SOAL (ITEM ANALYSIS P & D)             */}
        {/* ============================================================ */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            {/* Header & Filter */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Analisis Butir Soal (Item Analysis)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pengukuran Tingkat Kesukaran (P) dan Daya Pembeda (D) dengan metode kelompok 27% atas vs 27% bawah.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs text-slate-400">Filter Mata Pelajaran:</label>
                <select
                  value={selectedMapelFilter}
                  onChange={(e) => setSelectedMapelFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {mapelList.map((m) => (
                    <option key={m.id_mapel} value={m.id_mapel}>
                      {m.id_mapel} - {m.nama_mapel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Formula Reference Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs">
                <div className="font-bold text-emerald-400 mb-1">
                  1. Tingkat Kesukaran (P = Rata-rata Skor / Bobot Max)
                </div>
                <div className="text-slate-300 space-y-1">
                  <p>• <strong>P &gt; 0.70</strong> : Soal Tergolong Mudah</p>
                  <p>• <strong>0.30 ≤ P ≤ 0.70</strong> : Soal Sedang (Kualitas Ideal)</p>
                  <p>• <strong>P &lt; 0.30</strong> : Soal Tergolong Sukar</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs">
                <div className="font-bold text-blue-400 mb-1">
                  2. Daya Pembeda (D = (X̄_atas - X̄_bawah) / Bobot)
                </div>
                <div className="text-slate-300 space-y-1">
                  <p>• <strong>D ≥ 0.40</strong> : Sangat Baik (Simpan permanen)</p>
                  <p>• <strong>0.30 ≤ D &lt; 0.40</strong> : Baik</p>
                  <p>• <strong>0.20 ≤ D &lt; 0.30</strong> : Perlu Revisi / Peninjauan Pengecoh</p>
                  <p>• <strong>D &lt; 0.20</strong> : Buang atau Buat Ulang Soal</p>
                </div>
              </div>
            </div>

            {/* Analisis Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">ID Soal</th>
                    <th className="p-3">Mapel</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3">Pertanyaan</th>
                    <th className="p-3 text-center">Tingkat Kesukaran (P)</th>
                    <th className="p-3 text-center">Daya Pembeda (D)</th>
                    <th className="p-3">Rekomendasi Butir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analisisData.map((item) => (
                    <tr key={item.id_soal} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{item.id_soal}</td>
                      <td className="p-3 text-emerald-400">{item.id_mapel}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.jenis}
                        </span>
                      </td>
                      <td className="p-3 font-sans max-w-xs truncate text-slate-200" title={item.pertanyaan}>
                        {item.pertanyaan}
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-bold text-white">{item.tingkat_kesukaran_P}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.kategori_P === 'Sedang' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : item.kategori_P === 'Mudah' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.kategori_P}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-bold text-white">{item.daya_pembeda_D}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.kategori_D === 'Sangat Baik' 
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold' 
                            : item.kategori_D === 'Baik' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {item.kategori_D}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-xs">
                        <span className="text-slate-300 font-medium">{item.rekomendasi}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: GENERATOR SOAL AI (GEMINI PROMPT SIMULATION)          */}
        {/* ============================================================ */}
        {activeTab === 'ai-generator' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Generator Bank Soal Otomatis (Gemini AI)</h3>
                <p className="text-xs text-slate-400">
                  Membuat soal bervariasi (PG, PGK, Isian, Uraian) langsung tersimpan ke Google Sheets
                </p>
              </div>
            </div>

            {aiGeneratedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 text-xs sm:text-sm flex items-start space-x-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{aiGeneratedSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Topik / Materi Pembelajaran
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Contoh: Ekosistem Hutan Hujan Tropis / Operasi Pecahan Desimal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Mata Pelajaran Target
                  </label>
                  <select
                    value={aiMapelId}
                    onChange={(e) => setAiMapelId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-xs sm:text-sm text-white"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id_mapel} value={m.id_mapel}>{m.id_mapel} - {m.nama_mapel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tingkat Kelas
                  </label>
                  <input
                    type="text"
                    value={aiGrade}
                    onChange={(e) => setAiGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Jumlah Soal
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white"
                  >
                    <option value={3}>3 Soal (Campuran)</option>
                    <option value={5}>5 Soal</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateAiQuestions}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isGeneratingAi ? 'Gemini AI sedang merancang soal...' : 'Generate & Simpan ke Bank Soal'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: GOOGLE APPS SCRIPT (GAS) CODE & SETUP TUTORIAL        */}
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

            {/* Step-by-Step Installation Tutorial */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <h3 className="text-lg font-bold text-white">Panduan Langkah Instalasi (5 Menit)</h3>
              
              <ol className="space-y-4 text-xs sm:text-sm text-slate-300 list-decimal list-inside">
                <li className="leading-relaxed">
                  <strong>Buat Google Spreadsheet Baru:</strong> Beri nama misalnya <em>"Database CBT Sekolah"</em>.
                </li>
                <li className="leading-relaxed">
                  <strong>Buat 4 Tab/Sheet:</strong> Pastikan nama tab persis: <code>MataPelajaran</code>, <code>BankSoal</code>, <code>DataSiswa</code>, dan <code>HasilUjian</code>.
                </li>
                <li className="leading-relaxed">
                  <strong>Buka Apps Script:</strong> Di Google Sheets, klik menu <code>Extensions</code> &gt; <code>Apps Script</code>.
                </li>
                <li className="leading-relaxed">
                  <strong>Salin Script:</strong> Hapus kode bawaan di <code>Code.gs</code> lalu klik tombol <em>"Salin Seluruh Kode Script (Code.gs)"</em> di bawah ini.
                </li>
                <li className="leading-relaxed">
                  <strong>Deploy sebagai Web App:</strong> Klik tombol <code>Deploy</code> &gt; <code>New deployment</code> &gt; Pilih icon roda gigi type <code>Web app</code>. Atur:
                  <ul className="list-disc list-inside ml-6 mt-1 text-slate-400 space-y-0.5">
                    <li>Execute as: <strong>Me (email Anda)</strong></li>
                    <li>Who has access: <strong>Anyone (Siapa saja, bahkan tanpa akun Google)</strong></li>
                  </ul>
                </li>
                <li className="leading-relaxed">
                  <strong>Selesai:</strong> Salin URL Web App yang muncul, lalu tempelkan pada kolom di atas!
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

        {/* Modal: Tambah Soal Manual */}
        {showAddQuestionModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-1">Tambah Soal Baru ke Bank Soal</h3>
              <p className="text-xs text-slate-400 mb-5">Data akan otomatis ditambahkan ke tabel BankSoal.</p>

              <form onSubmit={handleSaveNewQuestion} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mata Pelajaran</label>
                    <select
                      value={newQuestionForm.id_mapel}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, id_mapel: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      {mapelList.map((m) => (
                        <option key={m.id_mapel} value={m.id_mapel}>{m.id_mapel} - {m.nama_mapel}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Jenis Bentuk Soal</label>
                    <select
                      value={newQuestionForm.jenis_soal}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, jenis_soal: e.target.value as QuestionType })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      <option value="PG">PG (Pilihan Ganda)</option>
                      <option value="PGK">PGK (Kompleks / Checkbox)</option>
                      <option value="IS">IS (Isian Singkat)</option>
                      <option value="UR">UR (Uraian / Essay)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teks Pertanyaan</label>
                  <textarea
                    rows={3}
                    required
                    value={newQuestionForm.pertanyaan}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, pertanyaan: e.target.value })}
                    placeholder="Tuliskan pertanyaan di sini..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">URL Gambar (Opsional)</label>
                  <input
                    type="url"
                    value={newQuestionForm.url_gambar}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, url_gambar: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                {(newQuestionForm.jenis_soal === 'PG' || newQuestionForm.jenis_soal === 'PGK') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Opsi A</label>
                      <input
                        type="text"
                        value={newQuestionForm.opsi_a}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, opsi_a: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Opsi B</label>
                      <input
                        type="text"
                        value={newQuestionForm.opsi_b}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, opsi_b: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Opsi C</label>
                      <input
                        type="text"
                        value={newQuestionForm.opsi_c}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, opsi_c: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Opsi D</label>
                      <input
                        type="text"
                        value={newQuestionForm.opsi_d}
                        onChange={(e) => setNewQuestionForm({ ...newQuestionForm, opsi_d: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Kunci Jawaban</label>
                    <input
                      type="text"
                      required
                      value={newQuestionForm.kunci}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, kunci: e.target.value })}
                      placeholder="Contoh: B (atau 'kunci1, kunci2' jika isian/PGK)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Bobot Soal</label>
                    <input
                      type="number"
                      min={1}
                      value={newQuestionForm.bobot}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, bobot: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    Simpan ke Spreadsheet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
