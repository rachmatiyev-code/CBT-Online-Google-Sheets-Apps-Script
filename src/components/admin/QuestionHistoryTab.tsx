import React, { useState } from 'react';
import { RiwayatPaketSoal, Question, MataPelajaran } from '../../types';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  PackagePlus, 
  BookOpen, 
  Layers, 
  Calendar, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface QuestionHistoryTabProps {
  historyList: RiwayatPaketSoal[];
  mapelList: MataPelajaran[];
  currentBankSoal: Question[];
  onDeployPackage: (paket: RiwayatPaketSoal, targetMapelId: string, replaceExisting: boolean) => void;
  onDeletePackage: (idPaket: string) => void;
  onCreatePackageFromBank: (topik: string, idMapel: string) => void;
}

export const QuestionHistoryTab: React.FC<QuestionHistoryTabProps> = ({
  historyList,
  mapelList,
  currentBankSoal,
  onDeployPackage,
  onDeletePackage,
  onCreatePackageFromBank,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(historyList[0]?.id_paket || null);
  const [deployModalPaket, setDeployModalPaket] = useState<RiwayatPaketSoal | null>(null);
  const [deployTargetMapel, setDeployTargetMapel] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [deploySuccessMsg, setDeploySuccessMsg] = useState<string | null>(null);

  // Modal create package from current bank
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPackageTopic, setNewPackageTopic] = useState<string>('');
  const [newPackageMapel, setNewPackageMapel] = useState<string>(mapelList[0]?.id_mapel || '');

  const openDeployModal = (paket: RiwayatPaketSoal) => {
    setDeployModalPaket(paket);
    setDeployTargetMapel(paket.id_mapel_target || mapelList[0]?.id_mapel || '');
    setReplaceExisting(false);
  };

  const handleConfirmDeploy = () => {
    if (!deployModalPaket) return;
    onDeployPackage(deployModalPaket, deployTargetMapel, replaceExisting);
    const targetMapelName = mapelList.find(m => m.id_mapel === deployTargetMapel)?.nama_mapel || deployTargetMapel;
    setDeploySuccessMsg(
      `Paket "${deployModalPaket.topik}" (${deployModalPaket.soal_list.length} soal) berhasil dideploy ulang ke ${targetMapelName}!`
    );
    setDeployModalPaket(null);
    setTimeout(() => setDeploySuccessMsg(null), 4000);
  };

  const handleExportJson = (paket: RiwayatPaketSoal) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(paket, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `paket_${paket.id_paket}_${paket.topik.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveCurrentAsPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackageTopic.trim()) return;
    onCreatePackageFromBank(newPackageTopic.trim(), newPackageMapel);
    setShowCreateModal(false);
    setNewPackageTopic('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <History className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Riwayat Paket Soal & Re-deployment</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {historyList.length} Paket Tersimpan
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Semua paket soal yang dihasilkan oleh AI Generator atau disimpan secara manual tersimpan dalam arsip riwayat. 
                Anda dapat meninjau, mengunduh, atau **mendeploy ulang** ke Bank Soal aktif kapan saja dalam 1-klik!
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/30 transition shrink-0"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Simpan Bank Soal Saat Ini Sebagai Paket</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {deploySuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{deploySuccessMsg}</span>
        </div>
      )}

      {/* History Packages List */}
      {historyList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Belum Ada Riwayat Paket Soal</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Gunakan Generator AI di Tab "Generator Soal AI" atau klik tombol di atas untuk membungkus soal aktif menjadi paket riwayat.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyList.map((paket) => {
            const isExpanded = expandedId === paket.id_paket;
            return (
              <div
                key={paket.id_paket}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg transition"
              >
                {/* Package Main Row Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {paket.id_paket}
                      </span>
                      <h3 className="font-bold text-base text-white">{paket.topik}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {paket.tingkat} • {paket.kelas}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {paket.jumlah_soal} Butir Soal ({paket.bentuk_soal})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>Target: <strong className="text-slate-300">{paket.nama_mapel}</strong> ({paket.id_mapel_target})</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Dibuat: {paket.timestamp}</span>
                      </span>
                      {paket.prompt_tambahan && (
                        <span className="text-slate-400 italic">
                          "Prompt: {paket.prompt_tambahan.slice(0, 55)}..."
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => openDeployModal(paket)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                      title="Deploy paket soal ini kembali ke Bank Soal aktif"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Deploy Ulang</span>
                    </button>

                    <button
                      onClick={() => handleExportJson(paket)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Unduh Paket sebagai file JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Hapus paket riwayat "${paket.topik}"?`)) {
                          onDeletePackage(paket.id_paket);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                      title="Hapus paket riwayat ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : paket.id_paket)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                      title={isExpanded ? 'Tutup Pratinjau' : 'Buka Pratinjau Soal'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Questions Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Daftar Butir Soal di Dalam Paket ({paket.soal_list.length} Butir)
                    </p>
                    <div className="space-y-2.5">
                      {paket.soal_list.map((q, idx) => (
                        <div
                          key={q.id_soal || idx}
                          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-emerald-400">
                              No. {idx + 1} ({q.jenis_soal}) • Bobot: {q.bobot} Poin
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">{q.id_soal}</span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">{q.pertanyaan}</p>
                          {q.jenis_soal === 'PG' && Array.isArray(q.opsi_json) && (
                            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400 pl-2">
                              {q.opsi_json.map((opt, oIdx) => (
                                <div key={oIdx} className="truncate">
                                  <span className="font-semibold text-slate-300">
                                    {['A', 'B', 'C', 'D'][oIdx]}.
                                  </span>{' '}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-[11px] pt-1 border-t border-slate-800/60 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                            <span>
                              Kunci:{' '}
                              <strong className="text-emerald-400">
                                {typeof q.kunci_jawaban_json === 'object'
                                  ? JSON.stringify(q.kunci_jawaban_json)
                                  : String(q.kunci_jawaban_json)}
                              </strong>
                            </span>
                            {q.pembahasan && (
                              <span className="italic text-slate-400">
                                Pembahasan: {q.pembahasan}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy Re-confirmation Modal */}
      {deployModalPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md text-slate-200 shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                <span>Deploy Ulang Paket Soal</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Paket: <strong className="text-slate-200">{deployModalPaket.topik}</strong> ({deployModalPaket.soal_list.length} butir)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pilih Target Mata Pelajaran:
              </label>
              <select
                value={deployTargetMapel}
                onChange={(e) => setDeployTargetMapel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
              >
                {mapelList.map((m) => (
                  <option key={m.id_mapel} value={m.id_mapel}>
                    {m.id_mapel} - {m.nama_mapel} ({m.kelas})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="deployMode"
                  checked={!replaceExisting}
                  onChange={() => setReplaceExisting(false)}
                  className="text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span><strong>Tambahkan</strong> ke soal yang sudah ada di mapel target</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="deployMode"
                  checked={replaceExisting}
                  onChange={() => setReplaceExisting(true)}
                  className="text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span><strong>Gantikan seluruh soal</strong> mapel target dengan paket ini</span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeployModalPaket(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeploy}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Konfirmasi Deploy Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Package from current Bank */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveCurrentAsPackage}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md text-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-indigo-400" />
                <span>Simpan Paket Baru dari Bank Soal</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simpan butir soal aktif saat ini menjadi paket versi tersimpan untuk kebutuhan arsip dan deploy ulang.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama / Topik Paket Soal *
              </label>
              <input
                type="text"
                value={newPackageTopic}
                onChange={(e) => setNewPackageTopic(e.target.value)}
                required
                placeholder="cth: Ulangan Harian Bab 3 - Persiapan UTS"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pilih Sumber Mapel Bank Soal:
              </label>
              <select
                value={newPackageMapel}
                onChange={(e) => setNewPackageMapel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
              >
                {mapelList.map((m) => {
                  const count = currentBankSoal.filter(s => s.id_mapel === m.id_mapel).length;
                  return (
                    <option key={m.id_mapel} value={m.id_mapel}>
                      {m.nama_mapel} ({count} Soal Aktif)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Simpan Paket</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
