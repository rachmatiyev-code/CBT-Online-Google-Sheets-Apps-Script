import React, { useState, useMemo } from 'react';
import {
  HasilUjian,
  Question,
  MataPelajaran,
  Siswa
} from '../../types';
import {
  Award,
  PenLine,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  User,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ArrowRight,
  Download
} from 'lucide-react';

interface ExamResultReviewTabProps {
  hasilList: HasilUjian[];
  bankSoal: Question[];
  mapelList: MataPelajaran[];
  siswaList: Siswa[];
  onOpenGrading: (hasil: HasilUjian) => void;
  onUpdateHasil: (updatedList: HasilUjian[]) => void;
}

export const ExamResultReviewTab: React.FC<ExamResultReviewTabProps> = ({
  hasilList,
  bankSoal,
  mapelList,
  siswaList,
  onOpenGrading,
  onUpdateHasil,
}) => {
  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'selesai'>('all');
  const [selectedMapel, setSelectedMapel] = useState<string>('all');
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'pending_first' | 'score_high' | 'score_low'>('pending_first');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal for full answer inspection (read-only sheet view)
  const [viewingDetailExam, setViewingDetailExam] = useState<HasilUjian | null>(null);

  // Extract unique classes
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    hasilList.forEach(h => {
      if (h.kelas) set.add(h.kelas);
    });
    return Array.from(set).sort();
  }, [hasilList]);

  // Counts
  const pendingCount = useMemo(() => {
    return hasilList.filter(h => h.status_koreksi === 'PENDING_URAIAN').length;
  }, [hasilList]);

  const selesaiCount = useMemo(() => {
    return hasilList.filter(h => h.status_koreksi === 'SELESAI').length;
  }, [hasilList]);

  const averageScore = useMemo(() => {
    if (hasilList.length === 0) return 0;
    const sum = hasilList.reduce((acc, curr) => acc + (Number(curr.nilai_akhir) || 0), 0);
    return Math.round((sum / hasilList.length) * 10) / 10;
  }, [hasilList]);

  const passedCount = useMemo(() => {
    return hasilList.filter(h => (Number(h.nilai_akhir) || 0) >= 75).length;
  }, [hasilList]);

  // Filtered & Sorted list
  const filteredAndSortedList = useMemo(() => {
    return hasilList
      .filter(item => {
        // Status filter
        if (statusFilter === 'pending' && item.status_koreksi !== 'PENDING_URAIAN') return false;
        if (statusFilter === 'selesai' && item.status_koreksi === 'PENDING_URAIAN') return false;

        // Mapel filter
        if (selectedMapel !== 'all' && item.id_mapel !== selectedMapel && item.nama_mapel !== selectedMapel) {
          return false;
        }

        // Kelas filter
        if (selectedKelas !== 'all' && item.kelas !== selectedKelas) {
          return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = item.nama_siswa.toLowerCase().includes(q);
          const matchNisn = item.nisn.toLowerCase().includes(q);
          const matchMapel = (item.nama_mapel || item.id_mapel).toLowerCase().includes(q);
          const matchId = item.id_hasil.toLowerCase().includes(q);
          if (!matchName && !matchNisn && !matchMapel && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'pending_first') {
          if (a.status_koreksi === 'PENDING_URAIAN' && b.status_koreksi !== 'PENDING_URAIAN') return -1;
          if (a.status_koreksi !== 'PENDING_URAIAN' && b.status_koreksi === 'PENDING_URAIAN') return 1;
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        }
        if (sortBy === 'newest') {
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        }
        if (sortBy === 'oldest') {
          return (a.timestamp || '').localeCompare(b.timestamp || '');
        }
        if (sortBy === 'score_high') {
          return (b.nilai_akhir || 0) - (a.nilai_akhir || 0);
        }
        if (sortBy === 'score_low') {
          return (a.nilai_akhir || 0) - (b.nilai_akhir || 0);
        }
        return 0;
      });
  }, [hasilList, statusFilter, selectedMapel, selectedKelas, searchTerm, sortBy]);

  // Helper to extract essay preview from exam submission
  const getEssayPreviewSnippet = (h: HasilUjian) => {
    const answerKeys = Object.keys(h.jawaban_siswa || {});
    // find question in bank that is UR and in student answers
    for (const key of answerKeys) {
      const q = bankSoal.find(b => b.id_soal === key);
      if (q && q.jenis_soal === 'UR') {
        const ans = h.jawaban_siswa[key];
        if (ans && typeof ans === 'string') {
          return {
            id_soal: key,
            pertanyaan: q.pertanyaan,
            jawaban: ans,
            bobot: q.bobot || 1,
            skorSekarang: h.skor_per_soal?.[key] ?? 0,
          };
        }
      }
    }

    // fallback: any answer that is a long string
    for (const key of answerKeys) {
      const ans = h.jawaban_siswa[key];
      if (typeof ans === 'string' && ans.length > 20) {
        return {
          id_soal: key,
          pertanyaan: `Soal #${key}`,
          jawaban: ans,
          bobot: 1,
          skorSekarang: h.skor_per_soal?.[key] ?? 0,
        };
      }
    }

    return null;
  };

  // Find first pending exam to grade
  const firstPendingExam = useMemo(() => {
    return hasilList.find(h => h.status_koreksi === 'PENDING_URAIAN');
  }, [hasilList]);

  // Export results to CSV
  const handleExportCSV = () => {
    if (filteredAndSortedList.length === 0) return;
    const headers = ['ID Hasil', 'Timestamp', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Skor Total', 'Total Bobot', 'Nilai Akhir', 'Status Koreksi', 'Pelanggaran Curang', 'Catatan Guru'];
    const rows = filteredAndSortedList.map(h => [
      `"${h.id_hasil}"`,
      `"${h.timestamp || ''}"`,
      `"${h.nisn}"`,
      `"${h.nama_siswa}"`,
      `"${h.kelas}"`,
      `"${h.nama_mapel || h.id_mapel}"`,
      h.skor_total,
      h.total_bobot,
      h.nilai_akhir,
      `"${h.status_koreksi}"`,
      h.pelanggaran_curang,
      `"${(h.catatan_guru || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_penilaian_cbt_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ============================================================ */}
      {/* 1. HEADER & KPI CARDS                                         */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Peninjauan Hasil & Skoring Uraian</span>
              </span>
              <span className="text-xs text-slate-400">• Penilaian Manual Guru</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Peninjauan Hasil Ujian & Koreksi Soal Uraian
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Tinjau lembar jawaban siswa yang telah selesai melaksanakan ujian, berikan penilaian manual pada soal tipe uraian/esai yang belum dinilai otomatis, serta tambahkan catatan evaluasi pembelajaran langsung ke rekap nilai.
            </p>
          </div>

          {/* Quick Action: Start Grading Next Pending */}
          {pendingCount > 0 && firstPendingExam && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => onOpenGrading(firstPendingExam)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-lg shadow-amber-500/20 cursor-pointer transform hover:-translate-y-0.5"
              >
                <PenLine className="w-4 h-4 animate-pulse" />
                <span>Koreksi Uraian Berikutnya ({pendingCount} Menunggu)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Action Attention Banner if there are pending essays */}
        {pendingCount > 0 && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Terdapat <strong>{pendingCount} berkas ujian</strong> dengan butir pertanyaan uraian yang belum dinilai otomatis. Nilai akhir sementara siswa belum mencakup skor uraian.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className="text-xs font-bold text-amber-300 underline hover:text-white shrink-0 cursor-pointer text-left"
            >
              Tampilkan Hanya Berkas Perlu Koreksi →
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Uraian */}
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Perlu Koreksi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <PenLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{pendingCount}</span>
            <span className="text-xs text-slate-400">berkas ujian</span>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">Soal uraian menunggu skor guru</p>
        </div>

        {/* Card 2: Selesai Dikoreksi */}
        <div 
          onClick={() => setStatusFilter('selesai')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'selesai'
              ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Koreksi Selesai</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{selesaiCount}</span>
            <span className="text-xs text-slate-400">berkas</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Nilai akhir sudah final</p>
        </div>

        {/* Card 3: Rata-Rata Kelas */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rata-Rata Nilai</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{averageScore}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {passedCount} dari {hasilList.length} tuntas KKM (75)
          </p>
        </div>

        {/* Card 4: Total Ujian Masuk */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-800 border-slate-600 shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Berkas</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{hasilList.length}</span>
            <span className="text-xs text-slate-400">lembar jawaban</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Dari seluruh mata pelajaran</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FILTER, SEARCH & VIEW TOOLBAR                             */}
      {/* ============================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Berkas ({hasilList.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-400 hover:text-white'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Perlu Koreksi ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('selesai')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                statusFilter === 'selesai'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesai ({selesaiCount})</span>
            </button>
          </div>

          {/* Search, Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari siswa, NISN, mapel..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="pending_first" className="bg-slate-900">Perlu Koreksi Dulu</option>
                <option value="newest" className="bg-slate-900">Terbaru</option>
                <option value="oldest" className="bg-slate-900">Terlama</option>
                <option value="score_high" className="bg-slate-900">Nilai Tertinggi</option>
                <option value="score_low" className="bg-slate-900">Nilai Terendah</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
              title="Ekspor CSV Rekap Nilai"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary filters (Mapel & Kelas dropdowns) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Mapel:</span>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {mapelList.map(m => (
                <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Kelas:</span>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-slate-400 text-[11px]">
            Menampilkan <strong className="text-white">{filteredAndSortedList.length}</strong> dari {hasilList.length} berkas
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CONTENT AREA: CARDS VIEW OR TABLE VIEW                     */}
      {/* ============================================================ */}
      {filteredAndSortedList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Tidak ada berkas ujian yang sesuai kriteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau bersihkan filter status dan mata pelajaran di atas.
          </p>
          {(statusFilter !== 'all' || selectedMapel !== 'all' || selectedKelas !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSelectedMapel('all');
                setSelectedKelas('all');
                setSearchTerm('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedList.map((h) => {
            const isPending = h.status_koreksi === 'PENDING_URAIAN';
            const essaySnippet = getEssayPreviewSnippet(h);

            return (
              <div
                key={h.id_hasil}
                className={`bg-slate-900 rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group ${
                  isPending
                    ? 'border-amber-500/50 hover:border-amber-400 bg-gradient-to-b from-amber-950/20 to-slate-900'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Badge & Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1 animate-pulse">
                          <PenLine className="w-3 h-3" />
                          <span>Menunggu Koreksi Uraian</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Koreksi Selesai</span>
                        </span>
                      )}
                    </div>

                    {/* Live Grade / Final Score */}
                    <div className="text-right">
                      <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${
                        h.nilai_akhir >= 75 ? 'text-emerald-400' : isPending ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {h.nilai_akhir}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                        {h.skor_total} / {h.total_bobot} poin
                      </span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition truncate" title={h.nama_siswa}>
                      {h.nama_siswa}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>NISN: {h.nisn}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-sans text-[11px]">
                        Kelas {h.kelas}
                      </span>
                    </div>
                  </div>

                  {/* Subject & Timing Meta */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mata Pelajaran:</span>
                      <span className="font-semibold text-indigo-300 truncate max-w-[160px]">{h.nama_mapel || h.id_mapel}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{h.timestamp || '-'}</span>
                      </span>
                      <span className="flex items-center space-x-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{h.durasi_menit} mnt</span>
                      </span>
                    </div>
                    {h.pelanggaran_curang > 0 && (
                      <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-rose-400">
                        <span className="flex items-center space-x-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Peringatan Keluar Tab:</span>
                        </span>
                        <span className="font-bold">{h.pelanggaran_curang}x</span>
                      </div>
                    )}
                  </div>

                  {/* Essay Snippet Preview */}
                  {essaySnippet ? (
                    <div className="space-y-1 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/60">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300 flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-indigo-400" />
                          <span>Jawaban Soal Uraian:</span>
                        </span>
                        <span className="font-mono text-emerald-400">
                          Skor: {essaySnippet.skorSekarang}/{essaySnippet.bobot}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed font-sans">
                        "{essaySnippet.jawaban}"
                      </p>
                    </div>
                  ) : null}

                  {/* Teacher Feedback Note if available */}
                  {h.catatan_guru && (
                    <div className="text-[11px] text-slate-400 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
                      <strong className="text-indigo-300 block">Catatan Guru:</strong>
                      <span className="italic line-clamp-1">{h.catatan_guru}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenGrading(h)}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-md cursor-pointer ${
                      isPending
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>{isPending ? 'Koreksi & Beri Skor Uraian' : 'Ubah Skor / Evaluasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingDetailExam(h)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                    title="Lihat Lembar Jawaban Lengkap"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Siswa</th>
                  <th className="p-3.5">Kelas</th>
                  <th className="p-3.5">Mata Pelajaran</th>
                  <th className="p-3.5">Skor / Bobot</th>
                  <th className="p-3.5">Nilai Akhir</th>
                  <th className="p-3.5">Waktu</th>
                  <th className="p-3.5">Catatan Guru</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAndSortedList.map((h) => {
                  const isPending = h.status_koreksi === 'PENDING_URAIAN';
                  return (
                    <tr key={h.id_hasil} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-sans">
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1 animate-pulse">
                            <PenLine className="w-2.5 h-2.5" />
                            <span>PENDING URAIAN</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SELESAI
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans font-medium text-white">
                        <div>{h.nama_siswa}</div>
                        <div className="text-[11px] font-mono text-slate-400">{h.nisn}</div>
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {h.kelas}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-indigo-300">
                        {h.nama_mapel || h.id_mapel}
                      </td>
                      <td className="p-3.5 font-bold">
                        {h.skor_total} / {h.total_bobot}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-black ${
                          h.nilai_akhir >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {h.nilai_akhir}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px] font-sans">
                        {h.timestamp}
                      </td>
                      <td className="p-3.5 font-sans text-slate-400 max-w-xs truncate" title={h.catatan_guru || '-'}>
                        {h.catatan_guru || '-'}
                      </td>
                      <td className="p-3.5 text-right font-sans whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => onOpenGrading(h)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                              isPending
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            <span>{isPending ? 'Koreksi' : 'Ubah Skor'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewingDetailExam(h)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL DETAIL LEMBAR JAWABAN SISWA LENGKAP                 */}
      {/* ============================================================ */}
      {viewingDetailExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lembar Jawaban Lengkap Siswa</h3>
                  <p className="text-xs text-slate-400">
                    {viewingDetailExam.nama_siswa} (NISN: {viewingDetailExam.nisn}) • {viewingDetailExam.nama_mapel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDetailExam(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Score Recap Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Nilai Akhir:</span>
                  <span className={`text-xl font-bold font-mono ${
                    viewingDetailExam.nilai_akhir >= 75 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {viewingDetailExam.nilai_akhir}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Total Skor:</span>
                  <span className="text-white font-mono font-bold text-sm">
                    {viewingDetailExam.skor_total} / {viewingDetailExam.total_bobot}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Status Koreksi:</span>
                  <span className={viewingDetailExam.status_koreksi === 'PENDING_URAIAN' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {viewingDetailExam.status_koreksi}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Pelanggaran Curang:</span>
                  <span className={viewingDetailExam.pelanggaran_curang > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {viewingDetailExam.pelanggaran_curang} kali
                  </span>
                </div>
              </div>

              {/* Answers Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rincian Jawaban Siswa per Butir Soal:</h4>
                {Object.keys(viewingDetailExam.jawaban_siswa || {}).map((idSoal, idx) => {
                  const q = bankSoal.find(b => b.id_soal === idSoal);
                  const studentAns = viewingDetailExam.jawaban_siswa[idSoal];
                  const score = viewingDetailExam.skor_per_soal?.[idSoal] ?? 0;
                  const isUraian = q ? q.jenis_soal === 'UR' : typeof studentAns === 'string' && studentAns.length > 20;

                  return (
                    <div key={idSoal} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">
                          #{idx + 1}. Butir {idSoal} {q ? `(${q.jenis_soal})` : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-emerald-400">
                          Skor: {score} / {q?.bobot || 1}
                        </span>
                      </div>
                      {q && <p className="text-slate-300 font-sans">{q.pertanyaan}</p>}
                      <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                        {typeof studentAns === 'object' ? JSON.stringify(studentAns, null, 2) : String(studentAns)}
                      </div>
                      {isUraian && (
                        <p className="text-[10px] text-amber-300 flex items-center space-x-1">
                          <PenLine className="w-3 h-3" />
                          <span>Pertanyaan tipe uraian dapat dinilai secara manual oleh guru.</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setViewingDetailExam(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const exam = viewingDetailExam;
                  setViewingDetailExam(null);
                  onOpenGrading(exam);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Buka Form Skoring Uraian</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
