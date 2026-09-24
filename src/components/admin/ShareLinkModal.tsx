import React, { useState, useMemo, useEffect } from 'react';
import { MataPelajaran, Siswa, KodeSoalPaket, DatabaseMode } from '../../types';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Link as LinkIcon, 
  QrCode, 
  Users, 
  Sparkles,
  Info,
  Layers,
  Database
} from 'lucide-react';

interface ShareLinkModalProps {
  mapelList: MataPelajaran[];
  siswaList?: Siswa[];
  kodeList?: KodeSoalPaket[];
  dbMode?: DatabaseMode;
  gasUrl?: string;
  currentMapelId?: string;
  onClose?: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  mapelList,
  siswaList = [],
  kodeList = [],
  dbMode = 'simulator',
  gasUrl = '',
  currentMapelId,
}) => {
  const [selectedMapelId, setSelectedMapelId] = useState<string>(
    currentMapelId || mapelList[0]?.id_mapel || ''
  );
  const [selectedKodeId, setSelectedKodeId] = useState<string>('ALL');
  const [includeNisn, setIncludeNisn] = useState<boolean>(false);
  const [includeGasParam, setIncludeGasParam] = useState<boolean>(Boolean(gasUrl));
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // Filter students: strictly exclude dummy records in shared link generator
  const realStudents = useMemo(() => {
    return siswaList.filter(s => !s.is_dummy);
  }, [siswaList]);

  const [sampleNisn, setSampleNisn] = useState<string>(() => {
    return realStudents[0]?.nisn || '';
  });

  // Keep sampleNisn updated if realStudents changes
  useEffect(() => {
    if (realStudents.length > 0) {
      if (!sampleNisn || !realStudents.some(s => s.nisn === sampleNisn)) {
        setSampleNisn(realStudents[0].nisn);
      }
    } else {
      setSampleNisn('');
    }
  }, [realStudents, sampleNisn]);

  // Keep includeGasParam synced if gasUrl is available
  useEffect(() => {
    if (gasUrl) {
      setIncludeGasParam(true);
    }
  }, [gasUrl]);

  const selectedMapel = mapelList.find(m => m.id_mapel === selectedMapelId) || mapelList[0];
  const matchingPackages = kodeList.filter(k => k.id_mapel === selectedMapelId);
  const activePackage = kodeList.find(k => k.id_kode === selectedKodeId);

  // Base URL calculation (safe for iframe preview and standalone window)
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : 'https://cbt-online.app';

  // Construct student link query parameters
  const queryParams = new URLSearchParams();
  queryParams.set('mode', 'siswa');
  if (selectedMapel) {
    queryParams.set('mapel', selectedMapel.id_mapel);
  }
  if (selectedKodeId && selectedKodeId !== 'ALL') {
    queryParams.set('kode', selectedKodeId);
  }
  if (includeNisn && sampleNisn.trim()) {
    queryParams.set('nisn', sampleNisn.trim());
  }
  // Include backend URL to ensure student device connects directly to Google Drive/Apps Script without dummy data
  if (includeGasParam && gasUrl.trim()) {
    queryParams.set('gas', encodeURIComponent(gasUrl.trim()));
  }

  const studentLink = `${baseUrl}?${queryParams.toString()}`;

  // Pre-formatted message template for WhatsApp, Google Classroom, and Telegram
  const currentToken = activePackage?.token_akses || selectedMapel?.token_akses || '';
  const announcementTemplate = `📢 *PENGUMUMAN UJIAN CBT ONLINE*
Kepada seluruh peserta didik yang terhormat, berikut adalah tautan resmi untuk mengikuti ujian:

📚 *Mata Pelajaran:* ${selectedMapel?.nama_mapel || 'Ujian Sekolah'}
🏫 *Tingkat/Kelas:* ${selectedMapel?.kelas || 'Semua Kelas'}
${activePackage ? `📑 *Paket Soal:* [${activePackage.id_kode}] ${activePackage.nama_kode} (${activePackage.jumlah_soal} Soal)\n` : ''}⏱️ *Durasi Waktu:* ${activePackage?.durasi_menit || selectedMapel?.durasi_menit || 45} Menit (KKM: ${selectedMapel?.kkm || 75})
${currentToken ? `🔑 *Token Ujian:* *${currentToken}*\n` : ''}
🔗 *Link Portal Ujian Siswa:*
${studentLink}

⚠️ *Petunjuk Pengerjaan:*
1. Buka tautan di atas menggunakan Google Chrome pada HP / Laptop.
2. Masukkan NISN dan PIN peserta resmi Anda.
3. Masukkan Token Ujian untuk membuka lembar soal.
4. Jangan keluar dari aplikasi atau membuka tab lain selama ujian berlangsung.
Selamat mengerjakan dengan jujur dan teliti!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(announcementTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleOpenStudentPortal = () => {
    window.open(studentLink, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Share2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Mode Siswa Terpisah & Tautan Ujian</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Shareable Link
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Buat dan bagikan tautan khusus siswa. Saat tautan ini dibuka, antarmuka langsung terkunci 
                ke **Mode Siswa (Portal CBT)** tanpa menampilkan menu Admin / Guru, sehingga siswa hanya dapat 
                mengerjakan ujian dengan aman.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenStudentPortal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Portal Siswa (Tab Baru)</span>
          </button>
        </div>
      </div>

      {/* Configuration & Link Generator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selector & URL Display */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-emerald-400" />
              <span>Konfigurasi Tautan Siswa</span>
            </h3>

            {/* Select Mata Pelajaran */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Mata Pelajaran Ujian
              </label>
              <select
                value={selectedMapelId}
                onChange={(e) => {
                  setSelectedMapelId(e.target.value);
                  setSelectedKodeId('ALL');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {mapelList.map((m) => (
                  <option key={m.id_mapel} value={m.id_mapel}>
                    {m.nama_mapel} ({m.kelas}) • Token: {m.token_akses}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Paket Soal if available */}
            {matchingPackages.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Paket Soal Diujikan</span>
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono">Tersedia {matchingPackages.length} Paket</span>
                </label>
                <select
                  value={selectedKodeId}
                  onChange={(e) => setSelectedKodeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ALL">Semua Soal Bank Mata Pelajaran</option>
                  {matchingPackages.map((pkg) => (
                    <option key={pkg.id_kode} value={pkg.id_kode}>
                      [{pkg.id_kode}] {pkg.nama_kode} ({pkg.jumlah_soal} Soal) • Token: {pkg.token_akses}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Siswa Selector (Exclude Dummy Data) */}
            <div className="pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 mb-2">
                <input
                  type="checkbox"
                  checked={includeNisn}
                  onChange={(e) => setIncludeNisn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Sertakan NISN Spesifik Siswa dalam Tautan (Opsional)</span>
              </label>

              {includeNisn && (
                <div className="space-y-2 pl-6">
                  {realStudents.length > 0 ? (
                    <select
                      value={sampleNisn}
                      onChange={(e) => setSampleNisn(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {realStudents.map((s) => (
                        <option key={s.nisn} value={s.nisn}>
                          {s.nisn} - {s.nama_siswa} ({s.kelas})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={sampleNisn}
                      onChange={(e) => setSampleNisn(e.target.value)}
                      placeholder="Ketik NISN Siswa..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  )}
                  <p className="text-[11px] text-slate-400">
                    {dbMode === 'database_penuh' 
                      ? '✓ Data dummy disaring otomatis. Hanya siswa ril database yang dapat dipilih.' 
                      : 'Tip: Biarkan tidak dicentang agar link dapat dipakai oleh seluruh siswa satu kelas.'}
                  </p>
                </div>
              )}
            </div>

            {/* Subject Status Card */}
            {selectedMapel && (
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{selectedMapel.nama_mapel}</p>
                  <p className="text-[11px] text-slate-400">
                    Kelas: {selectedMapel.kelas} • Durasi: {activePackage?.durasi_menit || selectedMapel.durasi_menit} Menit • KKM: {selectedMapel.kkm}
                  </p>
                  {activePackage && (
                    <p className="text-[11px] text-indigo-400 mt-0.5">
                      Paket Aktif: [{activePackage.id_kode}] {activePackage.nama_kode}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Token Ujian:</span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                    {activePackage?.token_akses || selectedMapel.token_akses}
                  </span>
                </div>
              </div>
            )}

            {/* Generated URL Box */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tautan Lengkap Portal Siswa (Otomatis Memilih Mapel Ini)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={studentLink}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono select-all outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-medium text-xs transition shadow-md ${
                    copiedLink
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Parameter <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">?mode=siswa</code> memastikan navigasi Admin disembunyikan bagi peserta.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-formatted Announcement for WhatsApp/Classroom */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>Format Pengumuman Siap Kirim</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  WA & Classroom
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Salin teks di bawah ini dan bagikan langsung ke Grup WhatsApp kelas atau Google Classroom:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                {announcementTemplate}
              </div>
            </div>

            <button
              onClick={handleCopyTemplate}
              className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold transition shadow-md ${
                copiedTemplate
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {copiedTemplate ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedTemplate ? 'Pesan Pengumuman Berhasil Disalin!' : 'Salin Seluruh Format Pesan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
