import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Activity,
  Check,
  ExternalLink,
  ShieldCheck,
  Database,
  ArrowUpRight,
  Info,
  Layers,
  Sparkles,
  Wifi,
  WifiOff,
  Clock,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  CheckSquare
} from 'lucide-react';
import { HasilUjian, DatabaseMode, MataPelajaran, Question, Siswa } from '../../types';
import {
  getGasWebappUrl,
  setGasWebappUrl,
  getDatabaseMode,
  setDatabaseMode,
  getLastSyncedAt,
  getLastVerifiedAt,
  cekKoneksiGas,
  sinkronDaftarHasilKeGoogleSheets,
  isDummyHasil,
  hapusHanyaHasilDummy,
  muatUlangDataContoh,
  getHasilUjian
} from '../../services/gasService';

interface BulkDataManagementPanelProps {
  hasilList: HasilUjian[];
  siswaList: Siswa[];
  soalList: Question[];
  mapelList: MataPelajaran[];
  onUpdateHasil: (list: HasilUjian[]) => void;
  onRefreshAllData: () => void;
}

export const BulkDataManagementPanel: React.FC<BulkDataManagementPanelProps> = ({
  hasilList,
  siswaList,
  soalList,
  mapelList,
  onUpdateHasil,
  onRefreshAllData,
}) => {
  // Gas URL & Connection State
  const [gasUrl, setGasUrl] = useState<string>(() => getGasWebappUrl());
  const [isUrlDirty, setIsUrlDirty] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    latency?: number;
    message: string;
    timestamp?: string;
  }>(() => {
    const verified = getLastVerifiedAt();
    const hasUrl = Boolean(getGasWebappUrl().trim());
    return {
      tested: Boolean(verified),
      connected: Boolean(verified && hasUrl),
      message: hasUrl
        ? verified ? `Terakhir diverifikasi: ${verified}` : 'URL tersimpan, klik Cek Sambungan untuk menguji.'
        : 'URL Google Apps Script Web App belum diatur.',
      timestamp: verified || undefined,
    };
  });

  // Database Mode State
  const [dbMode, setDbMode] = useState<DatabaseMode>(() => getDatabaseMode());

  // Bulk Sync State
  const [syncScope, setSyncScope] = useState<'all' | 'real_only'>('all');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentStudentName?: string;
    currentSubject?: string;
  } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  // Dummy Cleanup State & Confirmation
  const [isConfirmDeleteDummyOpen, setIsConfirmDeleteDummyOpen] = useState<boolean>(false);
  const [cleanupFeedback, setCleanupFeedback] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  // Table filter & search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'real' | 'dummy'>('all');

  // Timestamps
  const [lastSynced, setLastSynced] = useState<string | null>(() => getLastSyncedAt());
  const [lastVerified, setLastVerified] = useState<string | null>(() => getLastVerifiedAt());

  // Categorize results
  const dummyResults = hasilList.filter(h => isDummyHasil(h));
  const realResults = hasilList.filter(h => !isDummyHasil(h));

  // Determine items to sync
  const targetSyncList = syncScope === 'real_only' ? realResults : hasilList;

  // Auto-check connection on initial load if URL is set
  useEffect(() => {
    const url = getGasWebappUrl().trim();
    if (url && !connectionStatus.tested) {
      handleTestConnection(false);
    }
  }, []);

  // Save GAS URL
  const handleSaveGasUrl = () => {
    const cleanUrl = gasUrl.trim();
    setGasWebappUrl(cleanUrl);
    setIsUrlDirty(false);
    setSyncFeedback({
      type: 'info',
      message: 'URL Google Apps Script Web App berhasil disimpan.',
    });
    setTimeout(() => setSyncFeedback(null), 3500);
    if (cleanUrl) {
      handleTestConnection(true);
    }
  };

  // Test GAS Connection (Ping)
  const handleTestConnection = async (showNotification = true) => {
    const url = gasUrl.trim();
    if (!url) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: 'URL Google Apps Script Web App masih kosong.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const res = await cekKoneksiGas(url);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
      setConnectionStatus({
        tested: true,
        connected: res.success,
        latency: res.latency,
        message: res.message,
        timestamp: nowStr,
      });
      setLastVerified(getLastVerifiedAt());

      if (showNotification) {
        setSyncFeedback({
          type: res.success ? 'success' : 'error',
          message: res.success
            ? `Sambungan Berhasil! Web App terhubung dalam ${res.latency} ms.`
            : `Gagal tersambung: ${res.message}`,
        });
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: err.message || 'Koneksi gagal',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Toggle Database Mode
  const handleToggleDbMode = (newMode: DatabaseMode) => {
    setDatabaseMode(newMode);
    setDbMode(newMode);
    setSyncFeedback({
      type: 'info',
      message: newMode === 'database_penuh'
        ? 'Mode beralih ke Database Penuh (GDrive). Pengiriman hasil ujian akan otomatis diprioritaskan ke Spreadsheet sekolah.'
        : 'Mode beralih ke Simulator (Lokal). Data disimpan di penyimpanan peramban (LocalStorage).',
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Manual Trigger: Sync all local results to GAS Web App
  const handleTriggerManualSync = async () => {
    const url = gasUrl.trim();
    if (!url) {
      setSyncFeedback({
        type: 'error',
        message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.',
      });
      return;
    }

    if (targetSyncList.length === 0) {
      setSyncFeedback({
        type: 'info',
        message: syncScope === 'real_only'
          ? 'Tidak ada hasil ujian siswa asli di browser untuk disinkronkan.'
          : 'Tidak ada hasil ujian lokal di browser untuk disinkronkan.',
      });
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    setSyncProgress({
      current: 0,
      total: targetSyncList.length,
      percent: 0,
      currentStudentName: targetSyncList[0]?.nama_siswa,
      currentSubject: targetSyncList[0]?.nama_mapel || targetSyncList[0]?.id_mapel,
    });

    const res = await sinkronDaftarHasilKeGoogleSheets(
      targetSyncList,
      url,
      (current, total, item) => {
        const pct = Math.round((current / total) * 100);
        setSyncProgress({
          current,
          total,
          percent: pct,
          currentStudentName: item?.nama_siswa,
          currentSubject: item?.nama_mapel || item?.id_mapel,
        });
      }
    );

    setIsSyncing(false);
    setSyncProgress(null);
    setLastSynced(getLastSyncedAt());
    setLastVerified(getLastVerifiedAt());

    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
      details: res.success
        ? `Telah menyinkronkan ${res.countSynced} dari ${res.totalCount} hasil ujian ke Sheet Tab "HasilUjian".`
        : undefined,
    });
  };

  // Clear ONLY Dummy Results
  const handleExecuteDeleteOnlyDummy = () => {
    const result = hapusHanyaHasilDummy();
    const updatedHasil = getHasilUjian();
    onUpdateHasil(updatedHasil);
    setIsConfirmDeleteDummyOpen(false);

    setCleanupFeedback({
      type: 'success',
      message: `Berhasil menghapus ${result.jumlahDihapus} data hasil ujian dummy/latihan! ${result.sisaHasil} data hasil ujian siswa asli tetap tersimpan dengan aman.`
    });

    setTimeout(() => {
      setCleanupFeedback(null);
    }, 5000);
  };

  // Reload default sample demo data
  const handleReloadDemoData = () => {
    if (confirm('Muat kembali 5 hasil ujian contoh bawaan sistem untuk keperluan simulasi/demonstrasi?')) {
      muatUlangDataContoh();
      onRefreshAllData();
      setCleanupFeedback({
        type: 'info',
        message: 'Data contoh/dummy bawaan berhasil dimuat kembali.'
      });
      setTimeout(() => setCleanupFeedback(null), 4000);
    }
  };

  // Filtered list for preview table
  const filteredList = hasilList.filter(item => {
    const isDum = isDummyHasil(item);
    if (statusFilter === 'real' && isDum) return false;
    if (statusFilter === 'dummy' && !isDum) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.id_hasil.toLowerCase().includes(q) ||
        item.nama_siswa.toLowerCase().includes(q) ||
        item.nisn.toLowerCase().includes(q) ||
        (item.nama_mapel && item.nama_mapel.toLowerCase().includes(q)) ||
        item.id_mapel.toLowerCase().includes(q) ||
        item.kelas.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & SUMMARY BADGES                                */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bulk Data Management</span>
              </span>
              <span className="text-xs text-slate-400">• Sinkronisasi Massal & Pembersihan Data</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pusat Manajemen Data Massal & Sinkronisasi GAS
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Kirim seluruh rekap hasil ujian lokal siswa ke Google Spreadsheet sekolah dalam satu klik, pantau konektivitas Google Apps Script secara langsung, serta bersihkan hasil ujian dummy/latihan dengan aman tanpa menghapus nilai siswa asli.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Hasil</span>
              <span className="text-xl font-black text-white">{hasilList.length}</span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-0.5">Siswa Asli</span>
              <span className="text-xl font-black text-emerald-400">{realResults.length}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Dummy/Test</span>
              <span className="text-xl font-black text-amber-400">{dummyResults.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Notifications */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl text-xs flex items-start space-x-3 transition-all animate-fadeIn ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
            : syncFeedback.type === 'error'
            ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
            : 'bg-indigo-950/80 border border-indigo-500/50 text-indigo-200'
        }`}>
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : syncFeedback.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{syncFeedback.message}</p>
            {syncFeedback.details && (
              <p className="text-[11px] opacity-80 mt-1">{syncFeedback.details}</p>
            )}
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {cleanupFeedback && (
        <div className="p-4 rounded-2xl text-xs bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{cleanupFeedback.message}</span>
          </div>
          <button
            onClick={() => setCleanupFeedback(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SECTION: STATUS KONEKSI GOOGLE APPS SCRIPT (CLEAR STATUS)  */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              connectionStatus.connected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {connectionStatus.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Status Konektivitas Google Apps Script</span>
                {connectionStatus.connected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE / TERHUBUNG</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>TERPUTUS / BELUM DIUJI</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Koneksi langsung antara web app CBT dan skrip Google Spreadsheet sekolah
              </p>
            </div>
          </div>

          {/* Test Ping Button */}
          <button
            type="button"
            onClick={() => handleTestConnection(true)}
            disabled={isTesting}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-md cursor-pointer ${
              isTesting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
            }`}
          >
            <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Menguji Sambungan...' : 'Cek Sambungan Sekarang (Ping)'}</span>
          </button>
        </div>

        {/* Connectivity Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Status Respons & Latensi */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Kualitas Sambungan</span>
            {connectionStatus.connected ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Respon Normal (HTTP 200)</span>
                </div>
                {connectionStatus.latency !== undefined && (
                  <p className="text-xs text-slate-300">
                    Latensi: <strong className="text-emerald-300">{connectionStatus.latency} ms</strong>
                    {connectionStatus.latency < 300 ? ' (Sangat Cepat)' : ' (Cukup Baik)'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Belum Terverifikasi</span>
                </div>
                <p className="text-xs text-rose-300 line-clamp-2">
                  {connectionStatus.message || 'Belum ada ping sukses.'}
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Riwayat Waktu Sinkronisasi */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Riwayat Sinkron</span>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Terakhir Sync:</span>
                <span className="font-mono font-medium text-white">{lastSynced || 'Belum pernah'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Terakhir Diuji:</span>
                <span className="font-mono font-medium text-white">{lastVerified || 'Belum diuji'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Mode Database Aktif */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Mode Database</span>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {dbMode === 'database_penuh' ? (
                  <>
                    <Cloud className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Database Penuh (GDrive)</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">Simulator (Lokal)</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleToggleDbMode(dbMode === 'database_penuh' ? 'simulator' : 'database_penuh')}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
              >
                Ganti Mode
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {dbMode === 'database_penuh'
                ? 'Hasil ujian langsung diupayakan masuk ke Spreadsheet Google Drive.'
                : 'Data disimpan di LocalStorage browser.'}
            </p>
          </div>
        </div>

        {/* GAS Web App URL Field */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>URL Web App Google Apps Script (/exec):</span>
            {gasUrl && (
              <a
                href={gasUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Buka Endpoint</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="url"
              value={gasUrl}
              onChange={(e) => {
                setGasUrl(e.target.value);
                setIsUrlDirty(true);
              }}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
            {isUrlDirty && (
              <button
                type="button"
                onClick={handleSaveGasUrl}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Simpan URL</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Pastikan deployment Google Apps Script menggunakan izin akses: <strong>Who has access: Anyone</strong> agar siswa dan sistem dapat mengirimkan hasil tanpa login akun Google.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SECTION: SINKRONISASI MASSAL HASIL UJIAN LOKAL             */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sinkronisasi Massal Hasil Ujian Lokal ke Google Sheets</h3>
              <p className="text-xs text-slate-400">
                Unggah seluruh lembar hasil ujian yang tersimpan di browser ke Tab <strong>HasilUjian</strong> pada Spreadsheet
              </p>
            </div>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
          <span className="text-xs font-bold text-slate-300 block">Pilih cakupan data yang akan disinkronkan:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                syncScope === 'all'
                  ? 'bg-indigo-950/60 border-indigo-500/70 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <input
                type="radio"
                name="syncScope"
                checked={syncScope === 'all'}
                onChange={() => setSyncScope('all')}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold block text-white">
                  Semua Hasil Ujian Lokal ({hasilList.length} data)
                </span>
                <span className="text-[11px] text-slate-400">
                  Termasuk {realResults.length} hasil siswa asli dan {dummyResults.length} hasil contoh/dummy.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                syncScope === 'real_only'
                  ? 'bg-emerald-950/60 border-emerald-500/70 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <input
                type="radio"
                name="syncScope"
                checked={syncScope === 'real_only'}
                onChange={() => setSyncScope('real_only')}
                className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold block text-white">
                  Hanya Hasil Siswa Asli ({realResults.length} data)
                </span>
                <span className="text-[11px] text-slate-400">
                  Mengecualikan {dummyResults.length} data dummy bawaan sistem agar Spreadsheet tetap bersih.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Sync Progress Bar (If actively syncing) */}
        {isSyncing && syncProgress && (
          <div className="bg-slate-950 border border-indigo-500/50 rounded-2xl p-5 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Sedang Mengirim ke Google Spreadsheet...</span>
              </span>
              <span className="font-mono font-bold text-indigo-400">
                {syncProgress.current} / {syncProgress.total} ({syncProgress.percent}%)
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${syncProgress.percent}%` }}
              ></div>
            </div>

            {syncProgress.currentStudentName && (
              <p className="text-[11px] text-slate-400 italic">
                Mengirim lembar jawaban: <strong className="text-slate-200">{syncProgress.currentStudentName}</strong> ({syncProgress.currentSubject})
              </p>
            )}
          </div>
        )}

        {/* Trigger Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400">
            Target pengiriman: <strong className="text-white">{targetSyncList.length} berkas hasil ujian</strong> siap dikirim ke Google Sheets.
          </div>

          <button
            type="button"
            onClick={handleTriggerManualSync}
            disabled={isSyncing || targetSyncList.length === 0}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg cursor-pointer ${
              isSyncing || targetSyncList.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white shadow-indigo-950/50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Menyinkronkan...'
                : `Sinkronkan ${targetSyncList.length} Hasil Sekarang`}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SECTION: PEMBERSIHAN HANYA HASIL UJIAN DUMMY / PERCOBAAN  */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pembersihan Khusus: Hasil Ujian Dummy / Percobaan</h3>
              <p className="text-xs text-slate-400">
                Bersihkan hanya rekaman nilai hasil simulasi/dummy tanpa menyentuh hasil ujian siswa asli
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReloadDemoData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700 shrink-0"
            title="Muat kembali 5 hasil contoh demo jika dibutuhkan untuk tes"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Muat Ulang Contoh</span>
          </button>
        </div>

        {/* Protection Warning & Explanation */}
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed space-y-1">
            <p className="font-bold text-white">
              Perlindungan Data Siswa Asli Terjamin:
            </p>
            <p>
              Tindakan ini <strong>HANYA</strong> akan menghapus {dummyResults.length} hasil ujian yang teridentifikasi sebagai data contoh/dummy (ID H-101 s/d H-105 atau akun pengujian bawaan). Sebanyak <strong>{realResults.length} hasil ujian siswa asli</strong>, bank soal, dan mata pelajaran akan tetap tersimpan aman.
            </p>
          </div>
        </div>

        {/* Dummy Items Status & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div>
            <span className="text-xs font-bold text-white block">Status Data Dummy di LocalStorage:</span>
            <span className="text-xs text-slate-400">
              {dummyResults.length > 0
                ? `Terdeteksi ${dummyResults.length} hasil ujian dummy / contoh bawaan sistem.`
                : 'Penyimpanan lokal bersih: Tidak ada hasil ujian dummy yang terdeteksi.'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmDeleteDummyOpen(true)}
            disabled={dummyResults.length === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-md cursor-pointer ${
              dummyResults.length === 0
                ? 'bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black shadow-amber-950/40'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Hanya Hasil Dummy ({dummyResults.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. TABEL PREVIEW HASIL UJIAN LOKAL (DUMMY VS ASLI)           */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white">Daftar Rincian Hasil Ujian di Browser</h4>
            <p className="text-xs text-slate-400">Tinjau status setiap berkas nilai sebelum sinkronisasi</p>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({hasilList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('real')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'real' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Siswa Asli ({realResults.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('dummy')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'dummy' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dummy ({dummyResults.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari siswa/nisn..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Tipe</th>
                <th className="p-3">ID Hasil</th>
                <th className="p-3">NISN</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Mapel</th>
                <th className="p-3">Nilai</th>
                <th className="p-3">Status</th>
                <th className="p-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    Tidak ada data hasil ujian yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((h) => {
                  const isDum = isDummyHasil(h);
                  return (
                    <tr key={h.id_hasil} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans">
                        {isDum ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            DUMMY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            SISWA ASLI
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">{h.id_hasil}</td>
                      <td className="p-3">{h.nisn}</td>
                      <td className="p-3 font-sans font-medium text-slate-200">{h.nama_siswa}</td>
                      <td className="p-3">{h.kelas}</td>
                      <td className="p-3 text-indigo-300 font-sans">{h.nama_mapel || h.id_mapel}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-black ${
                          h.nilai_akhir >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {h.nilai_akhir}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] text-slate-400">{h.status_koreksi}</span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{h.timestamp}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CONFIRMATION CLEAR ONLY DUMMY RESULTS                 */}
      {/* ============================================================ */}
      {isConfirmDeleteDummyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Konfirmasi Hapus Hasil Dummy</h3>
                <p className="text-xs text-amber-300">Pembersihan data latihan / percobaan</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p>
                Anda akan menghapus <strong>{dummyResults.length} hasil ujian contoh/dummy</strong> dari penyimpanan browser lokal.
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>{realResults.length} hasil ujian siswa asli</strong> akan tetap tersimpan aman.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteDummyOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteOnlyDummy}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-md cursor-pointer"
              >
                Ya, Hapus Hasil Dummy Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
