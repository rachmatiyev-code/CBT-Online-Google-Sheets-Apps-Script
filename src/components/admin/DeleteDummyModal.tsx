import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, RotateCcw, X, ShieldAlert, Sparkles, ShieldCheck } from 'lucide-react';
import { hapusDataDummy, muatUlangDataContoh, hapusHanyaHasilDummy } from '../../services/gasService';

interface DeleteDummyModalProps {
  isOpen: boolean;
  onClose: () => void;
  countSoal: number;
  countSiswa: number;
  countHasil: number;
  countKode: number;
  onDataChanged: () => void;
}

export const DeleteDummyModal: React.FC<DeleteDummyModalProps> = ({
  isOpen,
  onClose,
  countSoal,
  countSiswa,
  countHasil,
  countKode,
  onDataChanged,
}) => {
  const [hapusSoal, setHapusSoal] = useState<boolean>(true);
  const [hapusSiswa, setHapusSiswa] = useState<boolean>(true);
  const [hapusHasil, setHapusHasil] = useState<boolean>(true);
  const [hasilScope, setHasilScope] = useState<'only_dummy' | 'all'>('only_dummy');
  const [hapusKode, setHapusKode] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectAll = (select: boolean) => {
    setHapusSoal(select);
    setHapusSiswa(select);
    setHapusHasil(select);
    setHapusKode(select);
  };

  const handleExecuteDelete = () => {
    let hasilDihapusCount = 0;
    if (hapusHasil) {
      if (hasilScope === 'only_dummy') {
        const resDummy = hapusHanyaHasilDummy();
        hasilDihapusCount = resDummy.jumlahDihapus;
      } else {
        const resAll = hapusDataDummy({ hasil: true });
        hasilDihapusCount = resAll.hasilDihapus;
      }
    }

    const res = hapusDataDummy({
      soal: hapusSoal,
      siswa: hapusSiswa,
      hasil: false,
      kode_soal: hapusKode,
    });

    onDataChanged();
    setNotification({
      type: 'success',
      message: `Berhasil menghapus: ${res.soalDihapus} butir soal, ${res.siswaDihapus} siswa, ${hasilDihapusCount} hasil ujian (${hasilScope === 'only_dummy' ? 'hanya dummy/latihan' : 'semua'}), dan ${res.kodeDihapus} kode soal dummy. 9 Mata Pelajaran standar tetap aman.`
    });

    setTimeout(() => {
      setNotification(null);
      onClose();
    }, 2000);
  };

  const handleReloadDemo = () => {
    if (confirm('Apakah Anda yakin ingin memuat kembali seluruh data dummy/contoh bawaan sistem?')) {
      muatUlangDataContoh();
      onDataChanged();
      setNotification({
        type: 'info',
        message: 'Seluruh data demo bawaan berhasil dimuat kembali!'
      });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1500);
    }
  };

  const totalTerpilih = (hapusSoal ? countSoal : 0) + 
                        (hapusSiswa ? countSiswa : 0) + 
                        (hapusHasil ? countHasil : 0) + 
                        (hapusKode ? countKode : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-rose-950/60 to-slate-900 border-b border-rose-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Hapus Data Dummy / Contoh</h3>
              <p className="text-xs text-rose-300">Bersihkan data bawaan untuk mulai menggunakan data asli sekolah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {notification && (
            <div className={`p-4 rounded-2xl text-xs flex items-center space-x-2.5 ${
              notification.type === 'success' 
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200' 
                : 'bg-blue-950/80 border border-blue-500/50 text-blue-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{notification.message}</span>
            </div>
          )}

          <div className="bg-amber-950/30 border border-amber-600/30 rounded-2xl p-4 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <span className="font-semibold text-white block mb-0.5">9 Mata Pelajaran Standar Tetap Aman</span>
              Data mata pelajaran kurikulum (Pendidikan Pancasila, Bahasa Indonesia, Matematika, dll.) tidak akan dihapus sehingga sistem tetap siap digunakan.
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-300">Pilih data yang ingin dikosongkan:</span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-violet-400 hover:underline"
                >
                  Pilih Semua
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-400 hover:underline"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            {/* Checkbox Soal */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 cursor-pointer transition">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={hapusSoal}
                  onChange={(e) => setHapusSoal(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Bank Soal Dummy</span>
                  <span className="text-[11px] text-slate-400">Soal-soal latihan bawaan</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {countSoal} soal
              </span>
            </label>

            {/* Checkbox Siswa */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 cursor-pointer transition">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={hapusSiswa}
                  onChange={(e) => setHapusSiswa(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Data Siswa Dummy</span>
                  <span className="text-[11px] text-slate-400">Akun siswa contoh (Budi Santoso, dll.)</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {countSiswa} siswa
              </span>
            </label>

            {/* Checkbox Hasil Ujian */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 transition space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={hapusHasil}
                    onChange={(e) => setHapusHasil(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Rekap Hasil Ujian</span>
                    <span className="text-[11px] text-slate-400">Pembersihan data nilai dan rekap hasil</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {countHasil} riwayat
                </span>
              </label>

              {hapusHasil && (
                <div className="pl-7 pt-1 space-y-1.5 border-t border-slate-700/40">
                  <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="modalHasilScope"
                      checked={hasilScope === 'only_dummy'}
                      onChange={() => setHasilScope('only_dummy')}
                      className="text-amber-500 bg-slate-900 border-slate-600"
                    />
                    <span className="text-amber-300 font-semibold">Hanya hapus hasil dummy/contoh</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                      Siswa Asli Aman
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="modalHasilScope"
                      checked={hasilScope === 'all'}
                      onChange={() => setHasilScope('all')}
                      className="text-rose-500 bg-slate-900 border-slate-600"
                    />
                    <span>Hapus seluruh hasil ujian (kosongkan total)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Checkbox Kode Soal */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 cursor-pointer transition">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={hapusKode}
                  onChange={(e) => setHapusKode(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Paket / Kode Soal Dummy</span>
                  <span className="text-[11px] text-slate-400">Kode asesmen bawaan</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {countKode} paket
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReloadDemo}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Muat Ulang Demo</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={totalTerpilih === 0}
              onClick={handleExecuteDelete}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Data Terpilih</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
