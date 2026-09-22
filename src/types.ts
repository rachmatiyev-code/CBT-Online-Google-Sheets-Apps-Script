export type QuestionType = 'PG' | 'PGK' | 'MJ' | 'IS' | 'UR';

export interface Question {
  id_soal: string;
  id_mapel: string;
  jenis_soal: QuestionType;
  pertanyaan: string;
  url_gambar?: string;
  opsi_json?: string[] | { kiri: string[]; kanan: string[] } | null;
  kunci_jawaban_json: string | string[] | Record<string, string>;
  bobot: number;
  pembahasan?: string;
}

export interface MataPelajaran {
  id_mapel: string;
  nama_mapel: string;
  kelas: string;
  durasi_menit: number;
  token_akses: string;
  kkm: number;
  status_aktif: boolean;
  acak_soal: boolean;
  acak_opsi: boolean;
  tampilkan_nilai: boolean;
  tampilkan_pembahasan: boolean;
  anti_curang: boolean;
  maks_pelanggaran: number;
}

export interface Siswa {
  nisn: string;
  nama_siswa: string;
  kelas: string;
  pin_siswa: string;
}

export interface HasilUjian {
  id_hasil: string;
  timestamp: string;
  nisn: string;
  nama_siswa: string;
  kelas: string;
  id_mapel: string;
  nama_mapel: string;
  jawaban_siswa: Record<string, any>;
  skor_per_soal: Record<string, number>;
  skor_total: number;
  total_bobot: number;
  nilai_akhir: number;
  status_koreksi: 'SELESAI' | 'PENDING_URAIAN';
  pelanggaran_curang: number;
  durasi_menit: number;
}

export interface DistraktorInfo {
  opsi: string;
  pemilih_total: number;
  persentase: number;
  pemilih_atas: number;
  pemilih_bawah: number;
  is_kunci: boolean;
  status: 'Kunci' | 'Efektif' | 'Lemah' | 'Menyesatkan';
}

export interface AnalisisItem {
  id_soal: string;
  id_mapel: string;
  jenis: QuestionType;
  pertanyaan: string;
  bobot: number;
  tingkat_kesukaran_P: number;
  kategori_P: 'Mudah' | 'Sedang' | 'Sukar';
  daya_pembeda_D: number;
  kategori_D: 'Sangat Baik' | 'Baik' | 'Perlu Revisi' | 'Buang / Perbaiki';
  rekomendasi: string;
  jumlah_peserta: number;
  distraktor?: DistraktorInfo[];
}

export interface RiwayatPaketSoal {
  id_paket: string;
  timestamp: string;
  topik: string;
  prompt_tambahan?: string;
  tingkat: string;
  kelas: string;
  id_mapel_target: string;
  nama_mapel: string;
  bentuk_soal: string;
  jumlah_soal: number;
  soal_list: Question[];
}

export type ViewMode = 'login' | 'ujian' | 'hasil' | 'admin';
export type AdminTab = 'sheets' | 'analisis' | 'ai-generator' | 'riwayat-soal' | 'share-link' | 'gas-setup' | 'hasil-rekap' | 'api-key';
