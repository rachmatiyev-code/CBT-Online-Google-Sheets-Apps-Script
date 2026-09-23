import React, { useState } from 'react';
import { 
  Database, 
  Cloud, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  ExternalLink, 
  Activity, 
  X, 
  ShieldCheck, 
  Settings2,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Check
} from 'lucide-react';
import { DatabaseMode, StorageStatus } from '../../types';
import { 
  getDatabaseMode, 
  setDatabaseMode as persistDatabaseMode, 
  getStorageLocation, 
  cekKoneksiGas, 
  tarikDataDariGoogleSheets, 
  unggahDataKeGoogleSheets, 
  sinkronSemuaHasilLokalKeGoogleSheets,
  getHasilUjian,
  getGasWebappUrl, 
  setGasWebappUrl,
  getLastSyncedAt,
  getLastVerifiedAt
} from '../../services/gasService';

interface StorageStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced: () => void;
}

export const StorageStatusButton: React.FC<{ onClick: () => void; className?: string }> = ({ 
  onClick, 
  className = '' 
}) => {
  const mode = getDatabaseMode();
  const storage = getStorageLocation();
  const isGDrive = storage === 'gdrive' && mode === 'database_penuh';

  if (isGDrive) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Klik untuk melihat diagnostik sambungan & sinkronisasi Google Drive"
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400 transition shadow-md shadow-emerald-950/50 ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-bold tracking-tight">Data tersimpan di GDrive</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Klik untuk melihat opsi beralih ke Database Penuh Google Drive & sinkronisasi data"
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-300 hover:bg-amber-900/60 hover:border-amber-400 transition shadow-md shadow-amber-950/50 ${className}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs font-bold tracking-tight">Data tersimpan di lokal</span>
    </button>
  );
};

export const StorageStatusModal: React.FC<StorageStatusModalProps> = ({
  isOpen,
  onClose,
  onDataSynced,
}) => {
  const [currentMode, setCurrentMode] = useState<DatabaseMode>(() => getDatabaseMode());
  const [gasUrlInput, setGasUrlInput] = useState<string>(() => getGasWebappUrl());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Sync operations states
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isSyncingResults, setIsSyncingResults] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [localResultsCount, setLocalResultsCount] = useState<number>(() => getHasilUjian().length);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string; type?: 'info' | 'error' | 'success' } | null>(null);

  // Timestamps
  const [lastVerified, setLastVerified] = useState<string | null>(() => getLastVerifiedAt());
  const [lastSynced, setLastSynced] = useState<string | null>(() => getLastSyncedAt());

  if (!isOpen) return null;

  const isDatabaseMode = currentMode === 'database_penuh';

  const handleToggleMode = (enableDatabaseMode: boolean) => {
    const targetMode: DatabaseMode = enableDatabaseMode ? 'database_penuh' : 'simulator';
    setCurrentMode(targetMode);
    persistDatabaseMode(targetMode);
    setSyncFeedback({
      type: 'info',
      success: true,
      message: enableDatabaseMode 
        ? 'Database Mode Aktif (Direct Google Sheets Sync): Data siswa dan hasil ujian akan otomatis disinkronkan langsung ke Spreadsheet sekolah di Google Drive.'
        : 'Simulator Mode Aktif (Lokal / Offline): Data disimpan di memori peramban (LocalStorage) tanpa koneksi internet.'
    });
  };

  const handleModeChange = (mode: DatabaseMode) => {
    handleToggleMode(mode === 'database_penuh');
  };

  const handleTestConnection = async () => {
    const url = gasUrlInput.trim();
    if (!url) {
      setTestResult({
        success: false,
        message: 'URL Google Apps Script belum diisi. Masukkan URL Web App Anda terlebih dahulu.'
      });
      return;
    }

    setGasWebappUrl(url);
    setIsTesting(true);
    setTestResult(null);

    const res = await cekKoneksiGas(url);
    setIsTesting(false);
    setTestResult(res);
    setLastVerified(getLastVerifiedAt());
  };

  const handlePullFromSheets = async () => {
    const url = gasUrlInput.trim();
    if (!url) {
      setSyncFeedback({
        type: 'error',
        success: false,
        message: 'Masukkan URL Google Apps Script Web App terlebih dahulu.'
      });
      return;
    }

    setGasWebappUrl(url);
    setIsPulling(true);
    setSyncFeedback(null);

    const res = await tarikDataDariGoogleSheets(url);
    setIsPulling(false);
    setSyncFeedback({
      ...res,
      type: res.success ? 'success' : 'error',
    });
    setLastSynced(getLastSyncedAt());
    setLastVerified(getLastVerifiedAt());
    setLocalResultsCount(getHasilUjian().length);
    if (res.success) {
      onDataSynced();
    }
  };

  const handlePushToSheets = async () => {
    const url = gasUrlInput.trim();
    if (!url) {
      setSyncFeedback({
        type: 'error',
        success: false,
        message: 'Masukkan URL Google Apps Script Web App terlebih dahulu.'
      });
      return;
    }

    setGasWebappUrl(url);
    setIsPushing(true);
    setSyncFeedback(null);

    const res = await unggahDataKeGoogleSheets(url);
    setIsPushing(false);
    setSyncFeedback({
      ...res,
      type: res.success ? 'success' : 'error',
    });
    setLastSynced(getLastSyncedAt());
    setLastVerified(getLastVerifiedAt());
    if (res.success) {
      onDataSynced();
    }
  };

  const handleSyncAllLocalResults = async () => {
    const url = gasUrlInput.trim();
    if (!url) {
      setSyncFeedback({
        type: 'error',
        success: false,
        message: 'Masukkan URL Web App Google Apps Script terlebih dahulu untuk mengirim hasil.',
      });
      return;
    }

    const currentResults = getHasilUjian();
    if (!currentResults || currentResults.length === 0) {
      setSyncFeedback({
        type: 'info',
        success: true,
        message: 'Tidak ada data hasil ujian lokal di browser untuk disinkronkan.',
      });
      return;
    }

    setGasWebappUrl(url);
    setIsSyncingResults(true);
    setSyncProgress({ current: 0, total: currentResults.length });
    setSyncFeedback(null);

    const res = await sinkronSemuaHasilLokalKeGoogleSheets(url, (current, total) => {
      setSyncProgress({ current, total });
    });

    setIsSyncingResults(false);
    setSyncProgress(null);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      success: res.success,
      message: res.message,
    });
    setLastSynced(getLastSyncedAt());
    setLastVerified(getLastVerifiedAt());
    setLocalResultsCount(getHasilUjian().length);
    if (res.success) {
      onDataSynced();
    }
  };

  const storageLoc = getStorageLocation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              storageLoc === 'gdrive' && currentMode === 'database_penuh'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {storageLoc === 'gdrive' && currentMode === 'database_penuh' ? <Cloud className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Status & Konektivitas Database</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  storageLoc === 'gdrive' && currentMode === 'database_penuh'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950 border-amber-500/50 text-amber-300'
                }`}>
                  {storageLoc === 'gdrive' && currentMode === 'database_penuh' ? 'Data tersimpan di GDrive' : 'Data tersimpan di lokal'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Pastikan Google Apps Script berhasil menyambungkan data antara Web App dan Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ============================================================ */}
          {/* TOGGLE SWITCH: DATABASE MODE VS SIMULATOR MODE              */}
          {/* ============================================================ */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isDatabaseMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {isDatabaseMode ? <Cloud className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {isDatabaseMode ? 'Database Mode (Direct Google Sheets Sync)' : 'Simulator Mode (Lokal / Offline)'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isDatabaseMode 
                        ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
                        : 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                    }`}>
                      {isDatabaseMode ? 'ON • Direct Sync' : 'OFF • Simulator'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isDatabaseMode
                      ? 'Sinkronisasi langsung aktif. Seluruh data ujian siswa otomatis disinkronkan ke Google Drive.'
                      : 'Mode simulator aktif. Seluruh data disimpan mandiri di memori browser tanpa internet.'}
                  </p>
                </div>
              </div>

              {/* Master Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isDatabaseMode}
                onClick={() => handleToggleMode(!isDatabaseMode)}
                title={isDatabaseMode ? 'Klik untuk mematikan Direct Sync (Mode Simulator)' : 'Klik untuk mengaktifkan Database Mode (Direct Sync)'}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  isDatabaseMode ? 'bg-emerald-500 shadow-md shadow-emerald-950/60' : 'bg-slate-700'
                }`}
              >
                <span className="sr-only">Toggle Database Mode</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    isDatabaseMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                >
                  {isDatabaseMode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  )}
                </span>
              </button>
            </div>

            {/* Quick Cards Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Card 1: Mode Simulator */}
              <div
                onClick={() => handleModeChange('simulator')}
                className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                  currentMode === 'simulator'
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className={`w-3.5 h-3.5 ${currentMode === 'simulator' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-white">Mode Simulator</span>
                    </div>
                    {currentMode === 'simulator' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Data disimpan lokal di browser. Fitur CBT bekerja mandiri tanpa konfigurasi internet atau Apps Script.
                  </p>
                </div>
              </div>

              {/* Card 2: Mode Database Penuh */}
              <div
                onClick={() => handleModeChange('database_penuh')}
                className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                  currentMode === 'database_penuh'
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cloud className={`w-3.5 h-3.5 ${currentMode === 'database_penuh' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-white">Mode Database Penuh</span>
                    </div>
                    {currentMode === 'database_penuh' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Tersambung langsung ke Google Sheets sekolah di Google Drive. Nilai ujian siswa otomatis masuk tab <code className="text-emerald-300">HasilUjian</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SYNC ALL LOCAL RESULTS (BULK POST TO GAS URL)                */}
          {/* ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/50 border border-emerald-500/40 space-y-3.5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">Sync All Local Results</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40">
                      {localResultsCount} hasil tersimpan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Iterasi dan kirim seluruh hasil ujian siswa yang tersimpan di penyimpanan lokal ke tab <code className="text-emerald-300 font-mono">HasilUjian</code> di Google Sheets via bulk POST.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncAllLocalResults}
                disabled={isSyncingResults || isPulling || isPushing || localResultsCount === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-emerald-950/50 cursor-pointer"
                title="Iterasi seluruh hasil ujian lokal dan kirimkan ke Google Apps Script Web App"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingResults ? 'animate-spin' : ''}`} />
                <span>{isSyncingResults ? 'Menyinkronkan...' : 'Sync All Local Results'}</span>
              </button>
            </div>

            {/* Progress indicator during bulk synchronization */}
            {isSyncingResults && syncProgress && (
              <div className="space-y-1.5 pt-1 border-t border-emerald-900/40">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center space-x-1.5">
                    <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                    <span>Mengirim hasil ujian ke Spreadsheet...</span>
                  </span>
                  <span className="font-mono text-emerald-300">
                    {syncProgress.current} / {syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-300 shadow-sm shadow-emerald-400/50"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {syncFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
              syncFeedback.type === 'error'
                ? 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
                : syncFeedback.type === 'info'
                ? 'bg-blue-950/90 border border-blue-500/60 text-blue-200'
                : 'bg-teal-950/90 border border-teal-500/60 text-teal-200'
            }`}>
              {syncFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
              )}
              <span className="flex-1">{syncFeedback.message}</span>
            </div>
          )}

          {/* GAS URL & Connectivity Test */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>URL Web App Google Apps Script (GAS):</span>
              </span>
              {lastVerified && (
                <span className="text-[10px] text-slate-400">
                  Terakhir diverifikasi: <strong className="text-slate-300">{lastVerified}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={gasUrlInput}
                onChange={(e) => setGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-indigo-950/40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Menguji...' : 'Uji Sambungan (Ping)'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
                testResult.success 
                  ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200' 
                  : 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <div className="flex-1">
                  <span>{testResult.message}</span>
                  {testResult.latency !== undefined && (
                    <span className="ml-2 text-[10px] opacity-75">({testResult.latency} ms)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sync Operations (Bank Soal & Siswa) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                  <span>Sinkronisasi Data Dua Arah (Web App &lt;=&gt; Google Drive)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sinkronkan Bank Soal, Data Siswa, dan Mata Pelajaran dengan Google Spreadsheet Anda.
                </p>
              </div>
              {lastSynced && (
                <span className="text-[10px] text-slate-400 hidden sm:inline-block">
                  Sinkron terakhir: <strong className="text-slate-300">{lastSynced}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handlePullFromSheets}
                disabled={isPulling || isPushing || isSyncingResults}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-left transition disabled:opacity-50 flex items-start space-x-3 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 group-hover:bg-teal-500/30">
                  <ArrowDownToLine className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Tarik dari Google Sheets</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isPulling ? 'Sedang mengunduh data...' : 'Unduh mapel, soal, & siswa dari GDrive ke web app'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePushToSheets}
                disabled={isPulling || isPushing || isSyncingResults}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-left transition disabled:opacity-50 flex items-start space-x-3 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30">
                  <ArrowUpToLine className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Unggah ke Google Sheets</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isPushing ? 'Sedang mengunggah data...' : 'Simpan bank soal & siswa saat ini ke GDrive'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mode Aktif: <strong className="text-slate-200">{isDatabaseMode ? 'Database Mode (Direct Sync)' : 'Simulator Mode (Lokal)'}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
