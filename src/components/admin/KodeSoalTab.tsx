import React, { useState } from 'react';
import { KodeSoalPaket, MataPelajaran, Question, DAFTAR_MATA_PELAJARAN } from '../../types';
import { 
  FileKey, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  HelpCircle, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Shuffle, 
  Sparkles,
  BookOpen,
  ArrowRight,
  Info
} from 'lucide-react';

interface KodeSoalTabProps {
  kodeList: KodeSoalPaket[];
  mapelList: MataPelajaran[];
  soalList: Question[];
  onSaveKode: (item: KodeSoalPaket) => void;
  onUpdateKode: (item: KodeSoalPaket) => void;
  onDeleteKode: (id_kode: string) => void;
  onSyncToMapel: (kode: KodeSoalPaket) => void;
}

export const KodeSoalTab: React.FC<KodeSoalTabProps> = ({
  kodeList,
  mapelList,
  soalList,
  onSaveKode,
  onUpdateKode,
  onDeleteKode,
  onSyncToMapel,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingKode, setEditingKode] = useState<KodeSoalPaket | null>(null);

  // Form States
  const [idKode, setIdKode] = useState<string>('');
  const [namaKode, setNamaKode] = useState<string>('');
  const [idMapel, setIdMapel] = useState<string>(DAFTAR_MATA_PELAJARAN[0]);
  const [kelas, setKelas] = useState<string>('5');
  const [tipeUjian, setTipeUjian] = useState<string>('Sumatif Akhir Semester');
  const [tokenAkses, setTokenAkses] = useState<string>('');
  const [durasiMenit, setDurasiMenit] = useState<number>(60);
  const [kkm, setKkm] = useState<number>(75);
  const [keterangan, setKeterangan] = useState<string>('');
  const [statusAktif, setStatusAktif] = useState<boolean>(true);
  const [selectedSoalMode, setSelectedSoalMode] = useState<'semua' | 'manual'>('semua');
  const [selectedSoalIds, setSelectedSoalIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingKode(null);
    const defaultMapel = DAFTAR_MATA_PELAJARAN[0];
    const prefix = defaultMapel.slice(0, 3).toUpperCase();
    const randNum = Math.floor(10 + Math.random() * 90);
    setIdKode(`ASAS-${prefix}-${randNum}`);
    setNamaKode(`Asesmen Sumatif ${defaultMapel}`);
    setIdMapel(defaultMapel);
    setKelas('5');
    setTipeUjian('Sumatif Akhir Semester');
    setTokenAkses(`TOKEN${Math.floor(100 + Math.random() * 900)}`);
    setDurasiMenit(60);
    setKkm(75);
    setKeterangan('');
    setStatusAktif(true);
    setSelectedSoalMode('semua');
    setSelectedSoalIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: KodeSoalPaket) => {
    setEditingKode(item);
    setIdKode(item.id_kode);
    setNamaKode(item.nama_kode);
    setIdMapel(item.id_mapel);
    setKelas(item.kelas);
    setTipeUjian(item.tipe_ujian);
    setTokenAkses(item.token_akses);
    setDurasiMenit(item.durasi_menit);
    setKkm(item.kkm);
    setKeterangan(item.keterangan || '');
    setStatusAktif(item.status_aktif);
    setSelectedSoalIds(item.soal_ids || []);
    setSelectedSoalMode(item.soal_ids && item.soal_ids.length > 0 ? 'manual' : 'semua');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Generate Random Token
  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTokenAkses(res);
  };

  // Auto-generate recommended code based on subject & exam type
  const handleAutoSuggestCode = (mapel: string, tipe: string) => {
    let tPrefix = 'UJN';
    if (tipe.includes('Sumatif')) tPrefix = 'ASAS';
    else if (tipe.includes('Harian')) tPrefix = 'PH';
    else if (tipe.includes('Try')) tPrefix = 'TO';
    else if (tipe.includes('Sekolah')) tPrefix = 'US';

    const words = mapel.split(' ');
    let mPrefix = '';
    if (words.length === 1) {
      mPrefix = words[0].slice(0, 3).toUpperCase();
    } else {
      mPrefix = words.map(w => w[0]).join('').toUpperCase();
    }
    const rand = Math.floor(10 + Math.random() * 90);
    return `${tPrefix}-${mPrefix}-${rand}`;
  };

  const handleMapelChange = (newMapel: string) => {
    setIdMapel(newMapel);
    if (!editingKode) {
      setIdKode(handleAutoSuggestCode(newMapel, tipeUjian));
      setNamaKode(`${tipeUjian} ${newMapel}`);
    }
  };

  const handleTipeChange = (newTipe: string) => {
    setTipeUjian(newTipe);
    if (!editingKode) {
      setIdKode(handleAutoSuggestCode(idMapel, newTipe));
      setNamaKode(`${newTipe} ${idMapel}`);
    }
  };

  // Questions available for selected subject
  const availableQuestionsForMapel = soalList.filter(s => s.id_mapel === idMapel);

  // Toggle single question selection
  const handleToggleQuestionId = (qid: string) => {
    if (selectedSoalIds.includes(qid)) {
      setSelectedSoalIds(selectedSoalIds.filter(id => id !== qid));
    } else {
      setSelectedSoalIds([...selectedSoalIds, qid]);
    }
  };

  // Submit modal form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = idKode.trim().toUpperCase();
    if (!cleanId) {
      setFormError('Kode Soal wajib diisi.');
      return;
    }

    if (!namaKode.trim()) {
      setFormError('Nama Ujian wajib diisi.');
      return;
    }

    if (!tokenAkses.trim()) {
      setFormError('Token Akses Ujian wajib diisi.');
      return;
    }

    // Determine final questions list
    let finalSoalIds: string[] = [];
    if (selectedSoalMode === 'semua') {
      finalSoalIds = availableQuestionsForMapel.map(s => s.id_soal);
    } else {
      finalSoalIds = selectedSoalIds;
      if (finalSoalIds.length === 0) {
        setFormError('Pilih minimal satu butir soal untuk kode soal ini.');
        return;
      }
    }

    const payload: KodeSoalPaket = {
      id_kode: cleanId,
      nama_kode: namaKode.trim(),
      id_mapel: idMapel,
      nama_mapel: idMapel,
      kelas: kelas.trim() || 'Semua Kelas',
      tipe_ujian: tipeUjian,
      token_akses: tokenAkses.trim().toUpperCase(),
      durasi_menit: Number(durasiMenit) || 60,
      kkm: Number(kkm) || 75,
      jumlah_soal: finalSoalIds.length,
      soal_ids: finalSoalIds,
      status_aktif: statusAktif,
      keterangan: keterangan.trim() || undefined,
      dibuat_pada: editingKode?.dibuat_pada || new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    if (editingKode) {
      onUpdateKode(payload);
    } else {
      onSaveKode(payload);
    }

    setIsModalOpen(false);
  };

  // Copy helper
  const handleCopyText = (text: string, type: 'token' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(text);
      setTimeout(() => setCopiedToken(null), 2500);
    } else {
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  // Filtered List
  const filteredList = kodeList.filter((k) => {
    const matchMapel = filterMapel === 'all' || k.id_mapel === filterMapel;
    const matchSearch = 
      k.id_kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.nama_kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.token_akses.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.tipe_ujian.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMapel && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-900 border border-violet-800/40 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
              <FileKey className="w-3.5 h-3.5" />
              <span>Menu Kode Soal & Paket Ujian CBT</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Manajemen Kode Soal & Token Ujian
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Buat kode unik untuk paket soal, kaitkan dengan mata pelajaran standar, tetapkan token dan durasi pengerjaan. Siswa dapat login langsung memilih mata pelajaran dan memasukkan token yang telah Anda buat.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-violet-900/40 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kode Soal Baru</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60">
            <p className="text-[11px] text-slate-400 font-medium">Total Kode Soal</p>
            <p className="text-xl font-bold text-white mt-0.5">{kodeList.length}</p>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60">
            <p className="text-[11px] text-emerald-400 font-medium">Sedang Dibuka (Aktif)</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">
              {kodeList.filter(k => k.status_aktif).length}
            </p>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60">
            <p className="text-[11px] text-blue-400 font-medium">Mapel Tercover</p>
            <p className="text-xl font-bold text-blue-300 mt-0.5">
              {new Set(kodeList.map(k => k.id_mapel)).size} / {DAFTAR_MATA_PELAJARAN.length}
            </p>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60">
            <p className="text-[11px] text-amber-400 font-medium">Bank Soal Terdaftar</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{soalList.length} Soal</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <label className="text-xs text-slate-400 shrink-0">Filter Mapel:</label>
          <select
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            <option value="all">Semua Mata Pelajaran ({kodeList.length})</option>
            {DAFTAR_MATA_PELAJARAN.map((m) => {
              const count = kodeList.filter(k => k.id_mapel === m).length;
              return (
                <option key={m} value={m}>
                  {m} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Kode, Nama Ujian, Token..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* List of Kode Soal */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto">
            <FileKey className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Kode Soal</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada kode soal yang cocok dengan filter. Klik tombol di bawah untuk membuat kode soal pertama Anda.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Kode Soal Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const isCopiedToken = copiedToken === item.token_akses;
            const shareUrl = `${window.location.origin}?mode=siswa&mapel=${encodeURIComponent(item.id_mapel)}`;
            const isCopiedLink = copiedLink === shareUrl;

            return (
              <div 
                key={item.id_kode}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-lg transition group"
              >
                <div>
                  {/* Top Bar: Code Badge + Status Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-black tracking-wider">
                        {item.id_kode}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {item.tipe_ujian}
                      </span>
                    </div>

                    <button
                      onClick={() => onUpdateKode({ ...item, status_aktif: !item.status_aktif })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 ${
                        item.status_aktif
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                      title="Klik untuk mengubah status buka/tutup ujian"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status_aktif ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{item.status_aktif ? 'AKTIF' : 'DITUTUP'}</span>
                    </button>
                  </div>

                  {/* Title & Subject */}
                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-violet-300 transition line-clamp-2">
                    {item.nama_kode}
                  </h3>
                  
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                    <span className="font-semibold text-slate-200">{item.id_mapel}</span>
                    <span>•</span>
                    <span>Kelas {item.kelas}</span>
                  </div>

                  {item.keterangan && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 italic">
                      "{item.keterangan}"
                    </p>
                  )}

                  {/* Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block font-sans">Durasi</span>
                      <span className="text-slate-200 font-bold">{item.durasi_menit} mnt</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block font-sans">Soal</span>
                      <span className="text-slate-200 font-bold">{item.jumlah_soal} butir</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block font-sans">KKM</span>
                      <span className="text-slate-200 font-bold">{item.kkm}</span>
                    </div>
                  </div>

                  {/* Token Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-semibold block uppercase">Token Akses Ujian:</span>
                      <span className="font-mono text-base font-black text-amber-300 tracking-wider">
                        {item.token_akses}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyText(item.token_akses, 'token')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium flex items-center space-x-1 transition"
                      title="Salin Token"
                    >
                      {isCopiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedToken ? 'Disalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onSyncToMapel(item)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-violet-950 hover:text-violet-300 text-slate-300 text-xs font-medium flex items-center space-x-1 transition"
                      title="Sinkronkan token dan durasi ke Tab Mata Pelajaran"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span className="hidden sm:inline">Sinkron Mapel</span>
                    </button>

                    <button
                      onClick={() => handleCopyText(shareUrl, 'link')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition"
                      title="Salin Tautan Langsung Siswa"
                    >
                      {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isCopiedLink ? 'Tersalin' : 'Link Siswa'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Kode Soal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus kode soal ${item.id_kode} (${item.nama_kode})?`)) {
                          onDeleteKode(item.id_kode);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Hapus Kode Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: BUAT / EDIT KODE SOAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl text-slate-200 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                  <FileKey className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {editingKode ? `Edit Kode Soal (${editingKode.id_kode})` : 'Buat Kode Soal Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Konfigurasi kode paket ujian, token pengerjaan, dan butir soal terkait
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Kode Soal & Nama Ujian */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kode Soal / Paket *
                  </label>
                  <input
                    type="text"
                    value={idKode}
                    onChange={(e) => setIdKode(e.target.value.toUpperCase())}
                    placeholder="cth: ASAS-MTK-01"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold uppercase focus:border-violet-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Ujian / Asesmen *
                  </label>
                  <input
                    type="text"
                    value={namaKode}
                    onChange={(e) => setNamaKode(e.target.value)}
                    placeholder="cth: Asesmen Sumatif Akhir Semester (ASAS)"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 2: 9 Mata Pelajaran Standard Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilihan Mata Pelajaran (9 Standar) *
                  </label>
                  <select
                    value={idMapel}
                    onChange={(e) => handleMapelChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  >
                    {DAFTAR_MATA_PELAJARAN.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tingkat Kelas
                  </label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="cth: 5 atau Semua Kelas"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Tipe Ujian & Token Akses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipe / Jenis Ujian
                  </label>
                  <select
                    value={tipeUjian}
                    onChange={(e) => handleTipeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  >
                    <option value="Sumatif Akhir Semester">Sumatif Akhir Semester (ASAS / SAS)</option>
                    <option value="Sumatif Tengah Semester">Sumatif Tengah Semester (ASTS / STS)</option>
                    <option value="Penilaian Harian">Penilaian Harian (PH)</option>
                    <option value="Try Out Ujian">Try Out Asesmen / Latihan</option>
                    <option value="Ujian Sekolah">Ujian Sekolah (US)</option>
                    <option value="Asesmen Diagnostik">Asesmen Diagnostik Awal</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Token Akses Ujian *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center space-x-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Acak Token</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tokenAkses}
                    onChange={(e) => setTokenAkses(e.target.value.toUpperCase())}
                    placeholder="cth: MTK2026"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold uppercase focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Durasi, KKM, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durasiMenit}
                    onChange={(e) => setDurasiMenit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nilai KKM
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={kkm}
                    onChange={(e) => setKkm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status Akses
                  </label>
                  <select
                    value={statusAktif ? 'aktif' : 'tutup'}
                    onChange={(e) => setStatusAktif(e.target.value === 'aktif')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500 outline-none"
                  >
                    <option value="aktif">🟢 Buka Ujian (Aktif)</option>
                    <option value="tutup">🔴 Tutup Ujian (Nonaktif)</option>
                  </select>
                </div>
              </div>

              {/* Pemilihan Butir Soal */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Tautan Soal dari Bank Soal ({availableQuestionsForMapel.length} Soal Tersedia untuk {idMapel})</span>
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="soal_mode"
                      checked={selectedSoalMode === 'semua'}
                      onChange={() => setSelectedSoalMode('semua')}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-slate-200">Gunakan Semua Soal Mapel Ini ({availableQuestionsForMapel.length} butir)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="soal_mode"
                      checked={selectedSoalMode === 'manual'}
                      onChange={() => setSelectedSoalMode('manual')}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-slate-200">Pilih Soal Tertentu ({selectedSoalIds.length} dipilih)</span>
                  </label>
                </div>

                {selectedSoalMode === 'manual' && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-800/80">
                    {availableQuestionsForMapel.length === 0 ? (
                      <p className="text-xs text-amber-400 p-2">
                        Belum ada soal terdaftar untuk mata pelajaran {idMapel}. Silakan tambah soal terlebih dahulu di tab Database Bank Soal.
                      </p>
                    ) : (
                      availableQuestionsForMapel.map((s) => {
                        const isChecked = selectedSoalIds.includes(s.id_soal);
                        return (
                          <label
                            key={s.id_soal}
                            className={`flex items-start space-x-2.5 p-2 rounded-xl text-xs cursor-pointer transition ${
                              isChecked ? 'bg-violet-950/40 border border-violet-700/60 text-white' : 'hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleQuestionId(s.id_soal)}
                              className="rounded text-violet-600 focus:ring-violet-500 mt-0.5"
                            />
                            <div className="flex-1">
                              <span className="font-mono font-bold text-violet-300 mr-2">[{s.id_soal}]</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 mr-2 font-mono">
                                {s.jenis_soal}
                              </span>
                              <span className="line-clamp-1">{s.pertanyaan}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Keterangan / Catatan Ujian */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Petunjuk / Keterangan Khusus (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="cth: Kerjakan dengan jujur, dilarang menggunakan kalkulator..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-violet-500 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-lg shadow-violet-950/40"
                >
                  {editingKode ? 'Simpan Perubahan' : 'Buat Kode Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
