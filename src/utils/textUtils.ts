/**
 * Utility functions for cleaning and formatting question text in CBT Online
 */

export function cleanQuestionText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // 1. Remove bracketed metadata tags at the beginning, e.g.:
  // "[SD / MI Kelas 5] Nomor 1 terkait materi "Operasi Hitung (Penjumlahan, Pengurangan, Perkalian, Pembagian) Bilangan Cacah":"
  // "[SD / MI Kelas 5] Nomor 1 (AKM Literasi) materi "...":"
  cleaned = cleaned.replace(
    /^\[[^\]]*\]\s*(?:Nomor\s*\d+\s*)?(?:\([^)]*\)\s*)?(?:terkait\s*materi|materi|tentang\s*materi|AKM\s*Literasi|AKM\s*Numerasi)?\s*(?:"[^"]*"|'[^']*'|[^:\n]+)?\s*[:\-\u2013\u2014]\s*/i,
    ''
  );

  // 2. Remove syllabus / learning objective introductory clauses like:
  // "Seorang peserta didik mempelajari operasi hitung (penjumlahan, pengurangan, perkalian, pembagian) -- "
  // "Seorang peserta didik mempelajari operasi hitung (penjumlahan, pengurangan, perkalian, pembagian): "
  // "Seorang peserta didik mempelajari [topik] dengan nilai awal X. Jika..." -> "Jika..."
  cleaned = cleaned.replace(
    /^Seorang\s+peserta\s+didik\s+mempelajari\s+[^:\n\-–—]+(?:[:\-\u2013\u2014]+\s*|\s+dengan\s+nilai\s+awal\s+\d+[\.,]?\d*\.\s*)/i,
    (match) => {
      // If it ends with "Jika..." or has second sentence, let's keep the question intact
      return '';
    }
  );

  // General "Seorang peserta didik mempelajari..." prefix up to dash or colon
  cleaned = cleaned.replace(/^Seorang\s+peserta\s+didik\s+mempelajari\s+[^:\n\-–—]+[:\-\u2013\u2014]\s*/i, '');

  // 3. Remove "Materi Pokok:", "Tujuan Pembelajaran:", "Indikator Soal:", "Kompetensi Dasar:"
  cleaned = cleaned.replace(
    /^(?:Materi\s*Pokok|Tujuan\s*Pembelajaran|Indikator\s*Soal|Kompetensi\s*Dasar)\s*[:\-\u2013\u2014]\s*[^:\n]+[:\-\u2013\u2014]\s*/i,
    ''
  );

  // 4. Strip leftover leading dashes, colons, or whitespace
  cleaned = cleaned.replace(/^[-\u2013\u2014:\s]+/, '');

  // 5. Ensure the first character is capitalized
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}
