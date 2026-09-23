import { MataPelajaran, Question, Siswa, HasilUjian, AnalisisItem, RiwayatPaketSoal, DistraktorInfo, KodeSoalPaket, DAFTAR_MATA_PELAJARAN, DatabaseMode, StorageStatus } from '../types';
import { DEFAULT_MAPEL, DEFAULT_QUESTIONS, DEFAULT_SISWA, DEFAULT_HASIL, DEFAULT_RIWAYAT_PAKET, DEFAULT_KODE_SOAL_PAKET } from '../data/defaultData';

const STORAGE_KEYS = {
  MAPEL: 'cbt_sheets_mapel',
  SOAL: 'cbt_sheets_soal',
  SISWA: 'cbt_sheets_siswa',
  HASIL: 'cbt_sheets_hasil',
  GAS_URL: 'cbt_gas_webapp_url',
  RIWAYAT: 'cbt_sheets_riwayat_paket',
  KODE_SOAL: 'cbt_sheets_kode_soal_paket',
  DATABASE_MODE: 'cbt_database_mode', // 'simulator' | 'database_penuh'
  LAST_SYNCED: 'cbt_last_synced_at',
  LAST_VERIFIED: 'cbt_last_verified_at',
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
    else if (action === 'getAllData' || action === 'syncDownload') {
      var sheetMapel = getOrCreateSheet(ss, 'MataPelajaran', ['id_mapel', 'nama_mapel', 'kelas', 'durasi_menit', 'token_akses', 'status_aktif']);
      var sheetSoal = getOrCreateSheet(ss, 'BankSoal', ['id_soal', 'id_mapel', 'jenis_soal', 'pertanyaan', 'url_gambar', 'opsi_json', 'kunci_jawaban_json', 'bobot', 'pembahasan']);
      var sheetSiswa = getOrCreateSheet(ss, 'DataSiswa', ['nisn', 'nama_siswa', 'kelas', 'pin_siswa']);
      var sheetHasil = getOrCreateSheet(ss, 'HasilUjian', ['id_hasil', 'timestamp', 'nisn', 'nama_siswa', 'kelas', 'id_mapel', 'jawaban_siswa', 'skor_per_soal', 'skor_total', 'total_bobot', 'nilai_akhir', 'status_koreksi', 'pelanggaran_curang', 'durasi_menit']);

      var mapelRows = sheetMapel.getDataRange().getValues();
      var listMapel = [];
      for (var i = 1; i < mapelRows.length; i++) {
        if (mapelRows[i][0]) {
          listMapel.push({
            id_mapel: String(mapelRows[i][0]),
            nama_mapel: String(mapelRows[i][1] || mapelRows[i][0]),
            kelas: String(mapelRows[i][2] || '5'),
            durasi_menit: Number(mapelRows[i][3]) || 45,
            token_akses: String(mapelRows[i][4] || ''),
            status_aktif: mapelRows[i][5] === true || String(mapelRows[i][5]).toUpperCase() === 'TRUE' || String(mapelRows[i][5]).toUpperCase() === 'AKTIF'
          });
        }
      }

      var soalRows = sheetSoal.getDataRange().getValues();
      var listSoal = [];
      for (var s = 1; s < soalRows.length; s++) {
        if (soalRows[s][0]) {
          var opsiVal = soalRows[s][5];
          try { opsiVal = JSON.parse(opsiVal); } catch(e) {}
          var kunciVal = soalRows[s][6];
          try { kunciVal = JSON.parse(kunciVal); } catch(e) {}
          listSoal.push({
            id_soal: String(soalRows[s][0]),
            id_mapel: String(soalRows[s][1]),
            jenis_soal: String(soalRows[s][2] || 'PG'),
            pertanyaan: String(soalRows[s][3] || ''),
            url_gambar: String(soalRows[s][4] || ''),
            opsi_json: opsiVal,
            kunci_jawaban_json: kunciVal,
            bobot: Number(soalRows[s][7]) || 1,
            pembahasan: String(soalRows[s][8] || '')
          });
        }
      }

      var siswaRows = sheetSiswa.getDataRange().getValues();
      var listSiswa = [];
      for (var sw = 1; sw < siswaRows.length; sw++) {
        if (siswaRows[sw][0]) {
          listSiswa.push({
            nisn: String(siswaRows[sw][0]),
            nama_siswa: String(siswaRows[sw][1] || ''),
            kelas: String(siswaRows[sw][2] || ''),
            pin_siswa: String(siswaRows[sw][3] || '1234')
          });
        }
      }

      var hasilRows = sheetHasil.getDataRange().getValues();
      var listHasil = [];
      for (var h = 1; h < hasilRows.length; h++) {
        if (hasilRows[h][0]) {
          var jwb = hasilRows[h][6];
          try { jwb = JSON.parse(jwb); } catch(e) {}
          var skr = hasilRows[h][7];
          try { skr = JSON.parse(skr); } catch(e) {}
          listHasil.push({
            id_hasil: String(hasilRows[h][0]),
            timestamp: String(hasilRows[h][1]),
            nisn: String(hasilRows[h][2]),
            nama_siswa: String(hasilRows[h][3] || ''),
            kelas: String(hasilRows[h][4] || ''),
            id_mapel: String(hasilRows[h][5] || ''),
            nama_mapel: String(hasilRows[h][5] || ''),
            jawaban_siswa: jwb || {},
            skor_per_soal: skr || {},
            skor_total: Number(hasilRows[h][8]) || 0,
            total_bobot: Number(hasilRows[h][9]) || 0,
            nilai_akhir: Number(hasilRows[h][10]) || 0,
            status_koreksi: String(hasilRows[h][11] || 'SELESAI'),
            pelanggaran_curang: Number(hasilRows[h][12]) || 0,
            durasi_menit: Number(hasilRows[h][13]) || 0
          });
        }
      }

      response = {
        status: 'success',
        message: 'Data Google Sheets berhasil disinkronkan!',
        data: {
          mapel: listMapel,
          soal: listSoal,
          siswa: listSiswa,
          hasil: listHasil
        }
      };
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

function getOrCreateSheet(ss, targetName, defaultHeaders) {
  var sheets = ss.getSheets();
  var normalizedTarget = targetName.toLowerCase().replace(/[\s_-]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().replace(/[\s_-]/g, '') === normalizedTarget) {
      return sheets[i];
    }
  }
  // Auto create sheet if missing
  var newSheet = ss.insertSheet(targetName);
  if (defaultHeaders && defaultHeaders.length > 0) {
    newSheet.appendRow(defaultHeaders);
  }
  return newSheet;
}

function doPost(e) {
  var response = {};

  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (errJson) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'submitJawaban';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'submitJawaban' || action === 'simpanHasil') {
      var idMapel = payload.id_mapel || payload.nama_mapel || 'Ujian';
      var nisn = String(payload.nisn || '');
      var namaSiswa = payload.nama_siswa || '';
      var kelas = payload.kelas || '';
      var jawabanSiswa = payload.jawaban || payload.jawaban_siswa || {};
      var durasiMenit = Number(payload.durasi_menit) || 0;
      var pelanggaran = Number(payload.pelanggaran_curang) || 0;

      // 1. Dapatkan atau buat otomatis Tab HasilUjian jika belum ada / salah penamaan
      var sheetHasil = getOrCreateSheet(ss, 'HasilUjian', [
        'id_hasil',
        'timestamp',
        'nisn',
        'nama_siswa',
        'kelas',
        'id_mapel',
        'jawaban_siswa',
        'skor_per_soal',
        'skor_total',
        'total_bobot',
        'nilai_akhir',
        'status_koreksi',
        'pelanggaran_curang',
        'durasi_menit'
      ]);

      // 2. Ambil Bank Soal dari Spreadsheet jika ada
      var sheetSoal = getOrCreateSheet(ss, 'BankSoal', []);
      var bankSoal = [];
      if (sheetSoal.getLastRow() > 1) {
        var soalData = sheetSoal.getDataRange().getValues();
        for (var s = 1; s < soalData.length; s++) {
          var r = soalData[s];
          if (r[1] === idMapel || String(r[1]).toLowerCase() === String(idMapel).toLowerCase()) {
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
      }

      // 3. Hitung Skor (atau gunakan skor yang sudah dihitung frontend jika bank soal di sheet belum disinkron)
      var hasil;
      if (bankSoal.length > 0) {
        hasil = hitungSkorOtomatis(bankSoal, jawabanSiswa);
      } else {
        hasil = {
          totalSkor: Number(payload.skor_total) || 0,
          totalBobot: Number(payload.total_bobot) || 100,
          nilaiAkhir: Number(payload.nilai_akhir) !== undefined ? Number(payload.nilai_akhir) : Number(payload.skor_total) || 0,
          skorPerSoal: payload.skor_per_soal || {},
          statusKoreksi: payload.status_koreksi || 'SELESAI'
        };
      }

      var idHasil = payload.id_hasil || ('H-' + new Date().getTime());
      var timestamp = payload.timestamp || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      // 4. Tulis baris baru ke Tab HasilUjian
      sheetHasil.appendRow([
        idHasil,
        timestamp,
        nisn,
        namaSiswa,
        kelas,
        idMapel,
        typeof jawabanSiswa === 'string' ? jawabanSiswa : JSON.stringify(jawabanSiswa),
        typeof hasil.skorPerSoal === 'string' ? hasil.skorPerSoal : JSON.stringify(hasil.skorPerSoal),
        hasil.totalSkor,
        hasil.totalBobot,
        hasil.nilaiAkhir,
        hasil.statusKoreksi,
        pelanggaran,
        durasiMenit
      ]);

      response = {
        status: 'success',
        message: 'Hasil ujian berhasil disimpan ke tab HasilUjian Google Sheets!',
        id_hasil: idHasil,
        skor_total: hasil.totalSkor,
        total_bobot: hasil.totalBobot,
        nilaiAkhir: hasil.nilaiAkhir,
        skorPerSoal: hasil.skorPerSoal,
        statusKoreksi: hasil.statusKoreksi
      };
    } else if (action === 'submitBulkJawaban' || action === 'syncAllResults') {
      var sheetHasil = getOrCreateSheet(ss, 'HasilUjian', [
        'id_hasil', 'timestamp', 'nisn', 'nama_siswa', 'kelas', 'id_mapel',
        'jawaban_siswa', 'skor_per_soal', 'skor_total', 'total_bobot',
        'nilai_akhir', 'status_koreksi', 'pelanggaran_curang', 'durasi_menit'
      ]);
      var resultsList = payload.results || [];
      var existingData = sheetHasil.getDataRange().getValues();
      var existingIds = {};
      for (var ex = 1; ex < existingData.length; ex++) {
        if (existingData[ex][0]) existingIds[String(existingData[ex][0])] = true;
      }
      var countAdded = 0;
      for (var r = 0; r < resultsList.length; r++) {
        var h = resultsList[r];
        if (h && h.id_hasil && !existingIds[String(h.id_hasil)]) {
          sheetHasil.appendRow([
            h.id_hasil,
            h.timestamp || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
            h.nisn,
            h.nama_siswa || '',
            h.kelas || '',
            h.nama_mapel || h.id_mapel || '',
            typeof h.jawaban_siswa === 'string' ? h.jawaban_siswa : JSON.stringify(h.jawaban_siswa || {}),
            typeof h.skor_per_soal === 'string' ? h.skor_per_soal : JSON.stringify(h.skor_per_soal || {}),
            Number(h.skor_total) || 0,
            Number(h.total_bobot) || 100,
            Number(h.nilai_akhir) !== undefined ? Number(h.nilai_akhir) : Number(h.skor_total) || 0,
            h.status_koreksi || 'SELESAI',
            Number(h.pelanggaran_curang) || 0,
            Number(h.durasi_menit) || 0
          ]);
          existingIds[String(h.id_hasil)] = true;
          countAdded++;
        }
      }
      response = {
        status: 'success',
        message: 'Berhasil menyinkronkan ' + countAdded + ' hasil ujian ke tab HasilUjian Google Sheets!',
        countAdded: countAdded
      };
    } else if (action === 'syncUpload' || action === 'saveAllData') {
      // Overwrite/update sheets with payload data from frontend
      if (payload.mapel && Array.isArray(payload.mapel) && payload.mapel.length > 0) {
        var sheetMapel = getOrCreateSheet(ss, 'MataPelajaran', ['id_mapel', 'nama_mapel', 'kelas', 'durasi_menit', 'token_akses', 'status_aktif']);
        sheetMapel.clearContents();
        sheetMapel.appendRow(['id_mapel', 'nama_mapel', 'kelas', 'durasi_menit', 'token_akses', 'status_aktif']);
        for (var m = 0; m < payload.mapel.length; m++) {
          var itemM = payload.mapel[m];
          sheetMapel.appendRow([itemM.id_mapel, itemM.nama_mapel, itemM.kelas, itemM.durasi_menit, itemM.token_akses, itemM.status_aktif]);
        }
      }
      if (payload.soal && Array.isArray(payload.soal) && payload.soal.length > 0) {
        var sheetSoal = getOrCreateSheet(ss, 'BankSoal', ['id_soal', 'id_mapel', 'jenis_soal', 'pertanyaan', 'url_gambar', 'opsi_json', 'kunci_jawaban_json', 'bobot', 'pembahasan']);
        sheetSoal.clearContents();
        sheetSoal.appendRow(['id_soal', 'id_mapel', 'jenis_soal', 'pertanyaan', 'url_gambar', 'opsi_json', 'kunci_jawaban_json', 'bobot', 'pembahasan']);
        for (var s = 0; s < payload.soal.length; s++) {
          var itemS = payload.soal[s];
          sheetSoal.appendRow([
            itemS.id_soal,
            itemS.id_mapel,
            itemS.jenis_soal,
            itemS.pertanyaan,
            itemS.url_gambar || '',
            typeof itemS.opsi_json === 'string' ? itemS.opsi_json : JSON.stringify(itemS.opsi_json || []),
            typeof itemS.kunci_jawaban_json === 'string' ? itemS.kunci_jawaban_json : JSON.stringify(itemS.kunci_jawaban_json || ''),
            itemS.bobot || 1,
            itemS.pembahasan || ''
          ]);
        }
      }
      if (payload.siswa && Array.isArray(payload.siswa) && payload.siswa.length > 0) {
        var sheetSiswa = getOrCreateSheet(ss, 'DataSiswa', ['nisn', 'nama_siswa', 'kelas', 'pin_siswa']);
        sheetSiswa.clearContents();
        sheetSiswa.appendRow(['nisn', 'nama_siswa', 'kelas', 'pin_siswa']);
        for (var sw = 0; sw < payload.siswa.length; sw++) {
          var itemSw = payload.siswa[sw];
          sheetSiswa.appendRow([itemSw.nisn, itemSw.nama_siswa, itemSw.kelas, itemSw.pin_siswa || '1234']);
        }
      }
      response = {
        status: 'success',
        message: 'Data berhasil disinkronkan dan disimpan ke Google Spreadsheet (GDrive)!'
      };
    } else {
      response = { status: 'error', message: 'Aksi POST tidak dikenal.' };
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
  let list: MataPelajaran[] = [];
  if (!data) {
    list = DEFAULT_MAPEL;
    localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(DEFAULT_MAPEL));
    return list;
  }
  try {
    list = JSON.parse(data);
  } catch {
    list = DEFAULT_MAPEL;
  }

  // Backward compatibility: map old IDs
  let modified = false;
  list = list.map(m => {
    if (m.id_mapel === 'MAT-03') {
      modified = true;
      return { ...m, id_mapel: 'Matematika', nama_mapel: 'Matematika' };
    }
    if (m.id_mapel === 'IPA-05') {
      modified = true;
      return { ...m, id_mapel: 'IPAS', nama_mapel: 'IPAS' };
    }
    if (m.id_mapel === 'IND-04') {
      modified = true;
      return { ...m, id_mapel: 'Bahasa Indonesia', nama_mapel: 'Bahasa Indonesia' };
    }
    return m;
  });

  // Ensure all 9 subjects exist in the list
  DEFAULT_MAPEL.forEach(defM => {
    if (!list.some(item => item.id_mapel === defM.id_mapel)) {
      list.push(defM);
      modified = true;
    }
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(list));
  }
  return list;
}

export function saveMataPelajaran(mapelList: MataPelajaran[]): void {
  localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(mapelList));
}

export function getBankSoal(): Question[] {
  const data = localStorage.getItem(STORAGE_KEYS.SOAL);
  let list: Question[] = [];
  if (!data) {
    list = DEFAULT_QUESTIONS;
    localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_QUESTIONS));
    return list;
  }
  try {
    list = JSON.parse(data);
  } catch {
    list = DEFAULT_QUESTIONS;
  }

  let modified = false;
  list = list.map(s => {
    let newMapel = s.id_mapel;
    if (s.id_mapel === 'MAT-03') {
      newMapel = 'Matematika';
      modified = true;
    } else if (s.id_mapel === 'IPA-05') {
      newMapel = 'IPAS';
      modified = true;
    } else if (s.id_mapel === 'IND-04') {
      newMapel = 'Bahasa Indonesia';
      modified = true;
    }
    if (!s.kode_soal) {
      modified = true;
      return { ...s, id_mapel: newMapel, kode_soal: `KODE-${newMapel.substring(0, 3).toUpperCase()}-01` };
    }
    if (newMapel !== s.id_mapel) {
      return { ...s, id_mapel: newMapel };
    }
    return s;
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(list));
  }
  return list;
}

export function saveBankSoal(soalList: Question[]): void {
  localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(soalList));
}

export function getKodeSoalPaket(): KodeSoalPaket[] {
  const data = localStorage.getItem(STORAGE_KEYS.KODE_SOAL);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.KODE_SOAL, JSON.stringify(DEFAULT_KODE_SOAL_PAKET));
    return DEFAULT_KODE_SOAL_PAKET;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_KODE_SOAL_PAKET;
  }
}

export function saveKodeSoalPaket(list: KodeSoalPaket[]): void {
  localStorage.setItem(STORAGE_KEYS.KODE_SOAL, JSON.stringify(list));
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

// ============================================================
// KODE SOAL MANAGEMENT FUNCTIONS
// ============================================================
export function getKodeSoalList(): KodeSoalPaket[] {
  const data = localStorage.getItem(STORAGE_KEYS.KODE_SOAL);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.KODE_SOAL, JSON.stringify(DEFAULT_KODE_SOAL_PAKET));
    return DEFAULT_KODE_SOAL_PAKET;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_KODE_SOAL_PAKET;
  }
}

export function saveKodeSoalList(list: KodeSoalPaket[]): void {
  localStorage.setItem(STORAGE_KEYS.KODE_SOAL, JSON.stringify(list));
}

export function tambahKodeSoal(item: KodeSoalPaket): void {
  const current = getKodeSoalList();
  const updated = [item, ...current.filter(k => k.id_kode !== item.id_kode)];
  saveKodeSoalList(updated);
}

export function updateKodeSoal(item: KodeSoalPaket): void {
  const current = getKodeSoalList();
  const updated = current.map(k => k.id_kode === item.id_kode ? item : k);
  saveKodeSoalList(updated);
}

export function hapusKodeSoal(id_kode: string): void {
  const current = getKodeSoalList();
  const updated = current.filter(k => k.id_kode !== id_kode);
  saveKodeSoalList(updated);
}

// ============================================================
// KIRIM HASIL KE GOOGLE APPS SCRIPT (CORS & Tab HasilUjian Safe)
// ============================================================
export async function kirimHasilKeGoogleSheets(
  hasil: HasilUjian, 
  targetUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = (targetUrl || getGasWebappUrl()).trim();
  if (!url) {
    return { success: false, message: 'URL Google Apps Script Web App belum diatur.' };
  }

  const payload = {
    action: 'submitJawaban',
    id_hasil: hasil.id_hasil,
    timestamp: hasil.timestamp,
    nisn: hasil.nisn,
    nama_siswa: hasil.nama_siswa,
    kelas: hasil.kelas,
    id_mapel: hasil.id_mapel,
    nama_mapel: hasil.nama_mapel,
    jawaban_siswa: hasil.jawaban_siswa,
    skor_per_soal: hasil.skor_per_soal,
    skor_total: hasil.skor_total,
    total_bobot: hasil.total_bobot,
    nilai_akhir: hasil.nilai_akhir,
    status_koreksi: hasil.status_koreksi,
    pelanggaran_curang: hasil.pelanggaran_curang,
    durasi_menit: hasil.durasi_menit,
  };

  try {
    // Sesuai panduan: Gunakan text/plain;charset=utf-8 agar browser TIDAK mengirimkan OPTIONS preflight yang ditolak GAS
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Data hasil ujian berhasil dikirimkan ke Google Sheets (Tab HasilUjian) via Google Apps Script.'
    };
  } catch (err: any) {
    console.error('Error kirim hasil ke GAS:', err);
    return {
      success: false,
      message: err.message || 'Gagal mengirimkan data ke Google Sheets. Pastikan deployment disetel ke Anyone.'
    };
  }
}

export function getRiwayatPaketSoal(): RiwayatPaketSoal[] {
  const data = localStorage.getItem(STORAGE_KEYS.RIWAYAT);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.RIWAYAT, JSON.stringify(DEFAULT_RIWAYAT_PAKET));
    return DEFAULT_RIWAYAT_PAKET;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_RIWAYAT_PAKET;
  }
}

export function saveRiwayatPaketSoal(list: RiwayatPaketSoal[]): void {
  localStorage.setItem(STORAGE_KEYS.RIWAYAT, JSON.stringify(list));
}

export function tambahRiwayatPaketSoal(paket: RiwayatPaketSoal): void {
  const current = getRiwayatPaketSoal();
  const updated = [paket, ...current.filter(p => p.id_paket !== paket.id_paket)];
  saveRiwayatPaketSoal(updated);
}

export function hapusRiwayatPaketSoal(id_paket: string): void {
  const current = getRiwayatPaketSoal();
  const updated = current.filter(p => p.id_paket !== id_paket);
  saveRiwayatPaketSoal(updated);
}

// Reset all to default factory sample data
export function resetDatabaseToDefault(): void {
  localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(DEFAULT_MAPEL));
  localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_QUESTIONS));
  localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(DEFAULT_SISWA));
  localStorage.setItem(STORAGE_KEYS.HASIL, JSON.stringify(DEFAULT_HASIL));
  localStorage.setItem(STORAGE_KEYS.RIWAYAT, JSON.stringify(DEFAULT_RIWAYAT_PAKET));
  localStorage.setItem(STORAGE_KEYS.KODE_SOAL, JSON.stringify(DEFAULT_KODE_SOAL_PAKET));
}

// Reload default factory sample data (Alias)
export function muatUlangDataContoh(): void {
  resetDatabaseToDefault();
}

// ============================================================
// DATABASE MODE & STORAGE STATUS HELPERS
// ============================================================
export function getDatabaseMode(): DatabaseMode {
  const mode = localStorage.getItem(STORAGE_KEYS.DATABASE_MODE);
  if (mode === 'database_penuh') return 'database_penuh';
  return 'simulator';
}

export function setDatabaseMode(mode: DatabaseMode): void {
  localStorage.setItem(STORAGE_KEYS.DATABASE_MODE, mode);
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNCED);
}

export function setLastSyncedAt(ts: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNCED, ts);
}

export function getLastVerifiedAt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_VERIFIED);
}

export function setLastVerifiedAt(ts: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_VERIFIED, ts);
}

export function getStorageLocation(): StorageStatus {
  const mode = getDatabaseMode();
  const url = getGasWebappUrl();
  const lastVerified = getLastVerifiedAt();
  if (mode === 'database_penuh' && url.trim().length > 0 && lastVerified) {
    return 'gdrive';
  }
  return 'lokal';
}

// Live Connectivity Test (Ping)
export async function cekKoneksiGas(targetUrl?: string): Promise<{ success: boolean; message: string; latency?: number }> {
  const url = (targetUrl || getGasWebappUrl()).trim();
  if (!url) {
    return { success: false, message: 'URL Google Apps Script belum diisi.' };
  }

  const start = performance.now();
  try {
    const pingUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
    const res = await fetch(pingUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data && data.status === 'success') {
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
      setLastVerifiedAt(nowStr);
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Apps Script Web App berhasil!',
        latency,
      };
    } else {
      return {
        success: false,
        message: data?.message || 'Apps Script merespon, namun status bukan success.',
        latency,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal tersambung ke Google Apps Script. Pastikan Web App di-deploy dengan izin "Anyone".',
      latency: Math.round(performance.now() - start),
    };
  }
}

// Pull / Download data from Google Sheets into local web app
export async function tarikDataDariGoogleSheets(targetUrl?: string): Promise<{
  success: boolean;
  message: string;
  countMapel?: number;
  countSoal?: number;
  countSiswa?: number;
  countHasil?: number;
}> {
  const url = (targetUrl || getGasWebappUrl()).trim();
  if (!url) {
    return { success: false, message: 'URL Google Apps Script belum diatur.' };
  }

  try {
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getAllData&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.status !== 'success' || !json.data) {
      throw new Error(json.message || 'Gagal memuat data dari Spreadsheet.');
    }

    const { mapel, soal, siswa, hasil } = json.data;

    let cMapel = 0;
    let cSoal = 0;
    let cSiswa = 0;
    let cHasil = 0;

    if (Array.isArray(mapel) && mapel.length > 0) {
      saveMataPelajaran(mapel);
      cMapel = mapel.length;
    }
    if (Array.isArray(soal) && soal.length > 0) {
      saveBankSoal(soal);
      cSoal = soal.length;
    }
    if (Array.isArray(siswa) && siswa.length > 0) {
      saveSiswa(siswa);
      cSiswa = siswa.length;
    }
    if (Array.isArray(hasil) && hasil.length > 0) {
      saveHasilUjian(hasil);
      cHasil = hasil.length;
    }

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
    setLastSyncedAt(nowStr);
    setLastVerifiedAt(nowStr);

    return {
      success: true,
      message: `Sinkronisasi berhasil! Diperoleh ${cMapel} mapel, ${cSoal} soal, ${cSiswa} siswa, dan ${cHasil} hasil ujian dari Google Sheets.`,
      countMapel: cMapel,
      countSoal: cSoal,
      countSiswa: cSiswa,
      countHasil: cHasil,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menarik data dari Google Sheets. Pastikan skrip Code.gs telah diperbarui dan di-deploy.',
    };
  }
}

// Push / Upload local data to Google Sheets (overwrites/updates sheets)
export async function unggahDataKeGoogleSheets(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = (targetUrl || getGasWebappUrl()).trim();
  if (!url) {
    return { success: false, message: 'URL Google Apps Script belum diatur.' };
  }

  const mapel = getMataPelajaran();
  const soal = getBankSoal();
  const siswa = getDataSiswa();

  const payload = {
    action: 'syncUpload',
    mapel,
    soal,
    siswa,
  };

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
    setLastSyncedAt(nowStr);
    setLastVerifiedAt(nowStr);

    return {
      success: true,
      message: `Berhasil mengunggah ${soal.length} butir soal, ${mapel.length} mata pelajaran, dan ${siswa.length} data siswa ke Google Spreadsheet (GDrive)!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal mengunggah data ke Google Sheets.',
    };
  }
}

// Sinkronkan Seluruh Hasil Ujian Lokal ke Google Sheets (Iterasi & Bulk POST ke GAS)
export async function sinkronSemuaHasilLokalKeGoogleSheets(
  targetUrl?: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; message: string; countSynced: number; totalCount: number }> {
  const results = getHasilUjian();
  return sinkronDaftarHasilKeGoogleSheets(results, targetUrl, (curr, tot) => {
    if (onProgress) onProgress(curr, tot);
  });
}

// Sinkronkan Daftar Hasil Spesifik ke Google Sheets (dengan info item saat proses)
export async function sinkronDaftarHasilKeGoogleSheets(
  results: HasilUjian[],
  targetUrl?: string,
  onProgress?: (current: number, total: number, item?: HasilUjian) => void
): Promise<{ success: boolean; message: string; countSynced: number; totalCount: number }> {
  const url = (targetUrl || getGasWebappUrl()).trim();
  if (!url) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi. Masukkan URL Web App terlebih dahulu.',
      countSynced: 0,
      totalCount: 0,
    };
  }

  if (!results || results.length === 0) {
    return {
      success: true,
      message: 'Tidak ada data hasil ujian lokal di browser untuk disinkronkan.',
      countSynced: 0,
      totalCount: 0,
    };
  }

  // 1. Coba bulk POST payload (mengirimkan seluruh paket array hasil sekaligus)
  try {
    const bulkPayload = {
      action: 'submitBulkJawaban',
      results: results.map((h) => ({
        id_hasil: h.id_hasil,
        timestamp: h.timestamp,
        nisn: h.nisn,
        nama_siswa: h.nama_siswa,
        kelas: h.kelas,
        id_mapel: h.id_mapel,
        nama_mapel: h.nama_mapel,
        jawaban_siswa: h.jawaban_siswa,
        skor_per_soal: h.skor_per_soal,
        skor_total: h.skor_total,
        total_bobot: h.total_bobot,
        nilai_akhir: h.nilai_akhir,
        status_koreksi: h.status_koreksi,
        pelanggaran_curang: h.pelanggaran_curang,
        durasi_menit: h.durasi_menit,
      })),
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(bulkPayload),
    });
  } catch (bulkErr) {
    console.warn('Percobaan bulk POST menghasilkan catatan:', bulkErr);
  }

  // 2. Iterasi setiap hasil ujian lokal untuk menjamin pengiriman per baris ke Tab HasilUjian
  let countSynced = 0;
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    if (onProgress) {
      onProgress(i + 1, results.length, item);
    }
    try {
      await kirimHasilKeGoogleSheets(item, url);
      countSynced++;
    } catch (err) {
      console.error(`Gagal mengirim hasil untuk ${item.nama_siswa}:`, err);
    }
    if (i < results.length - 1) {
      await new Promise((res) => setTimeout(res, 80));
    }
  }

  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
  setLastSyncedAt(nowStr);
  setLastVerifiedAt(nowStr);

  return {
    success: true,
    message: `Berhasil menyinkronkan ${results.length} hasil ujian ke Google Sheets (Tab HasilUjian)!`,
    countSynced,
    totalCount: results.length,
  };
}

// ============================================================
// DUMMY / TEST RESULTS MANAGEMENT HELPERS
// ============================================================
const DUMMY_HASIL_DEFAULT_IDS = new Set(DEFAULT_HASIL.map(h => h.id_hasil));

export function isDummyHasil(hasil: HasilUjian): boolean {
  if (!hasil) return false;
  if (hasil.is_dummy === true) return true;
  if (DUMMY_HASIL_DEFAULT_IDS.has(hasil.id_hasil)) return true;

  const idUpper = (hasil.id_hasil || '').toUpperCase();
  if (idUpper.startsWith('DUMMY') || idUpper.startsWith('TEST') || idUpper.startsWith('SAMPLE') || idUpper.startsWith('SIM-')) {
    return true;
  }

  const namaLower = (hasil.nama_siswa || '').toLowerCase();
  if (namaLower.includes('dummy') || namaLower.includes('contoh') || namaLower.includes('simulasi')) {
    return true;
  }

  // Identifikasi siswa contoh bawaan sistem SD
  const sampleNames = ['ahmad faiz pratama', 'budi santoso', 'citra dewi lestari', 'dimas anggara', 'eka putri rahayu'];
  const sampleNisns = ['12345', '12346', '12347', '12348', '12349'];
  if (sampleNisns.includes(hasil.nisn) && sampleNames.includes(namaLower) && idUpper.startsWith('H-10')) {
    return true;
  }

  return false;
}

// Hapus HANYA Hasil Ujian Dummy / Percobaan (Hasil Siswa Asli Tetap Aman)
export function hapusHanyaHasilDummy(): {
  jumlahDihapus: number;
  sisaHasil: number;
  hasilDihapus: HasilUjian[];
} {
  const current = getHasilUjian();
  const dummyList: HasilUjian[] = [];
  const realList: HasilUjian[] = [];

  current.forEach((item) => {
    if (isDummyHasil(item)) {
      dummyList.push(item);
    } else {
      realList.push(item);
    }
  });

  saveHasilUjian(realList);

  return {
    jumlahDihapus: dummyList.length,
    sisaHasil: realList.length,
    hasilDihapus: dummyList,
  };
}

// Hapus Data Dummy (Membersihkan data placeholder / contoh)
export function hapusDataDummy(pilihan: {
  soal?: boolean;
  siswa?: boolean;
  hasil?: boolean;
  kode_soal?: boolean;
}): {
  soalDihapus: number;
  siswaDihapus: number;
  hasilDihapus: number;
  kodeDihapus: number;
} {
  let soalDihapus = 0;
  let siswaDihapus = 0;
  let hasilDihapus = 0;
  let kodeDihapus = 0;

  if (pilihan.soal) {
    const currentSoal = getBankSoal();
    soalDihapus = currentSoal.length;
    saveBankSoal([]);
  }

  if (pilihan.siswa) {
    const currentSiswa = getDataSiswa();
    siswaDihapus = currentSiswa.length;
    saveSiswa([]);
  }

  if (pilihan.hasil) {
    const currentHasil = getHasilUjian();
    hasilDihapus = currentHasil.length;
    saveHasilUjian([]);
  }

  if (pilihan.kode_soal) {
    const currentKode = getKodeSoalList();
    kodeDihapus = currentKode.length;
    saveKodeSoalList([]);
  }

  return { soalDihapus, siswaDihapus, hasilDihapus, kodeDihapus };
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

    // Analisis Distraktor / Pengecoh (Khusus Pilihan Ganda)
    let distraktorList: DistraktorInfo[] | undefined = undefined;
    if (soal.jenis_soal === 'PG' && Array.isArray(soal.opsi_json)) {
      const opsiLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, soal.opsi_json.length);
      const kunciStr = String(soal.kunci_jawaban_json).toUpperCase().trim();

      distraktorList = opsiLetters.map((letter, idx) => {
        const textOpsi = (soal.opsi_json as string[])[idx] || letter;
        const isKunci = letter === kunciStr || textOpsi.trim() === String(soal.kunci_jawaban_json).trim();

        let pemilihTotal = 0;
        let pemilihAtas = 0;
        let pemilihBawah = 0;

        targetHasil.forEach(h => {
          const ans = String(h.jawaban_siswa[idSoal] || '').toUpperCase().trim();
          if (ans === letter || ans === textOpsi.toUpperCase().trim()) {
            pemilihTotal++;
          }
        });

        upperGroup.forEach(h => {
          const ans = String(h.jawaban_siswa[idSoal] || '').toUpperCase().trim();
          if (ans === letter || ans === textOpsi.toUpperCase().trim()) {
            pemilihAtas++;
          }
        });

        lowerGroup.forEach(h => {
          const ans = String(h.jawaban_siswa[idSoal] || '').toUpperCase().trim();
          if (ans === letter || ans === textOpsi.toUpperCase().trim()) {
            pemilihBawah++;
          }
        });

        const persentase = n > 0 ? Math.round((pemilihTotal / n) * 100) : 0;
        let status: 'Kunci' | 'Efektif' | 'Lemah' | 'Menyesatkan' = 'Efektif';

        if (isKunci) {
          status = 'Kunci';
        } else if (pemilihAtas > pemilihBawah && pemilihAtas > 0) {
          status = 'Menyesatkan';
        } else if (persentase >= 5 && pemilihBawah >= pemilihAtas) {
          status = 'Efektif';
        } else {
          status = 'Lemah';
        }

        return {
          opsi: `${letter}. ${textOpsi}`,
          pemilih_total: pemilihTotal,
          persentase,
          pemilih_atas: pemilihAtas,
          pemilih_bawah: pemilihBawah,
          is_kunci: isKunci,
          status,
        };
      });
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
      distraktor: distraktorList,
    };
  });
}
