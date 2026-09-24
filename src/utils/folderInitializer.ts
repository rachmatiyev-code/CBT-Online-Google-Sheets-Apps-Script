import { MataPelajaran, Question, Siswa } from '../types';
import { 
  getMataPelajaran, 
  saveMataPelajaran, 
  getBankSoal, 
  saveBankSoal, 
  getDataSiswa, 
  saveSiswa,
  getKodeSoalList,
  saveKodeSoalList
} from '../services/gasService';

export interface CbtFolderBundle {
  appName: string;
  version: string;
  generatedAt: string;
  folders: {
    'soal/': {
      'mapel.json': MataPelajaran[];
      'soal.json': Question[];
    };
    'siswa/': {
      'siswa.json': Siswa[];
    };
    'hasil/': {
      description: string;
    };
  };
}

export type JsonCategory = 'soal' | 'mapel' | 'siswa' | 'bundle' | 'unknown';

/**
 * Detect the intended CBT Online folder category of any uploaded JSON file
 */
export function detectJsonCategory(data: any): JsonCategory {
  if (!data) return 'unknown';

  // 1. Complete Bundle
  if (
    typeof data === 'object' && 
    !Array.isArray(data) && 
    (data.folders || (data.mapel && data.soal) || (data.mapelList && data.soalList))
  ) {
    return 'bundle';
  }

  // If array, inspect first element
  if (Array.isArray(data)) {
    if (data.length === 0) return 'unknown';
    const first = data[0];
    if (typeof first !== 'object' || first === null) return 'unknown';

    // Check Question (soal.json)
    if ('id_soal' in first || 'jenis_soal' in first || ('pertanyaan' in first && 'opsi_json' in first)) {
      return 'soal';
    }

    // Check Subject (mapel.json)
    if (('id_mapel' in first && 'nama_mapel' in first) || ('token_akses' in first && 'durasi_menit' in first)) {
      return 'mapel';
    }

    // Check Student (siswa.json)
    if ('nisn' in first || ('nama_siswa' in first && 'pin_siswa' in first)) {
      return 'siswa';
    }
  }

  return 'unknown';
}

/**
 * Validate and inspect JSON structure
 */
export function validateCbtJsonData(category: JsonCategory, data: any): {
  valid: boolean;
  message: string;
  count: number;
  sampleName?: string;
} {
  if (!data) {
    return { valid: false, message: 'Berkas JSON kosong atau tidak dapat dibaca.', count: 0 };
  }

  if (category === 'bundle') {
    let mapelCount = 0;
    let soalCount = 0;
    let siswaCount = 0;

    if (data.folders) {
      mapelCount = data.folders['soal/']?.['mapel.json']?.length || 0;
      soalCount = data.folders['soal/']?.['soal.json']?.length || 0;
      siswaCount = data.folders['siswa/']?.['siswa.json']?.length || 0;
    } else {
      mapelCount = (data.mapel || data.mapelList || []).length;
      soalCount = (data.soal || data.soalList || []).length;
      siswaCount = (data.siswa || data.siswaList || []).length;
    }

    return {
      valid: true,
      message: `Arsip Bundel Lengkap CBT Online: ${soalCount} Soal, ${mapelCount} Mata Pelajaran, ${siswaCount} Siswa.`,
      count: soalCount + mapelCount + siswaCount,
      sampleName: 'Bundel CBT Lengkap'
    };
  }

  if (!Array.isArray(data)) {
    return {
      valid: false,
      message: 'Format data harus berupa daftar/array objek JSON.',
      count: 0
    };
  }

  if (data.length === 0) {
    return {
      valid: false,
      message: 'Array data JSON kosong (0 baris record).',
      count: 0
    };
  }

  if (category === 'soal') {
    const validCount = data.filter(item => item && (item.id_soal || item.pertanyaan)).length;
    return {
      valid: validCount > 0,
      message: validCount > 0 
        ? `Valid: Ditemukan ${validCount} butir soal siap dimasukkan ke folder "soal/soal.json".` 
        : 'Format soal tidak sesuai. Diperlukan properti id_soal, pertanyaan, jenis_soal.',
      count: validCount,
      sampleName: data[0]?.pertanyaan?.slice(0, 45) + '...'
    };
  }

  if (category === 'mapel') {
    const validCount = data.filter(item => item && (item.id_mapel || item.nama_mapel)).length;
    return {
      valid: validCount > 0,
      message: validCount > 0 
        ? `Valid: Ditemukan ${validCount} mata pelajaran siap dimasukkan ke folder "soal/mapel.json".` 
        : 'Format mata pelajaran tidak sesuai. Diperlukan properti id_mapel, nama_mapel, token_akses.',
      count: validCount,
      sampleName: data[0]?.nama_mapel
    };
  }

  if (category === 'siswa') {
    const validCount = data.filter(item => item && (item.nisn || item.nama_siswa)).length;
    return {
      valid: validCount > 0,
      message: validCount > 0 
        ? `Valid: Ditemukan ${validCount} siswa siap dimasukkan ke folder "siswa/siswa.json".` 
        : 'Format siswa tidak sesuai. Diperlukan properti nisn, nama_siswa, pin_siswa, kelas.',
      count: validCount,
      sampleName: `${data[0]?.nama_siswa} (${data[0]?.nisn})`
    };
  }

  return {
    valid: false,
    message: 'Struktur JSON tidak dikenali dalam format CBT Online.',
    count: 0
  };
}

/**
 * Trigger direct download of JSON file in browser
 */
export function downloadJsonFile(filename: string, data: any): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate full CBT Online folder structure bundle JSON
 */
export function buildCurrentCbtBundle(): CbtFolderBundle {
  return {
    appName: 'CBT Online Google Workspace',
    version: '2.5.0',
    generatedAt: new Date().toISOString(),
    folders: {
      'soal/': {
        'mapel.json': getMataPelajaran(),
        'soal.json': getBankSoal()
      },
      'siswa/': {
        'siswa.json': getDataSiswa()
      },
      'hasil/': {
        description: 'Subfolder "hasil/" di Google Drive dikhususkan untuk backup JSON hasil ujian siswa per sesi. Rekap utama tersimpan di Google Spreadsheet Sheet "HasilUjian".'
      }
    }
  };
}

/**
 * Download standard template JSON files for initial setup
 */
export function downloadStarterTemplate(type: 'soal' | 'mapel' | 'siswa' | 'bundle'): void {
  switch (type) {
    case 'soal':
      downloadJsonFile('soal.json', [
        {
          id_soal: 'S01',
          id_mapel: 'MATEMATIKA',
          kode_soal: 'PAKET-01',
          jenis_soal: 'PG',
          pertanyaan: 'Berapakah hasil dari 250 + 150?',
          url_gambar: '',
          opsi_json: ['300', '350', '400', '450'],
          kunci_jawaban_json: 'C',
          bobot: 1,
          pembahasan: '250 + 150 = 400.'
        },
        {
          id_soal: 'S02',
          id_mapel: 'MATEMATIKA',
          kode_soal: 'PAKET-01',
          jenis_soal: 'PGK',
          pertanyaan: 'Pilihlah bilangan yang merupakan kelipatan 5!',
          url_gambar: '',
          opsi_json: ['10', '12', '25', '33', '50'],
          kunci_jawaban_json: ['10', '25', '50'],
          bobot: 2,
          pembahasan: '10, 25, dan 50 habis dibagi 5.'
        }
      ]);
      break;

    case 'mapel':
      downloadJsonFile('mapel.json', [
        {
          id_mapel: 'MATEMATIKA',
          nama_mapel: 'Matematika Kelas 5',
          kelas: '5',
          durasi_menit: 60,
          token_akses: 'MTK5A',
          status_aktif: true,
          kkm: 75,
          kode_soal_aktif: 'ALL'
        },
        {
          id_mapel: 'IPA',
          nama_mapel: 'Ilmu Pengetahuan Alam',
          kelas: '5',
          durasi_menit: 45,
          token_akses: 'IPA5A',
          status_aktif: true,
          kkm: 75,
          kode_soal_aktif: 'ALL'
        }
      ]);
      break;

    case 'siswa':
      downloadJsonFile('siswa.json', [
        {
          nisn: '2026001',
          nama_siswa: 'Aditya Pratama',
          kelas: '5-A',
          pin_siswa: '4321',
          is_dummy: false
        },
        {
          nisn: '2026002',
          nama_siswa: 'Bunga Citra',
          kelas: '5-A',
          pin_siswa: '5678',
          is_dummy: false
        }
      ]);
      break;

    case 'bundle':
      downloadJsonFile('cbt_online_bundle.json', buildCurrentCbtBundle());
      break;
  }
}

const STORAGE_ENV_CHECK_KEY = 'cbt_env_initialized_v2';

/**
 * Automatically inspects and generates the initial JSON structure if running for the first time in a new environment
 */
export function checkAndAutoInitNewEnvironment(): {
  isNew: boolean;
  message: string;
} {
  if (typeof window === 'undefined') {
    return { isNew: false, message: 'Server context' };
  }

  const isInitialized = localStorage.getItem(STORAGE_ENV_CHECK_KEY);
  if (isInitialized) {
    return { isNew: false, message: 'Lingkungan CBT Online sudah terinisialisasi sebelumnya.' };
  }

  try {
    // Ensure all tables have starter or valid storage entries
    getMataPelajaran();
    getBankSoal();
    getDataSiswa();
    getKodeSoalList();

    localStorage.setItem(STORAGE_ENV_CHECK_KEY, new Date().toISOString());
    return {
      isNew: true,
      message: 'Lingkungan baru terdeteksi: Struktur data JSON lokal "CBT Online" berhasil diinisialisasi otomatis!'
    };
  } catch (err: any) {
    return { isNew: false, message: `Inisialisasi lingkungan gagal: ${err.message}` };
  }
}
