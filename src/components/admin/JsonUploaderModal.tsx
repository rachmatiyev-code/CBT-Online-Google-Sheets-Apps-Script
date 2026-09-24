import React, { useState, useRef } from 'react';
import { MataPelajaran, Question, Siswa, HasilUjian } from '../../types';
import { 
  X, 
  UploadCloud, 
  FileCode2, 
  Folder, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sparkles, 
  Layers, 
  Users, 
  BookOpen, 
  RefreshCw,
  HardDrive,
  Cloud,
  Check,
  Info,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { 
  detectJsonCategory, 
  validateCbtJsonData, 
  downloadStarterTemplate, 
  JsonCategory,
  buildCurrentCbtBundle,
  downloadJsonFile
} from '../../utils/folderInitializer';
import { 
  unggahDataKeGoogleSheets, 
  inisialisasiFolderGdrive,
  verifikasiPenyimpananBackend,
  saveMataPelajaran,
  saveBankSoal,
  saveSiswa,
  saveHasilUjian
} from '../../services/gasService';

interface JsonUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapelList: MataPelajaran[];
  soalList: Question[];
  siswaList: Siswa[];
  hasilList: HasilUjian[];
  gasUrl: string;
  onDataUpdated: (data: {
    mapel?: MataPelajaran[];
    soal?: Question[];
    siswa?: Siswa[];
    hasil?: HasilUjian[];
  }) => void;
}

export const JsonUploaderModal: React.FC<JsonUploaderModalProps> = ({
  isOpen,
  onClose,
  mapelList,
  soalList,
  siswaList,
  hasilList,
  gasUrl,
  onDataUpdated
}) => {
  const [activeFolderCategory, setActiveFolderCategory] = useState<JsonCategory>('unknown');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [detectedCategory, setDetectedCategory] = useState<JsonCategory>('unknown');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    count: number;
    sampleName?: string;
  } | null>(null);

  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [syncToGdrive, setSyncToGdrive] = useState<boolean>(Boolean(gasUrl));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; details?: any } | null>(null);
  const [isInitializingGdrive, setIsInitializingGdrive] = useState<boolean>(false);
  const [isVerifyingStorage, setIsVerifyingStorage] = useState<boolean>(false);
  const [showTroubleshootingGuide, setShowTroubleshootingGuide] = useState<boolean>(false);
  const [verificationReport, setVerificationReport] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setStatusFeedback(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        setParsedData(json);

        const detected = detectJsonCategory(json);
        setDetectedCategory(detected);

        const categoryToValidate = activeFolderCategory !== 'unknown' ? activeFolderCategory : detected;
        const validRes = validateCbtJsonData(categoryToValidate, json);
        setValidationResult(validRes);
      } catch (err: any) {
        setParsedData(null);
        setValidationResult({
          valid: false,
          message: `Gagal membaca format JSON: ${err.message}`,
          count: 0
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplyData = async () => {
    if (!parsedData || !validationResult?.valid) return;

    setIsProcessing(true);
    setStatusFeedback(null);

    try {
      const finalCategory = activeFolderCategory !== 'unknown' ? activeFolderCategory : detectedCategory;
      let newMapel = [...mapelList];
      let newSoal = [...soalList];
      let newSiswa = [...siswaList];
      let newHasil = [...hasilList];

      if (finalCategory === 'bundle') {
        // Multi-folder bundle
        let inMapel: MataPelajaran[] = [];
        let inSoal: Question[] = [];
        let inSiswa: Siswa[] = [];
        let inHasil: HasilUjian[] = [];

        if (parsedData.folders) {
          inMapel = parsedData.folders['soal/']?.['mapel.json'] || [];
          inSoal = parsedData.folders['soal/']?.['soal.json'] || [];
          inSiswa = parsedData.folders['siswa/']?.['siswa.json'] || [];
          inHasil = parsedData.folders['hasil/']?.['hasil.json'] || [];
        } else {
          inMapel = parsedData.mapel || parsedData.mapelList || [];
          inSoal = parsedData.soal || parsedData.soalList || [];
          inSiswa = parsedData.siswa || parsedData.siswaList || [];
          inHasil = parsedData.hasil || parsedData.hasilList || [];
        }

        if (importMode === 'replace') {
          if (inMapel.length > 0) newMapel = inMapel;
          if (inSoal.length > 0) newSoal = inSoal;
          if (inSiswa.length > 0) newSiswa = inSiswa;
          if (inHasil.length > 0) newHasil = inHasil;
        } else {
          // Merge unique by ID
          if (inMapel.length > 0) {
            const existingIds = new Set(newMapel.map(m => m.id_mapel));
            const toAdd = inMapel.filter(m => !existingIds.has(m.id_mapel));
            newMapel = [...newMapel, ...toAdd];
          }
          if (inSoal.length > 0) {
            const existingIds = new Set(newSoal.map(s => s.id_soal));
            const toAdd = inSoal.filter(s => !existingIds.has(s.id_soal));
            newSoal = [...newSoal, ...toAdd];
          }
          if (inSiswa.length > 0) {
            const existingNisns = new Set(newSiswa.map(s => s.nisn));
            const toAdd = inSiswa.filter(s => !existingNisns.has(s.nisn));
            newSiswa = [...newSiswa, ...toAdd];
          }
          if (inHasil.length > 0) {
            const existingHIds = new Set(newHasil.map(h => h.id_hasil));
            const toAdd = inHasil.filter(h => !existingHIds.has(h.id_hasil));
            newHasil = [...newHasil, ...toAdd];
          }
        }

        saveMataPelajaran(newMapel);
        saveBankSoal(newSoal);
        saveSiswa(newSiswa);
        saveHasilUjian(newHasil);

        onDataUpdated({ mapel: newMapel, soal: newSoal, siswa: newSiswa, hasil: newHasil });
      } else if (finalCategory === 'soal') {
        const incoming: Question[] = parsedData;
        if (importMode === 'replace') {
          newSoal = incoming;
        } else {
          const existingIds = new Set(newSoal.map(s => s.id_soal));
          const toAdd = incoming.filter(s => !existingIds.has(s.id_soal));
          newSoal = [...newSoal, ...toAdd];
        }
        saveBankSoal(newSoal);
        onDataUpdated({ soal: newSoal });
      } else if (finalCategory === 'mapel') {
        const incoming: MataPelajaran[] = parsedData;
        if (importMode === 'replace') {
          newMapel = incoming;
        } else {
          const existingIds = new Set(newMapel.map(m => m.id_mapel));
          const toAdd = incoming.filter(m => !existingIds.has(m.id_mapel));
          newMapel = [...newMapel, ...toAdd];
        }
        saveMataPelajaran(newMapel);
        onDataUpdated({ mapel: newMapel });
      } else if (finalCategory === 'siswa') {
        const incoming: Siswa[] = parsedData;
        if (importMode === 'replace') {
          newSiswa = incoming;
        } else {
          const existingNisns = new Set(newSiswa.map(s => s.nisn));
          const toAdd = incoming.filter(s => !existingNisns.has(s.nisn));
          newSiswa = [...newSiswa, ...toAdd];
        }
        saveSiswa(newSiswa);
        onDataUpdated({ siswa: newSiswa });
      } else if (finalCategory === 'hasil') {
        // Support either an array of HasilUjian or single object
        const incoming: HasilUjian[] = Array.isArray(parsedData) ? parsedData : [parsedData];
        if (importMode === 'replace') {
          newHasil = incoming;
        } else {
          const existingHIds = new Set(newHasil.map(h => h.id_hasil));
          const toAdd = incoming.filter(h => !existingHIds.has(h.id_hasil));
          newHasil = [...newHasil, ...toAdd];
        }
        saveHasilUjian(newHasil);
        onDataUpdated({ hasil: newHasil });
      }

      let extraMsg = '';
      if (syncToGdrive && gasUrl.trim()) {
        const uploadRes = await unggahDataKeGoogleSheets(gasUrl);
        if (uploadRes.success) {
          extraMsg = ` [Backend Google Drive]: ${uploadRes.message}`;
        } else {
          extraMsg = ` [Peringatan Backend]: ${uploadRes.message}`;
        }
      }

      setStatusFeedback({
        type: 'success',
        message: `Berhasil menerapkan berkas JSON ke sistem! (${validationResult.count} data diproses).${extraMsg}`
      });

      setSelectedFile(null);
      setParsedData(null);
      setValidationResult(null);
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        message: `Terjadi kendala saat menyimpan data: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunStorageVerification = async () => {
    if (!gasUrl.trim()) {
      setStatusFeedback({
        type: 'error',
        message: 'URL Google Apps Script belum diisi pada pengaturan database.'
      });
      return;
    }

    setIsVerifyingStorage(true);
    setStatusFeedback(null);
    setVerificationReport(null);

    try {
      const res = await verifikasiPenyimpananBackend(gasUrl);
      if (res.success && res.data) {
        setVerificationReport(res.data);
        setStatusFeedback({
          type: 'success',
          message: 'Verifikasi server berhasil! Berkas terkonfirmasi aktif di Google Drive.'
        });
      } else {
        setStatusFeedback({
          type: 'warning',
          message: res.message || 'Server Google Apps Script tidak menemukan struktur folder yang diharapkan.'
        });
      }
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        message: `Gagal memverifikasi penyimpanan Google Drive: ${err.message}`
      });
    } finally {
      setIsVerifyingStorage(false);
    }
  };

  const handleInitGdriveFolders = async () => {
    if (!gasUrl.trim()) {
      setStatusFeedback({
        type: 'error',
        message: 'URL Google Apps Script belum diatur pada Pengaturan Database.'
      });
      return;
    }

    setIsInitializingGdrive(true);
    setStatusFeedback(null);
    try {
      const res = await inisialisasiFolderGdrive(gasUrl);
      if (res.success) {
        setStatusFeedback({
          type: 'success',
          message: res.message
        });
      } else {
        setStatusFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        message: `Gagal inisialisasi folder: ${err.message}`
      });
    } finally {
      setIsInitializingGdrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Unggah Berkas JSON ke Sistem</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Folder "CBT Online"
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Impor data soal, siswa, mata pelajaran, atau hasil ujian massal sesuai struktur subfolder Google Drive.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Structure Guide Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
              <Folder className="w-4 h-4" />
              <span>Struktur Berkas "CBT Online" (Google Drive):</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTroubleshootingGuide(!showTroubleshootingGuide)}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 underline cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showTroubleshootingGuide ? 'Tutup Panduan Server' : 'Panduan Mengapa File Gagal Tersimpan'}</span>
              {showTroubleshootingGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-emerald-400 font-bold block mb-1">📁 /soal/</span>
              <span className="text-slate-300 block">• soal.json (Bank Soal)</span>
              <span className="text-slate-400 block">• mapel.json (Mapel)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-blue-400 font-bold block mb-1">📁 /siswa/</span>
              <span className="text-slate-300 block">• siswa.json (Data Siswa)</span>
              <span className="text-slate-500 block text-[10px]">NISN, Nama, PIN, Kelas</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold block mb-1">📁 /hasil/</span>
              <span className="text-slate-300 block">• hasil.json (Rekap Nilai)</span>
              <span className="text-slate-400 block text-[10px]">Dicatat juga di Sheet HasilUjian</span>
            </div>
          </div>
        </div>

        {/* Collapsible Troubleshooting & Architecture Diagnostic Guide */}
        {showTroubleshootingGuide && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs space-y-3 animate-fadeIn text-slate-200">
            <h4 className="font-bold text-amber-300 flex items-center space-x-1.5 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Penyebab Umum Penyimpanan Backend GAS Gagal & Cara Mengatasinya:</span>
            </h4>
            
            <div className="space-y-2.5 text-[11.5px] leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                <span className="font-bold text-amber-300 block">1. Berkas Tersimpan di Root "Drive Saya" (Bukan di Subfolder)</span>
                <p className="text-slate-300 mt-0.5">
                  Jika kode Apps Script memanggil <code>DriveApp.createFile()</code> langsung, berkas tersimpan di luar folder. Sistem CBT ini telah diperbarui untuk selalu memanggil <code>folder.createFile()</code> pada subfolder target dengan ID unik dan filter <code>!isTrashed()</code>.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                <span className="font-bold text-amber-300 block">2. Setelan Deployment Web App (Execute As)</span>
                <p className="text-slate-300 mt-0.5">
                  Buka Apps Script &gt; <strong>Deploy</strong> &gt; <strong>Manage deployments</strong>. Pastikan <strong>Execute as</strong> disetel ke <strong>Me (email Anda)</strong> dan <strong>Who has access</strong> disetel ke <strong>Anyone</strong>. Jika tidak, akses siswa/web app akan ditolak atau tersimpan di Drive akun siswa.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                <span className="font-bold text-amber-300 block">3. Deployment Belum Diperbarui ke Versi Baru (*New Version*)</span>
                <p className="text-slate-300 mt-0.5">
                  Setiap kali Anda menempelkan kode baru ke Google Apps Script, Anda <strong>wajib</strong> membuat versi baru: Klik <strong>Deploy</strong> &gt; <strong>Manage deployments</strong> &gt; Ikon pensil (Edit) &gt; Pada Version pilih <strong>New version</strong> &gt; Klik <strong>Deploy</strong>.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                <span className="font-bold text-amber-300 block">4. Pencarian Folder Menggunakan Nama vs Folder ID</span>
                <p className="text-slate-300 mt-0.5">
                  Pencarian global <code>DriveApp.getFoldersByName</code> dapat keliru memilih folder lama di Sampah (Trash). Backend kami secara otomatis memfilter folder sampah dan meng-cache <strong>Folder ID</strong> unik di Script Properties.
                </p>
              </div>
            </div>

            {gasUrl && (
              <div className="pt-2 flex items-center justify-between border-t border-amber-500/20">
                <span className="text-slate-400 text-[11px]">Uji penyimpanan langsung di server Google Drive Anda:</span>
                <button
                  type="button"
                  onClick={handleRunStorageVerification}
                  disabled={isVerifyingStorage}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isVerifyingStorage ? 'Memverifikasi...' : 'Verifikasi Penyimpanan Backend Sekarang'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Verification Report Card */}
        {verificationReport && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between font-bold text-emerald-300 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Hasil Audit Server Google Apps Script (Backend Versi {verificationReport.backendVersion || '2.6.0'})</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 font-mono">
                {verificationReport.executor}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                <span className="text-slate-400 block text-[10px]">soal.json:</span>
                <span className="text-emerald-300 font-bold">
                  {verificationReport.files?.soalJson?.count ?? 0} Soal
                </span>
                <span className="text-[10px] text-slate-500 block">📁 /soal/</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                <span className="text-slate-400 block text-[10px]">mapel.json:</span>
                <span className="text-emerald-300 font-bold">
                  {verificationReport.files?.mapelJson?.count ?? 0} Mapel
                </span>
                <span className="text-[10px] text-slate-500 block">📁 /soal/</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                <span className="text-slate-400 block text-[10px]">siswa.json:</span>
                <span className="text-emerald-300 font-bold">
                  {verificationReport.files?.siswaJson?.count ?? 0} Siswa
                </span>
                <span className="text-[10px] text-slate-500 block">📁 /siswa/</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                <span className="text-slate-400 block text-[10px]">Sheet HasilUjian:</span>
                <span className="text-amber-300 font-bold">
                  {verificationReport.spreadsheet?.totalHasilRows ?? 0} Baris Nilai
                </span>
                <span className="text-[10px] text-slate-500 block">📊 Spreadsheet</span>
              </div>
            </div>

            {verificationReport.folders?.root?.url && (
              <div className="pt-2 border-t border-emerald-900/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Folder Root: <strong>{verificationReport.folders.root.name}</strong></span>
                <a
                  href={verificationReport.folders.root.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 underline"
                >
                  <span>Buka Folder di Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Target Folder Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Pilih Target Berkas yang Diunggah:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'unknown', label: '⚡ Deteksi Otomatis', desc: 'Auto identifikasi' },
              { id: 'soal', label: '📁 soal.json', desc: 'Folder /soal/' },
              { id: 'mapel', label: '📁 mapel.json', desc: 'Folder /soal/' },
              { id: 'siswa', label: '📁 siswa.json', desc: 'Folder /siswa/' },
              { id: 'hasil', label: '📁 hasil.json', desc: 'Folder /hasil/' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFolderCategory(tab.id as JsonCategory);
                  if (parsedData) {
                    const toVal = tab.id !== 'unknown' ? (tab.id as JsonCategory) : detectedCategory;
                    setValidationResult(validateCbtJsonData(toVal, parsedData));
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  activeFolderCategory === tab.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p className="text-xs font-bold">{tab.label}</p>
                <p className="text-[10px] opacity-75">{tab.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition group space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 group-hover:bg-indigo-950/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition">
            <FileCode2 className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">
              {selectedFile ? selectedFile.name : 'Klik atau seret berkas .json ke area ini'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Format didukung: <code>soal.json</code>, <code>mapel.json</code>, <code>siswa.json</code>, <code>hasil.json</code>, atau berkas bundel.
            </p>
          </div>
        </div>

        {/* Validation Result Box */}
        {validationResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            validationResult.valid 
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2 font-semibold text-sm">
              {validationResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{validationResult.valid ? 'Validasi Format Berhasil' : 'Format Tidak Sesuai'}</span>
            </div>
            <p className="leading-relaxed">{validationResult.message}</p>
            {validationResult.valid && (
              <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                <span>Terdeteksi: <strong className="text-white font-mono">{detectedCategory.toUpperCase()}</strong></span>
                <span>Jumlah Record: <strong className="text-emerald-400 font-mono">{validationResult.count}</strong></span>
                {validationResult.sampleName && (
                  <span className="truncate max-w-xs">Contoh: <em>"{validationResult.sampleName}"</em></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Feedback */}
        {statusFeedback && (
          <div className={`p-4 rounded-xl border text-xs flex items-start space-x-2 ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : statusFeedback.type === 'warning'
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-rose-950/60 border-rose-500 text-rose-300'
          }`}>
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusFeedback.message}</span>
          </div>
        )}

        {/* Import Mode & Sync Options */}
        {validationResult?.valid && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Metode Impor:</label>
              <div className="space-y-1.5 text-xs text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span><strong>Gabungkan (Merge)</strong>: Pertahankan data lama</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-amber-300"><strong>Gantikan (Replace)</strong>: Timpa seluruh data</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Sinkronisasi Backend Google Drive:</label>
              <label className="flex items-start space-x-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={syncToGdrive}
                  onChange={(e) => setSyncToGdrive(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Unggah langsung ke Google Drive (Folder "CBT Online")
                  {!gasUrl && <span className="text-rose-400 block text-[10px]">*URL GAS belum diatur</span>}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-2">
            {gasUrl && (
              <button
                type="button"
                onClick={handleRunStorageVerification}
                disabled={isVerifyingStorage}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 transition flex items-center space-x-1.5 cursor-pointer"
                title="Verifikasi apakah berkas .json benar-benar tersimpan di Google Drive Anda"
              >
                {isVerifyingStorage ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>Verifikasi Server</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={!validationResult?.valid || isProcessing}
              onClick={handleApplyData}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                validationResult?.valid && !isProcessing
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Data...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Terapkan Berkas JSON ke Sistem</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Template Download & Auto-Init Utility Section */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Unduh Berkas Contoh / Template Struktur:</span>
            </span>
            {gasUrl && (
              <button
                type="button"
                onClick={handleInitGdriveFolders}
                disabled={isInitializingGdrive}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 underline cursor-pointer"
                title="Membuat folder 'CBT Online' dan subfolder soal, siswa, hasil di Google Drive Anda secara otomatis"
              >
                <Cloud className="w-3 h-3" />
                <span>{isInitializingGdrive ? 'Menginisialisasi...' : 'Auto-Generate Folder Google Drive'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => downloadStarterTemplate('soal')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>soal.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('mapel')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>mapel.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('siswa')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>siswa.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('hasil')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 flex items-center justify-center space-x-1 transition"
            >
              <Award className="w-3 h-3 text-amber-400" />
              <span>hasil.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('bundle')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-[11px] text-indigo-300 font-semibold flex items-center justify-center space-x-1 transition"
            >
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Bundel CBT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
