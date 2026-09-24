import React, { useState, useRef } from 'react';
import { MataPelajaran, Question, Siswa } from '../../types';
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
  Info
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
  saveMataPelajaran,
  saveBankSoal,
  saveSiswa
} from '../../services/gasService';

interface JsonUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapelList: MataPelajaran[];
  soalList: Question[];
  siswaList: Siswa[];
  gasUrl: string;
  onDataUpdated: (data: {
    mapel?: MataPelajaran[];
    soal?: Question[];
    siswa?: Siswa[];
  }) => void;
}

export const JsonUploaderModal: React.FC<JsonUploaderModalProps> = ({
  isOpen,
  onClose,
  mapelList,
  soalList,
  siswaList,
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
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isInitializingGdrive, setIsInitializingGdrive] = useState<boolean>(false);

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

      if (finalCategory === 'bundle') {
        // Multi-folder bundle
        let inMapel: MataPelajaran[] = [];
        let inSoal: Question[] = [];
        let inSiswa: Siswa[] = [];

        if (parsedData.folders) {
          inMapel = parsedData.folders['soal/']?.['mapel.json'] || [];
          inSoal = parsedData.folders['soal/']?.['soal.json'] || [];
          inSiswa = parsedData.folders['siswa/']?.['siswa.json'] || [];
        } else {
          inMapel = parsedData.mapel || parsedData.mapelList || [];
          inSoal = parsedData.soal || parsedData.soalList || [];
          inSiswa = parsedData.siswa || parsedData.siswaList || [];
        }

        if (importMode === 'replace') {
          if (inMapel.length > 0) newMapel = inMapel;
          if (inSoal.length > 0) newSoal = inSoal;
          if (inSiswa.length > 0) newSiswa = inSiswa;
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
        }

        saveMataPelajaran(newMapel);
        saveBankSoal(newSoal);
        saveSiswa(newSiswa);

        onDataUpdated({ mapel: newMapel, soal: newSoal, siswa: newSiswa });
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
      }

      let extraMsg = '';
      if (syncToGdrive && gasUrl.trim()) {
        const uploadRes = await unggahDataKeGoogleSheets(gasUrl);
        if (uploadRes.success) {
          extraMsg = ' Data juga langsung diunggah ke Google Drive ("CBT Online")!';
        } else {
          extraMsg = ` Peringatan Google Drive: ${uploadRes.message}`;
        }
      }

      setStatusFeedback({
        type: 'success',
        message: `Berhasil menerapkan berkas JSON ke sistem! (${validationResult.count} data diproses).${extraMsg}`
      });

      // Clear selection after success
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
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 my-8">
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
                Impor data soal, mata pelajaran, atau siswa langsung sesuai struktur subfolder Google Drive.
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
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
            <Folder className="w-4 h-4" />
            <span>Peta Struktur Berkas Target "CBT Online":</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-emerald-400 font-bold block">📁 /soal/</span>
              <span className="text-slate-300">• soal.json (Bank Soal)</span>
              <span className="text-slate-400 block">• mapel.json (Mapel)</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-blue-400 font-bold block">📁 /siswa/</span>
              <span className="text-slate-300 block">• siswa.json (Daftar Siswa)</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold block">📁 /hasil/</span>
              <span className="text-slate-400 block">Arsip JSON hasil ujian (Rekap di Spreadsheet)</span>
            </div>
          </div>
        </div>

        {/* Target Folder Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Pilih Target Berkas yang Diunggah:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'unknown', label: '⚡ Deteksi Otomatis', desc: 'Auto identifikasi' },
              { id: 'soal', label: '📁 soal.json', desc: 'Folder /soal/' },
              { id: 'mapel', label: '📁 mapel.json', desc: 'Folder /soal/' },
              { id: 'siswa', label: '📁 siswa.json', desc: 'Folder /siswa/' },
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
              Format yang didukung: <code>soal.json</code>, <code>mapel.json</code>, <code>siswa.json</code>, atau berkas bundel.
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
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Sinkronisasi Backend:</label>
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
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
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

        {/* Template Download & Auto-Init Utility Section */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Utilitas Template Struktur Folder JSON:</span>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => downloadStarterTemplate('soal')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Template soal.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('mapel')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Template mapel.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('siswa')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center space-x-1 transition"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Template siswa.json</span>
            </button>
            <button
              type="button"
              onClick={() => downloadStarterTemplate('bundle')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-[11px] text-indigo-300 font-semibold flex items-center justify-center space-x-1 transition"
            >
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Unduh Bundel CBT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
