import { MataPelajaran, Question, Siswa, HasilUjian, AnalisisItem } from '../types';
import { DEFAULT_MAPEL, DEFAULT_QUESTIONS, DEFAULT_SISWA, DEFAULT_HASIL } from '../data/defaultData';

const STORAGE_KEYS = {
  MAPEL: 'cbt_sheets_mapel',
  SOAL: 'cbt_sheets_soal',
  SISWA: 'cbt_sheets_siswa',
  HASIL: 'cbt_sheets_hasil',
  GAS_URL: 'cbt_gas_webapp_url',
};

// ============================================================
// COMPLETE GOOGLE APPS SCRIPT (GAS) SOURCE CODE FOR CODE.GS
// ============================================================
export const GAS_CODE_GS = `/**
 * ==============================================================================
 * CBT ONLINE BERBASIS GOOGLE SHEETS & GOOGLE APPS SCRIPT (TANPA FIREBASE/GCP)
 * ==============================================================================
 * Petunjuk Instalasi:
 * 1. Buat Spreadsheet baru di Google Sheets.
 * 2. Buat 4 Tab/Sheet dengan nama persis:
 *    - "MataPelajaran"
 *    - "BankSoal"
 *    - "DataSiswa"
 *    - "HasilUjian"
 * 3. Buka menu Extensions > Apps Script.
 * 4. Hapus semua kode default, lalu Tempel (Paste) seluruh kode di bawah ini.
 * 5. (Opsional AI) Di Project Settings > Script Properties, tambahkan "GEMINI_API_KEY".
 * 6. Klik "Deploy" > "New deployment" > Pilih type "Web app".
 *    - Description: CBT Online Backend v1
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone (Siapa saja, bahkan anonim)
 * 7. Salin URL Web App yang didapat, lalu tempelkan ke Pengaturan CBT Web App Anda!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var idMapel = e && e.parameter && e.parameter.id_mapel;
  var token = e && e.parameter && e.parameter.token;

  var response = {};

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      response = { status: 'success', message: 'Google Apps Script CBT Backend Online!', time: new Date() };
    } 
    else if (action === 'getMapel') {
      var sheetMapel = ss.getSheetByName('MataPelajaran');
      var data = sheetMapel.getDataRange().getValues();
      var headers = data[0];
      var listMapel = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0]) {
          listMapel.push({
            id_mapel: row[0],
            nama_mapel: row[1],
            kelas: row[2],
            durasi_menit: Number(row[3]) || 45,
            token_akses: String(row[4]),
            status_aktif: row[5] === true || String(row[5]).toUpperCase() === 'TRUE' || String(row[5]).toUpperCase() === 'AKTIF'
          });
        }
      }
      response = { status: 'success', data: listMapel };
    }
    else if (action === 'getSoal') {
      var sheetMapel = ss.getSheetByName('MataPelajaran');
      var mapelData = sheetMapel.getDataRange().getValues();
      var mapelObj = null;

      for (var m = 1; m < mapelData.length; m++) {
        if (mapelData[m][0] === idMapel) {
          mapelObj = {
            id: mapelData[m][0],
            nama: mapelData[m][1],
            token: String(mapelData[m][4]),
            aktif: mapelData[m][5] === true || String(mapelData[m][5]).toUpperCase() === 'TRUE' || String(mapelData[m][5]).toUpperCase() === 'AKTIF'
          };
          break;
        }
      }

      if (!mapelObj) {
        throw new Error('Mata pelajaran tidak ditemukan.');
      }
      if (!mapelObj.aktif) {
        throw new Error('Ujian untuk mata pelajaran ini saat ini NONAKTIF atau belum dibuka oleh guru.');
      }
      if (token && mapelObj.token && token.trim().toUpperCase() !== mapelObj.token.trim().toUpperCase()) {
        throw new Error('Token ujian tidak cocok.');
      }

      var sheetSoal = ss.getSheetByName('BankSoal');
      var soalData = sheetSoal.getDataRange().getValues();
      var listSoal = [];

      for (var s = 1; s < soalData.length; s++) {
        var r = soalData[s];
        if (r[1] === idMapel) {
          var opsi = null;
          if (r[5]) {
            try { opsi = JSON.parse(r[5]); } catch(err) { opsi = r[5]; }
          }
          // Catatan: Kunci Jawaban sengaja TIDAK dikirimkan ke frontend demi keamanan ujian!
          listSoal.push({
            id_soal: r[0],
            id_mapel: r[1],
            jenis_soal: r[2],
            pertanyaan: r[3],
            url_gambar: r[4] || '',
            opsi_json: opsi,
            bobot: Number(r[7]) || 1
          });
        }
      }

      response = { status: 'success', mapel: mapelObj, data: listSoal };
    }
    else {
      response = { status: 'error', message: 'Aksi tidak dikenal.' };
    }
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response = {};

  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'submitJawaban';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'submitJawaban') {
      var idMapel = payload.id_mapel;
      var nisn = payload.nisn;
      var namaSiswa = payload.nama_siswa || '';
      var kelas = payload.kelas || '';
      var jawabanSiswa = payload.jawaban || {};
      var durasiMenit = payload.durasi_menit || 0;
      var pelanggaran = payload.pelanggaran_curang || 0;

      // 1. Ambil Bank Soal dari Spreadsheet untuk penilaian di server
      var sheetSoal = ss.getSheetByName('BankSoal');
      var soalData = sheetSoal.getDataRange().getValues();
      var bankSoal = [];

      for (var s = 1; s < soalData.length; s++) {
        var r = soalData[s];
        if (r[1] === idMapel) {
          bankSoal.push({
            id_soal: r[0],
            id_mapel: r[1],
            jenis_soal: r[2],
            pertanyaan: r[3],
            url_gambar: r[4],
            opsi_json: r[5],
            kunci_jawaban_json: r[6],
            bobot: Number(r[7]) || 1
          });
        }
      }

      // 2. Hitung Nilai Otomatis sesuai rumus CBT
      var hasil = hitungSkorOtomatis(bankSoal, jawabanSiswa);

      // 3. Simpan Rekap ke Tab HasilUjian
      var sheetHasil = ss.getSheetByName('HasilUjian');
      var idHasil = 'H-' + new Date().getTime();
      var timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      sheetHasil.appendRow([
        idHasil,
        timestamp,
        nisn,
        namaSiswa,
        kelas,
        idMapel,
        JSON.stringify(jawabanSiswa),
        JSON.stringify(hasil.skorPerSoal),
        hasil.totalSkor,
        hasil.totalBobot,
        hasil.nilaiAkhir,
        hasil.statusKoreksi,
        pelanggaran,
        durasiMenit
      ]);

      response = {
        status: 'success',
        id_hasil: idHasil,
        skor_total: hasil.totalSkor,
        total_bobot: hasil.totalBobot,
        nilaiAkhir: hasil.nilaiAkhir,
        skorPerSoal: hasil.skorPerSoal,
        statusKoreksi: hasil.statusKoreksi
      };
    }
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function hitungSkorOtomatis(bankSoal, jawabanSiswa) {
  var rekapSkor = {};
  var totalSkorDiperoleh = 0;
  var totalBobotMaksimal = 0;
  var adaUraian = false;

  bankSoal.forEach(function(soal) {
    var idSoal = soal.id_soal;
    var jenis = soal.jenis_soal;
    var bobot = Number(soal.bobot) || 1;
    var answer = jawabanSiswa[idSoal];
    var skorSoal = 0;

    var kunci = soal.kunci_jawaban_json;
    if (typeof kunci === 'string') {
      try { kunci = JSON.parse(kunci); } catch(e) {}
    }

    totalBobotMaksimal += bobot;

    switch (jenis) {
      case 'PG':
        if (answer && String(answer).trim().toUpperCase() === String(kunci).trim().toUpperCase()) {
          skorSoal = bobot;
        }
        break;

      case 'PGK':
        if (Array.isArray(answer) && Array.isArray(kunci)) {
          var benar = 0;
          var salah = 0;
          answer.forEach(function(item) {
            if (kunci.indexOf(item) !== -1) {
              benar++;
            } else {
              salah++;
            }
          });
          var rasio = (benar - salah) / kunci.length;
          skorSoal = Math.max(0, rasio) * bobot;
        }
        break;

      case 'IS':
        if (answer) {
          var jClean = String(answer).trim().toLowerCase();
          if (Array.isArray(kunci)) {
            var match = kunci.some(function(k) { return String(k).trim().toLowerCase() === jClean; });
            if (match) skorSoal = bobot;
          } else if (String(kunci).trim().toLowerCase() === jClean) {
            skorSoal = bobot;
          }
        }
        break;

      case 'MJ':
        if (typeof answer === 'object' && answer !== null && typeof kunci === 'object') {
          var totalPasangan = Object.keys(kunci).length;
          var pasanganBenar = 0;
          for (var key in kunci) {
            if (answer[key] && String(answer[key]).trim().toLowerCase() === String(kunci[key]).trim().toLowerCase()) {
              pasanganBenar++;
            }
          }
          skorSoal = totalPasangan > 0 ? (pasanganBenar / totalPasangan) * bobot : 0;
        }
        break;

      case 'UR':
        // Uraian dievaluasi rubrik atau sementara 0 menunggu pemeriksaan manual/AI
        skorSoal = 0;
        adaUraian = true;
        break;
    }

    skorSoal = Math.round(skorSoal * 100) / 100;
    rekapSkor[idSoal] = skorSoal;
    totalSkorDiperoleh += skorSoal;
  });

  var nilaiAkhir = totalBobotMaksimal > 0 ? (totalSkorDiperoleh / totalBobotMaksimal) * 100 : 0;

  return {
    skorPerSoal: rekapSkor,
    totalSkor: Math.round(totalSkorDiperoleh * 100) / 100,
    totalBobot: totalBobotMaksimal,
    nilaiAkhir: Math.round(nilaiAkhir * 100) / 100,
    statusKoreksi: adaUraian ? 'PENDING_URAIAN' : 'SELESAI'
  };
}
`;

// ============================================================
// LOCAL SIMULATED DATABASE ENGINE (Offline / Out-of-the-box)
// ============================================================

export function getGasWebappUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
}

export function setGasWebappUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim());
}

export function getMataPelajaran(): MataPelajaran[] {
  const data = localStorage.getItem(STORAGE_KEYS.MAPEL);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(DEFAULT_MAPEL));
    return DEFAULT_MAPEL;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_MAPEL;
  }
}

export function saveMataPelajaran(mapelList: MataPelajaran[]): void {
  localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(mapelList));
}

export function getBankSoal(): Question[] {
  const data = localStorage.getItem(STORAGE_KEYS.SOAL);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_QUESTIONS));
    return DEFAULT_QUESTIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function saveBankSoal(soalList: Question[]): void {
  localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(soalList));
}

export function getDataSiswa(): Siswa[] {
  const data = localStorage.getItem(STORAGE_KEYS.SISWA);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(DEFAULT_SISWA));
    return DEFAULT_SISWA;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_SISWA;
  }
}

export function saveSiswa(siswaList: Siswa[]): void {
  localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(siswaList));
}

export function getHasilUjian(): HasilUjian[] {
  const data = localStorage.getItem(STORAGE_KEYS.HASIL);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.HASIL, JSON.stringify(DEFAULT_HASIL));
    return DEFAULT_HASIL;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_HASIL;
  }
}

export function saveHasilUjian(hasilList: HasilUjian[]): void {
  localStorage.setItem(STORAGE_KEYS.HASIL, JSON.stringify(hasilList));
}

// Reset all to default factory sample data
export function resetDatabaseToDefault(): void {
  localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(DEFAULT_MAPEL));
  localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_QUESTIONS));
  localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(DEFAULT_SISWA));
  localStorage.setItem(STORAGE_KEYS.HASIL, JSON.stringify(DEFAULT_HASIL));
}

// ============================================================
// CORE SCORING ALGORITHM (Matching Gemini Conversation Spec)
// ============================================================
export function hitungSkorOtomatis(bankSoal: Question[], jawabanSiswa: Record<string, any>) {
  const rekapSkor: Record<string, number> = {};
  let totalSkorDiperoleh = 0;
  let totalBobotMaksimal = 0;
  let adaUraian = false;

  bankSoal.forEach((soal) => {
    const idSoal = soal.id_soal;
    const jenis = soal.jenis_soal;
    const bobot = Number(soal.bobot) || 1;
    const answer = jawabanSiswa[idSoal];
    let skorSoal = 0;

    let kunci: any = soal.kunci_jawaban_json;
    if (typeof kunci === 'string' && (kunci.startsWith('[') || kunci.startsWith('{'))) {
      try {
        kunci = JSON.parse(kunci);
      } catch {
        // keep string
      }
    }

    totalBobotMaksimal += bobot;

    switch (jenis) {
      case 'PG': // Pilihan Ganda Biasa
        if (answer && String(answer).trim().toUpperCase() === String(kunci).trim().toUpperCase()) {
          skorSoal = bobot;
        }
        break;

      case 'PGK': // Pilihan Ganda Kompleks
        if (Array.isArray(answer) && Array.isArray(kunci)) {
          let benar = 0;
          let salah = 0;
          answer.forEach((item) => {
            if (kunci.includes(item)) {
              benar++;
            } else {
              salah++;
            }
          });
          const rasio = (benar - salah) / kunci.length;
          skorSoal = Math.max(0, rasio) * bobot;
        }
        break;

      case 'IS': // Isian Singkat
        if (answer) {
          const jawabanClean = String(answer).trim().toLowerCase();
          if (Array.isArray(kunci)) {
            const isMatch = kunci.some((k) => String(k).trim().toLowerCase() === jawabanClean);
            if (isMatch) skorSoal = bobot;
          } else if (String(kunci).trim().toLowerCase() === jawabanClean) {
            skorSoal = bobot;
          }
        }
        break;

      case 'MJ': // Menjodohkan / Matching
        if (typeof answer === 'object' && answer !== null && typeof kunci === 'object' && kunci !== null) {
          const totalPasangan = Object.keys(kunci).length;
          let pasanganBenar = 0;
          for (const key in kunci) {
            if (answer[key] && String(answer[key]).trim().toLowerCase() === String(kunci[key]).trim().toLowerCase()) {
              pasanganBenar++;
            }
          }
          skorSoal = totalPasangan > 0 ? (pasanganBenar / totalPasangan) * bobot : 0;
        }
        break;

      case 'UR': // Uraian / Essay
        // Keyword checking heuristics: check if significant words in kunci are present
        if (answer && typeof answer === 'string' && answer.trim().length > 0) {
          const keywords = ['apel', 'keranjang', 'total', 'sisa', 'kurang', 'kali', 'bagi', 'ekosistem', 'rantai', 'makanan', 'padi', 'ular'];
          const ansLow = answer.toLowerCase();
          const matchCount = keywords.filter(k => ansLow.includes(k)).length;
          if (matchCount >= 2) {
            skorSoal = Math.min(bobot, Math.max(bobot * 0.7, (matchCount / 4) * bobot));
          } else {
            skorSoal = bobot * 0.4;
          }
        } else {
          skorSoal = 0;
        }
        adaUraian = true;
        break;
    }

    skorSoal = Math.round(skorSoal * 100) / 100;
    rekapSkor[idSoal] = skorSoal;
    totalSkorDiperoleh += skorSoal;
  });

  const nilaiAkhir = totalBobotMaksimal > 0 ? (totalSkorDiperoleh / totalBobotMaksimal) * 100 : 0;

  return {
    skorPerSoal: rekapSkor,
    totalSkor: Math.round(totalSkorDiperoleh * 100) / 100,
    totalBobot: totalBobotMaksimal,
    nilaiAkhir: Math.round(nilaiAkhir * 100) / 100,
    statusKoreksi: (adaUraian ? 'PENDING_URAIAN' : 'SELESAI') as 'PENDING_URAIAN' | 'SELESAI',
  };
}

// ============================================================
// ITEM ANALYSIS (ANALISIS BUTIR SOAL P & D)
// ============================================================
export function hitungAnalisisButirSoal(idMapel?: string): AnalisisItem[] {
  const semuaSoal = getBankSoal();
  const semuaHasil = getHasilUjian();

  const targetSoal = idMapel ? semuaSoal.filter(s => s.id_mapel === idMapel) : semuaSoal;
  const targetHasil = idMapel ? semuaHasil.filter(h => h.id_mapel === idMapel) : semuaHasil;

  if (targetHasil.length === 0) {
    return targetSoal.map(soal => ({
      id_soal: soal.id_soal,
      id_mapel: soal.id_mapel,
      jenis: soal.jenis_soal,
      pertanyaan: soal.pertanyaan,
      bobot: soal.bobot,
      tingkat_kesukaran_P: 0.5,
      kategori_P: 'Sedang',
      daya_pembeda_D: 0.35,
      kategori_D: 'Baik',
      rekomendasi: 'Belum ada data peserta',
      jumlah_peserta: 0,
    }));
  }

  // Sort students by total score descending
  const sortedSiswa = [...targetHasil].sort((a, b) => b.nilai_akhir - a.nilai_akhir);
  const n = sortedSiswa.length;

  // 27% upper group and 27% lower group (minimum 1 each)
  const groupSize = Math.max(1, Math.round(n * 0.27));
  const upperGroup = sortedSiswa.slice(0, groupSize);
  const lowerGroup = sortedSiswa.slice(Math.max(0, n - groupSize));

  return targetSoal.map(soal => {
    const idSoal = soal.id_soal;
    const maxBobot = Number(soal.bobot) || 1;

    // Tingkat Kesukaran (P) = Rata-rata skor seluruh peserta / Bobot Maksimal Soal
    let totalSkorSemua = 0;
    targetHasil.forEach(h => {
      totalSkorSemua += (h.skor_per_soal[idSoal] || 0);
    });
    const rataRataSemua = totalSkorSemua / n;
    let P = rataRataSemua / maxBobot;
    P = Math.max(0, Math.min(1, Math.round(P * 100) / 100));

    let kategori_P: 'Mudah' | 'Sedang' | 'Sukar' = 'Sedang';
    if (P > 0.70) kategori_P = 'Mudah';
    else if (P < 0.30) kategori_P = 'Sukar';

    // Daya Pembeda (D) = (X_atas - X_bawah) / Bobot Maksimal
    let totalAtas = 0;
    upperGroup.forEach(h => {
      totalAtas += (h.skor_per_soal[idSoal] || 0);
    });
    const xAtas = totalAtas / upperGroup.length;

    let totalBawah = 0;
    lowerGroup.forEach(h => {
      totalBawah += (h.skor_per_soal[idSoal] || 0);
    });
    const xBawah = totalBawah / lowerGroup.length;

    let D = (xAtas - xBawah) / maxBobot;
    D = Math.max(-1, Math.min(1, Math.round(D * 100) / 100));

    let kategori_D: 'Sangat Baik' | 'Baik' | 'Perlu Revisi' | 'Buang / Perbaiki' = 'Baik';
    let rekomendasi = 'Soal baik dan layak dipertahankan.';

    if (D >= 0.40) {
      kategori_D = 'Sangat Baik';
      rekomendasi = 'Sangat baik, simpan permanen di Bank Soal.';
    } else if (D >= 0.30) {
      kategori_D = 'Baik';
      rekomendasi = 'Soal baik, dapat digunakan tanpa modifikasi.';
    } else if (D >= 0.20) {
      kategori_D = 'Perlu Revisi';
      rekomendasi = 'Perlu peninjauan kalimat soal atau daya pengecoh opsi.';
    } else {
      kategori_D = 'Buang / Perbaiki';
      rekomendasi = 'Daya pembeda rendah/negatif. Sebaiknya ganti atau buat ulang.';
    }

    return {
      id_soal: soal.id_soal,
      id_mapel: soal.id_mapel,
      jenis: soal.jenis_soal,
      pertanyaan: soal.pertanyaan,
      bobot: maxBobot,
      tingkat_kesukaran_P: P,
      kategori_P,
      daya_pembeda_D: D,
      kategori_D,
      rekomendasi,
      jumlah_peserta: n,
    };
  });
}
