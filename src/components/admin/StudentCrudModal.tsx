import React, { useState, useEffect } from 'react';
import { Siswa } from '../../types';
import { X, Save, AlertCircle, RefreshCw, KeyRound, User, GraduationCap } from 'lucide-react';

interface StudentCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswa: Siswa | null; // null = add new
  onSave: (savedSiswa: Siswa) => void;
}

export const StudentCrudModal: React.FC<StudentCrudModalProps> = ({
  isOpen,
  onClose,
  siswa,
  onSave,
}) => {
  const isEditing = Boolean(siswa);

  const [nisn, setNisn] = useState<string>('');
  const [namaSiswa, setNamaSiswa] = useState<string>('');
  const [kelas, setKelas] = useState<string>('3-A');
  const [pinSiswa, setPinSiswa] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (siswa) {
      setNisn(siswa.nisn);
      setNamaSiswa(siswa.nama_siswa);
      setKelas(siswa.kelas);
      setPinSiswa(siswa.pin_siswa);
    } else {
      const autoNisn = Math.floor(10000 + Math.random() * 90000).toString();
      const autoPin = Math.floor(1000 + Math.random() * 9000).toString();
      setNisn(autoNisn);
      setNamaSiswa('');
      setKelas('3-A');
      setPinSiswa(autoPin);
    }
    setErrorMessage(null);
  }, [siswa, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPinSiswa(randomPin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nisn.trim()) {
      setErrorMessage('Nomor NISN / ID Siswa wajib diisi.');
      return;
    }
    if (!namaSiswa.trim()) {
      setErrorMessage('Nama Lengkap Siswa wajib diisi.');
      return;
    }
    if (!kelas.trim()) {
      setErrorMessage('Kelas wajib diisi.');
      return;
    }
    if (!pinSiswa.trim()) {
      setErrorMessage('PIN Ujian Siswa wajib diisi.');
      return;
    }

    const payload: Siswa = {
      nisn: nisn.trim(),
      nama_siswa: namaSiswa.trim(),
      kelas: kelas.trim(),
      pin_siswa: pinSiswa.trim(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md text-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h3 className="font-bold text-lg text-white">
              {isEditing ? `Edit Siswa: ${siswa?.nama_siswa}` : 'Tambah Data Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              Sinkronisasi kartu peserta dengan sheet DataSiswa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* NISN */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nomor Induk Siswa Nasional (NISN / No. Peserta) *
            </label>
            <input
              type="text"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
              disabled={isEditing}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              placeholder="cth: 12345"
            />
          </div>

          {/* Nama Siswa */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama Lengkap Siswa *</span>
            </label>
            <input
              type="text"
              value={namaSiswa}
              onChange={(e) => setNamaSiswa(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="cth: Ahmad Fauzi Prasetyo"
            />
          </div>

          {/* Kelas */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>Rombongan Belajar / Kelas *</span>
            </label>
            <input
              type="text"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="cth: 3-A, 5-B, atau X MIPA 1"
            />
          </div>

          {/* PIN Siswa with Random Button */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>PIN Ujian Siswa (4-6 Karakter) *</span>
              </span>
              <button
                type="button"
                onClick={handleGeneratePin}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Acak PIN Baru</span>
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                value={pinSiswa}
                onChange={(e) => setPinSiswa(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="cth: 1122"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              PIN ini digunakan siswa saat login bersama dengan NISN untuk autentikasi ujian.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Siswa' : 'Tambahkan Siswa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
