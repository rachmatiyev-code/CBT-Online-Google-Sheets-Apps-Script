import React, { useState } from 'react';
import { AnalisisItem, MataPelajaran } from '../../types';
import { 
  BarChart3, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Edit3, 
  Filter, 
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface EnhancedItemAnalysisProps {
  analisisData: AnalisisItem[];
  mapelList: MataPelajaran[];
  selectedMapel: string;
  onSelectMapel: (id: string) => void;
  onEditQuestion: (idSoal: string) => void;
}

export const EnhancedItemAnalysis: React.FC<EnhancedItemAnalysisProps> = ({
  analisisData,
  mapelList,
  selectedMapel,
  onSelectMapel,
  onEditQuestion,
}) => {
  const [filterKategoriD, setFilterKategoriD] = useState<string>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Filter items
  const filteredData = analisisData.filter((item) => {
    if (filterKategoriD !== 'all' && item.kategori_D !== filterKategoriD) return false;
    return true;
  });

  // Calculate high-level summary psychometric metrics
  const totalItems = analisisData.length;
  const goodItems = analisisData.filter(i => i.kategori_D === 'Sangat Baik' || i.kategori_D === 'Baik').length;
  const reviewItems = analisisData.filter(i => i.kategori_D === 'Perlu Revisi').length;
  const badItems = analisisData.filter(i => i.kategori_D === 'Buang / Perbaiki').length;
  const avgD = totalItems > 0 
    ? (analisisData.reduce((acc, i) => acc + i.daya_pembeda_D, 0) / totalItems).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 border border-teal-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Analisis Butir Soal & Efektivitas Pengecoh</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Psikometri Kelompok 27%
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Evaluasi saintifik kelayakan butir soal berdasarkan **Tingkat Kesukaran (P)**, **Daya Pembeda (D)**, 
                serta **Daya Tarik Pengecoh (Distraktor)** antara kelompok siswa atas dan bawah. Soal yang bermasalah dapat langsung diedit di tempat.
              </p>
            </div>
          </div>

          {/* Subject Filter Select */}
          <div className="shrink-0 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMapel}
              onChange={(e) => onSelectMapel(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs font-semibold text-white px-3.5 py-2.5 rounded-xl outline-none"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {mapelList.map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel} ({m.kelas})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium">Total Butir Dianalisis</p>
          <p className="text-2xl font-bold text-white mt-1">{totalItems} Soal</p>
          <p className="text-[11px] text-slate-500 mt-1">Rata-rata D: <strong className="text-teal-400">{avgD}</strong></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Kategori Baik / Ideal</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{goodItems} Soal</p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Daya pembeda memuaskan</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-amber-400 font-medium flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Revisi</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{reviewItems} Soal</p>
          <p className="text-[11px] text-amber-400/80 mt-1">D antara 0.20 s/d 0.29</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-rose-400 font-medium flex items-center space-x-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Buang / Ganti</span>
          </p>
          <p className="text-2xl font-bold text-white mt-1">{badItems} Soal</p>
          <p className="text-[11px] text-rose-400/80 mt-1">D &lt; 0.20 atau negatif</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            onClick={() => setFilterKategoriD('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterKategoriD === 'all'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({analisisData.length})
          </button>
          <button
            onClick={() => setFilterKategoriD('Sangat Baik')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterKategoriD === 'Sangat Baik'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sangat Baik
          </button>
          <button
            onClick={() => setFilterKategoriD('Baik')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterKategoriD === 'Baik'
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Baik
          </button>
          <button
            onClick={() => setFilterKategoriD('Perlu Revisi')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterKategoriD === 'Perlu Revisi'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Perlu Revisi
          </button>
          <button
            onClick={() => setFilterKategoriD('Buang / Perbaiki')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterKategoriD === 'Buang / Perbaiki'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Buang / Ganti
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center space-x-1 pr-2">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Klik baris soal untuk melihat efektivitas distraktor / pilihan jawaban</span>
        </div>
      </div>

      {/* Analysis Items List */}
      <div className="space-y-3.5">
        {filteredData.map((item) => {
          const isExpanded = expandedItemId === item.id_soal;

          let badgePClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
          if (item.kategori_P === 'Mudah') badgePClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          if (item.kategori_P === 'Sukar') badgePClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

          let badgeDClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          if (item.kategori_D === 'Sangat Baik') badgeDClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
          if (item.kategori_D === 'Perlu Revisi') badgeDClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          if (item.kategori_D === 'Buang / Perbaiki') badgeDClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold';

          return (
            <div
              key={item.id_soal}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition shadow-sm"
            >
              {/* Item Card Header */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {item.id_soal}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                      {item.id_mapel} ({item.jenis})
                    </span>
                    {/* Badge P */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badgePClass}`}>
                      P = {item.tingkat_kesukaran_P.toFixed(2)} ({item.kategori_P})
                    </span>
                    {/* Badge D */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border ${badgeDClass}`}>
                      D = {item.daya_pembeda_D.toFixed(2)} ({item.kategori_D})
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-relaxed">
                    {item.pertanyaan}
                  </p>

                  <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>Rekomendasi: <strong className="text-slate-300">{item.rekomendasi}</strong> ({item.jumlah_peserta} peserta diuji)</span>
                  </p>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => onEditQuestion(item.id_soal)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 hover:border-emerald-500/50 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Soal</span>
                  </button>

                  {item.distraktor && item.distraktor.length > 0 && (
                    <button
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id_soal)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-950/60 hover:bg-teal-900/60 text-xs font-semibold text-teal-300 border border-teal-800/60 transition"
                    >
                      <span>{isExpanded ? 'Tutup Pengecoh' : 'Analisis Pengecoh'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Distractor Analysis Sub-Panel */}
              {isExpanded && item.distraktor && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800 bg-slate-950/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Distribusi Pemilih Opsi & Evaluasi Pengecoh (Distraktor)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      *Pengecoh ideal dipilih ≥ 5% peserta dan lebih banyak dipilih kelompok bawah
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-900 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Opsi Pilihan</th>
                          <th className="py-2 px-3 text-center">Kelompok Atas (27%)</th>
                          <th className="py-2 px-3 text-center">Kelompok Bawah (27%)</th>
                          <th className="py-2 px-3 text-center">Total Pemilih</th>
                          <th className="py-2 px-3 text-center">Persentase</th>
                          <th className="py-2 px-3 text-center">Status Pengecoh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {item.distraktor.map((d, dIdx) => {
                          let statusColor = 'text-slate-300 bg-slate-800 border-slate-700';
                          if (d.status === 'Kunci') statusColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30 font-bold';
                          if (d.status === 'Efektif') statusColor = 'text-teal-300 bg-teal-500/20 border-teal-500/30';
                          if (d.status === 'Lemah') statusColor = 'text-slate-400 bg-slate-800/80 border-slate-700';
                          if (d.status === 'Menyesatkan') statusColor = 'text-rose-300 bg-rose-500/20 border-rose-500/30 font-bold';

                          return (
                            <tr key={dIdx} className="hover:bg-slate-900/40">
                              <td className="py-2 px-3 text-white font-medium">{d.opsi}</td>
                              <td className="py-2 px-3 text-center font-mono">{d.pemilih_atas} siswa</td>
                              <td className="py-2 px-3 text-center font-mono">{d.pemilih_bawah} siswa</td>
                              <td className="py-2 px-3 text-center font-mono">{d.pemilih_total} siswa</td>
                              <td className="py-2 px-3 text-center font-mono">{d.persentase}%</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] border ${statusColor}`}>
                                  {d.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
