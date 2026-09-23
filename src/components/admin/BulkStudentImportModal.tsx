import React, { useState, useMemo } from 'react';
import { Siswa } from '../../types';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  GraduationCap, 
  RefreshCw, 
  Trash2, 
  HelpCircle,
  Sparkles,
  Check
} from 'lucide-react';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClasses: string[];
  onImport: (newSiswaList: Siswa[], mode: 'append' | 'replace') => void;
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose,
  existingClasses,
  onImport,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [defaultKelas, setDefaultKelas] = useState<string>(() => existingClasses[0] || '5-A');
  const [customKelas, setCustomKelas] = useState<string>('');
  const [isCustomKelas, setIsCustomKelas] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoGeneratePin, setAutoGeneratePin] = useState<boolean>(true);

  // Sample data button helper
  const handleLoadSample = () => {
    const sample = `2024001\tAhmad Fauzi Prasetyo\t5-A\t1234
2024002\tBudi Santoso\t5-A\t1235
2024003\tCitra Lestari\t5-A\t1236
2024004\tDewi Anggraini\t5-A\t1237
2024005\tEko Prasetyo\t5-A\t1238`;
    setRawText(sample);
  };

  const handleLoadSampleNamesOnly = () => {
    const sample = `Fajar Hidayat
Gita Permata
Hendra Setiawan
Indah Kusuma
Joko Widodo`;
    setRawText(sample);
  };

  const activeTargetClass = (isCustomKelas ? customKelas.trim() : defaultKelas) || '5-A';

  // Parse pasted raw text into preview list
  const parsedStudents: Siswa[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const result: Siswa[] = [];

    lines.forEach((line, index) => {
      // Split by tab (Excel/Google Sheets standard) or comma or semicolon or pipe
      let parts = line.split('\t');
      if (parts.length === 1 && line.includes(',')) {
        parts = line.split(',');
      } else if (parts.length === 1 && line.includes(';')) {
        parts = line.split(';');
      }

      const cleanParts = parts.map(p => p.trim());

      let nisn = '';
      let nama = '';
      let kelas = activeTargetClass;
      let pin = '';

      if (cleanParts.length === 1) {
        // Only name is provided
        nama = cleanParts[0];
        nisn = (10000 + index + Math.floor(Math.random() * 500)).toString();
      } else if (cleanParts.length === 2) {
        // [NISN, Nama] or [Nama, Kelas]
        const firstIsNumeric = /^\d+$/.test(cleanParts[0]);
        if (firstIsNumeric) {
          nisn = cleanParts[0];
          nama = cleanParts[1];
        } else {
          nama = cleanParts[0];
          kelas = cleanParts[1] || activeTargetClass;
          nisn = (10000 + index + Math.floor(Math.random() * 500)).toString();
        }
      } else if (cleanParts.length === 3) {
        // [NISN, Nama, Kelas]
        nisn = cleanParts[0];
        nama = cleanParts[1];
        kelas = cleanParts[2] || activeTargetClass;
      } else {
        // [NISN, Nama, Kelas, PIN, ...]
        nisn = cleanParts[0];
        nama = cleanParts[1];
        kelas = cleanParts[2] || activeTargetClass;
        pin = cleanParts[3];
      }

      // If PIN is blank or auto-generate is active
      if (!pin || autoGeneratePin) {
        pin = (1000 + ((index * 37 + 1234) % 8900)).toString();
      }

      if (nama) {
        result.push({
          nisn: nisn || (10000 + index).toString(),
          nama_siswa: nama,
          kelas: kelas || activeTargetClass,
          pin_siswa: pin,
        });
      }
    });

    return result;
  }, [rawText, activeTargetClass, autoGeneratePin]);

  if (!isOpen) return null;

  const handleConfirmImport = () => {
    if (parsedStudents.length === 0) return;
    onImport(parsedStudents, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl text-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Salin & Tempel Data Siswa dari Excel / Teks
              </h3>
              <p className="text-xs text-slate-400">
                Impor massal data siswa dan kelas secara instan langsung dari Microsoft Excel atau Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instructions and Format Samples */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Clipboard className="w-4 h-4 text-emerald-400" />
                <span>Format yang Didukung:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                >
                  Isi Contoh Kolom Excel
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleNamesOnly}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                >
                  Isi Contoh Daftar Nama Saja
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Blok baris data siswa di Microsoft Excel / Google Sheets Anda, lalu tekan <strong className="text-slate-200 font-mono">Ctrl+C</strong> (Salin) dan tekan <strong className="text-slate-200 font-mono">Ctrl+V</strong> (Tempel) di kotak input di bawah. Kolom dapat berupa:
              <br />
              • <strong className="text-emerald-300">4 Kolom:</strong> NISN | Nama Siswa | Kelas | PIN
              <br />
              • <strong className="text-emerald-300">2 Kolom:</strong> NISN | Nama Siswa (Kelas & PIN otomatis)
              <br />
              • <strong className="text-emerald-300">1 Kolom:</strong> Hanya Daftar Nama Siswa (NISN, Kelas, & PIN di-generate otomatis)
            </p>
          </div>

          {/* Target Class & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Target Kelas Bawaan:</span>
              </label>

              {!isCustomKelas ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={defaultKelas}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomKelas(true);
                      } else {
                        setDefaultKelas(e.target.value);
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    {existingClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                    <option value="__NEW__">+ Ketik Kelas Baru...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customKelas}
                    onChange={(e) => setCustomKelas(e.target.value)}
                    placeholder="cth: 6-B atau VII-C"
                    className="flex-1 bg-slate-900 border border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomKelas(false)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Batal
                  </button>
                </div>
              )}
              <span className="text-[10px] text-slate-400 mt-1 block">
                Digunakan untuk siswa yang tidak memiliki data kolom kelas.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Mode Impor Data:</span>
              </label>
              <div className="flex items-center space-x-2 pt-0.5">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Tambahkan ke daftar ada (Append)</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-rose-300">Ganti semua (Replace)</span>
                </label>
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 block">
                Pilih apakah ingin menimpa data siswa lama atau menambahkannya.
              </span>
            </div>
          </div>

          {/* Raw Textarea Paste Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                <span>Tempelkan Baris Teks Excel di Sini:</span>
                {parsedStudents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    {parsedStudents.length} Siswa Terbaca
                  </span>
                )}
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Tempelkan data siswa di sini (Ctrl+V)...&#10;Contoh:&#10;2024001	Ahmad Fauzi	5-A	1234&#10;2024002	Budi Santoso	5-A	1235"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-600 leading-relaxed shadow-inner"
            />
          </div>

          {/* Parsed Preview Table */}
          {parsedStudents.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Pratinjau Data Siswa yang Akan Disimpan ({parsedStudents.length} Siswa):
                </span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Format Valid</span>
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">NISN</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {parsedStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-white">{s.nisn}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-100">{s.nama_siswa}</td>
                        <td className="p-2.5 text-indigo-300">{s.kelas}</td>
                        <td className="p-2.5 text-emerald-400 tracking-widest">{s.pin_siswa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {parsedStudents.length > 0 ? (
              <span>Siap mengimpor <strong className="text-white">{parsedStudents.length} siswa</strong></span>
            ) : (
              <span>Tempel data teks dari Excel terlebih dahulu</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsedStudents.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Impor {parsedStudents.length} Siswa Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
