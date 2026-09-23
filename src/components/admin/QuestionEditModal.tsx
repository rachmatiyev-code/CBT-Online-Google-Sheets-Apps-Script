import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, MataPelajaran, DAFTAR_MATA_PELAJARAN } from '../../types';
import { 
  X, 
  Save, 
  AlertCircle, 
  HelpCircle, 
  Image, 
  Plus, 
  Trash2, 
  Upload, 
  Link, 
  Maximize2, 
  FileImage, 
  CheckCircle2, 
  Clipboard,
  Sparkles,
  RotateCcw,
  FileKey
} from 'lucide-react';
import { compressImageFile, formatBytes } from '../../utils/imageUtils';

interface QuestionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null; // null means adding a new question
  mapelList: MataPelajaran[];
  defaultMapelId?: string;
  onSave: (savedQuestion: Question) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  onClose,
  question,
  mapelList,
  defaultMapelId,
  onSave,
}) => {
  const isEditing = Boolean(question);

  const [idSoal, setIdSoal] = useState<string>('');
  const [idMapel, setIdMapel] = useState<string>('');
  const [kodeSoal, setKodeSoal] = useState<string>('');
  const [jenisSoal, setJenisSoal] = useState<QuestionType>('PG');
  const [pertanyaan, setPertanyaan] = useState<string>('');
  const [urlGambar, setUrlGambar] = useState<string>('');
  const [bobot, setBobot] = useState<number>(1);
  const [pembahasan, setPembahasan] = useState<string>('');

  // Image Upload & Paste States
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageMeta, setImageMeta] = useState<{ size?: string; originalSize?: string; name?: string } | null>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isZoomedImage, setIsZoomedImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PG Options
  const [opsiA, setOpsiA] = useState<string>('');
  const [opsiB, setOpsiB] = useState<string>('');
  const [opsiC, setOpsiC] = useState<string>('');
  const [opsiD, setOpsiD] = useState<string>('');
  const [kunciPG, setKunciPG] = useState<string>('A');

  // PGK Options (multiple choice checkbox)
  const [opsiPgk, setOpsiPgk] = useState<string[]>(['', '', '', '']);
  const [kunciPgk, setKunciPgk] = useState<string[]>([]);

  // Isian Singkat keywords
  const [kunciIsian, setKunciIsian] = useState<string>('');

  // Menjodohkan (MJ) pairs
  const [mjPairs, setMjPairs] = useState<{ kiri: string; kanan: string }[]>([
    { kiri: '', kanan: '' },
    { kiri: '', kanan: '' },
  ]);

  // Uraian keywords
  const [kunciUraian, setKunciUraian] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setIdSoal(question.id_soal);
      setIdMapel(question.id_mapel);
      setKodeSoal(question.kode_soal || '');
      setJenisSoal(question.jenis_soal);
      setPertanyaan(question.pertanyaan);
      setUrlGambar(question.url_gambar || '');
      setBobot(question.bobot || 1);
      setPembahasan(question.pembahasan || '');

      // Load type-specific states
      if (question.jenis_soal === 'PG' && Array.isArray(question.opsi_json)) {
        setOpsiA(question.opsi_json[0] || '');
        setOpsiB(question.opsi_json[1] || '');
        setOpsiC(question.opsi_json[2] || '');
        setOpsiD(question.opsi_json[3] || '');
        setKunciPG(String(question.kunci_jawaban_json || 'A').toUpperCase());
      } else if (question.jenis_soal === 'PGK') {
        if (Array.isArray(question.opsi_json)) {
          setOpsiPgk(question.opsi_json);
        }
        if (Array.isArray(question.kunci_jawaban_json)) {
          setKunciPgk(question.kunci_jawaban_json);
        }
      } else if (question.jenis_soal === 'IS') {
        if (Array.isArray(question.kunci_jawaban_json)) {
          setKunciIsian(question.kunci_jawaban_json.join(', '));
        } else {
          setKunciIsian(String(question.kunci_jawaban_json || ''));
        }
      } else if (question.jenis_soal === 'MJ') {
        const opsi = question.opsi_json;
        if (opsi && typeof opsi === 'object' && !Array.isArray(opsi) && 'kiri' in opsi && 'kanan' in opsi) {
          const mjObj = opsi as { kiri: string[]; kanan: string[] };
          const kiri = mjObj.kiri || [];
          const kunci = (question.kunci_jawaban_json && typeof question.kunci_jawaban_json === 'object' && !Array.isArray(question.kunci_jawaban_json)
            ? (question.kunci_jawaban_json as Record<string, string>)
            : {}) as Record<string, string>;
          const pairs = kiri.map((k: string) => ({
            kiri: k,
            kanan: kunci[k] || '',
          }));
          setMjPairs(pairs.length > 0 ? pairs : [{ kiri: '', kanan: '' }, { kiri: '', kanan: '' }]);
        }
      } else if (question.jenis_soal === 'UR') {
        setKunciUraian(String(question.kunci_jawaban_json || ''));
      }
    } else {
      // New question initial defaults
      const autoId = 'S' + Date.now().toString().slice(-4);
      setIdSoal(autoId);
      setIdMapel(defaultMapelId || mapelList[0]?.id_mapel || 'Matematika');
      setKodeSoal('');
      setJenisSoal('PG');
      setPertanyaan('');
      setUrlGambar('');
      setBobot(1);
      setPembahasan('');
      setOpsiA('');
      setOpsiB('');
      setOpsiC('');
      setOpsiD('');
      setKunciPG('A');
      setOpsiPgk(['Opsi 1', 'Opsi 2', 'Opsi 3', 'Opsi 4']);
      setKunciPgk(['Opsi 1']);
      setKunciIsian('');
      setMjPairs([
        { kiri: 'Kucing', kanan: 'Mamalia' },
        { kiri: 'Elang', kanan: 'Aves' },
      ]);
      setKunciUraian('');
    }
    setImageMeta(null);
    setErrorMessage(null);
  }, [question, isOpen, defaultMapelId, mapelList]);

  // Global paste handler to capture Ctrl+V screenshots/images anywhere while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessImageFile(file, 'Pasted-Screenshot.png');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen]);

  const handleProcessImageFile = async (file: File, fallbackName?: string) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas harus berupa gambar (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    setIsProcessingImage(true);
    setErrorMessage(null);

    try {
      const result = await compressImageFile(file);
      setUrlGambar(result.dataUrl);
      setImageMeta({
        name: file.name || fallbackName || 'Gambar-Soal.png',
        size: formatBytes(result.compressedSize),
        originalSize: formatBytes(result.originalSize),
      });
      setPasteToast('Gambar berhasil dimuat dan dioptimasi!');
      setTimeout(() => setPasteToast(null), 3000);
    } catch (err: any) {
      console.error('Error processing image:', err);
      setErrorMessage(err.message || 'Gagal memproses berkas gambar.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setUrlGambar('');
    setImageMeta(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!idSoal.trim()) {
      setErrorMessage('ID Soal wajib diisi.');
      return;
    }
    if (!idMapel.trim()) {
      setErrorMessage('Pilih Mata Pelajaran target.');
      return;
    }
    if (!pertanyaan.trim()) {
      setErrorMessage('Teks pertanyaan wajib diisi.');
      return;
    }

    let finalOpsiJson: any = null;
    let finalKunciJson: any = null;

    if (jenisSoal === 'PG') {
      if (!opsiA.trim() || !opsiB.trim() || !opsiC.trim() || !opsiD.trim()) {
        setErrorMessage('Seluruh opsi A, B, C, D untuk Pilihan Ganda wajib diisi.');
        return;
      }
      finalOpsiJson = [opsiA.trim(), opsiB.trim(), opsiC.trim(), opsiD.trim()];
      finalKunciJson = kunciPG;
    } else if (jenisSoal === 'PGK') {
      const validOptions = opsiPgk.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setErrorMessage('Minimal 2 opsi untuk Pilihan Ganda Kompleks.');
        return;
      }
      if (kunciPgk.length === 0) {
        setErrorMessage('Pilih minimal satu kunci jawaban yang benar untuk PGK.');
        return;
      }
      finalOpsiJson = validOptions;
      finalKunciJson = kunciPgk;
    } else if (jenisSoal === 'MJ') {
      const validPairs = mjPairs.filter(p => p.kiri.trim() && p.kanan.trim());
      if (validPairs.length < 2) {
        setErrorMessage('Minimal 2 pasang item untuk soal Menjodohkan.');
        return;
      }
      const kiri = validPairs.map(p => p.kiri.trim());
      const kanan = validPairs.map(p => p.kanan.trim());
      const kunciMap: Record<string, string> = {};
      validPairs.forEach(p => {
        kunciMap[p.kiri.trim()] = p.kanan.trim();
      });
      finalOpsiJson = { kiri, kanan };
      finalKunciJson = kunciMap;
    } else if (jenisSoal === 'IS') {
      if (!kunciIsian.trim()) {
        setErrorMessage('Kunci jawaban isian singkat wajib diisi.');
        return;
      }
      finalOpsiJson = null;
      finalKunciJson = kunciIsian.split(',').map(s => s.trim()).filter(Boolean);
    } else if (jenisSoal === 'UR') {
      finalOpsiJson = null;
      finalKunciJson = kunciUraian.trim() || 'Rubrik manual guru';
    }

    const payload: Question = {
      id_soal: idSoal.trim(),
      id_mapel: idMapel.trim(),
      kode_soal: kodeSoal.trim().toUpperCase() || undefined,
      jenis_soal: jenisSoal,
      pertanyaan: pertanyaan.trim(),
      url_gambar: urlGambar.trim() || undefined,
      opsi_json: finalOpsiJson,
      kunci_jawaban_json: finalKunciJson,
      bobot: Number(bobot) > 0 ? Number(bobot) : 1,
      pembahasan: pembahasan.trim() || undefined,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-lg text-white">
              {isEditing ? `Edit Butir Soal (${question?.id_soal})` : 'Tambah Butir Soal Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              Formulir terstandar format sheet BankSoal CBT Online
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: ID Soal, Mapel, Kode Soal, Bentuk Soal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">ID Soal *</label>
              <input
                type="text"
                value={idSoal}
                onChange={(e) => setIdSoal(e.target.value)}
                disabled={isEditing}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                placeholder="cth: S01"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mata Pelajaran *</label>
              <select
                value={idMapel}
                onChange={(e) => setIdMapel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {DAFTAR_MATA_PELAJARAN.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Kode Soal / Paket</label>
              <input
                type="text"
                value={kodeSoal}
                onChange={(e) => setKodeSoal(e.target.value.toUpperCase())}
                placeholder="cth: ASAS-MTK-01"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none placeholder:normal-case"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bentuk Soal *</label>
              <select
                value={jenisSoal}
                onChange={(e) => setJenisSoal(e.target.value as QuestionType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="PGK">Pilihan Ganda Kompleks (PGK)</option>
                <option value="MJ">Menjodohkan (MJ)</option>
                <option value="IS">Isian Singkat (IS)</option>
                <option value="UR">Uraian / Esai (UR)</option>
              </select>
            </div>
          </div>

          {/* Pertanyaan */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Teks Pertanyaan *</label>
            <textarea
              rows={3}
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Tuliskan stimulus atau kalimat pertanyaan di sini..."
            />
          </div>

          {/* Gambar Stimulus Soal (Unggah / Tempel / URL) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Image className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Gambar Stimulus Soal</span>
                  <span className="text-[10px] text-slate-400">Dukung Unggah Berkas, Drag & Drop, Tempel (Ctrl+V), atau URL</span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                    imageTab === 'upload' 
                      ? 'bg-emerald-600 text-white font-medium shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Unggah / Tempel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                    imageTab === 'url' 
                      ? 'bg-emerald-600 text-white font-medium shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>Tautan URL</span>
                </button>
              </div>
            </div>

            {/* Paste Toast Notification */}
            {pasteToast && (
              <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pasteToast}</span>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageTab === 'upload' ? (
              <div className="space-y-3">
                {!urlGambar ? (
                  /* Dropzone & Paste Area */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-950/20 scale-[1.01]'
                        : 'border-slate-700/80 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200 mb-1">
                      Klik untuk memilih berkas gambar atau seret & lepas ke sini
                    </p>
                    <p className="text-xs text-slate-400 mb-3">
                      Mendukung PNG, JPG, WEBP, GIF, SVG (otomatis dioptimasi)
                    </p>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-amber-300">
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Tips: Tekan <strong>Ctrl + V</strong> di mana saja untuk menempelkan screenshot!</span>
                    </div>
                  </div>
                ) : (
                  /* Image Preview Card */
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative group w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                        <img
                          src={urlGambar}
                          alt="Pratinjau Soal"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setIsZoomedImage(true)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                          title="Perbesar"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {imageMeta?.name || 'Gambar Soal'}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300">
                            {urlGambar.startsWith('data:') ? 'Base64 Teroptimasi' : 'URL Eksternal'}
                          </span>
                          {imageMeta?.size && (
                            <span className="text-[11px] text-slate-400">
                              Ukuran: {imageMeta.size}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on active image */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsZoomedImage(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Zoom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Ganti</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Direct URL Input Tab */
              <div className="space-y-3">
                <input
                  type="url"
                  value={urlGambar}
                  onChange={(e) => {
                    setUrlGambar(e.target.value);
                    setImageMeta(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://images.unsplash.com/... atau https://drive.google.com/..."
                />
                {urlGambar && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <img
                        src={urlGambar}
                        alt="Preview URL"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-slate-300 truncate max-w-xs">{urlGambar}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/40"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type-Specific Options & Keys */}
          {jenisSoal === 'PG' && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Opsi Pilihan Ganda & Kunci</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Opsi A</label>
                  <input
                    type="text"
                    value={opsiA}
                    onChange={(e) => setOpsiA(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    placeholder="Teks opsi A"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Opsi B</label>
                  <input
                    type="text"
                    value={opsiB}
                    onChange={(e) => setOpsiB(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    placeholder="Teks opsi B"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Opsi C</label>
                  <input
                    type="text"
                    value={opsiC}
                    onChange={(e) => setOpsiC(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    placeholder="Teks opsi C"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Opsi D</label>
                  <input
                    type="text"
                    value={opsiD}
                    onChange={(e) => setOpsiD(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                    placeholder="Teks opsi D"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Kunci Jawaban Benar</label>
                <div className="flex space-x-3">
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <label
                      key={letter}
                      className={`flex-1 flex items-center justify-center p-2 rounded-lg cursor-pointer border text-sm font-semibold transition ${
                        kunciPG === letter
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="kunciPG"
                        value={letter}
                        checked={kunciPG === letter}
                        onChange={() => setKunciPG(letter)}
                        className="sr-only"
                      />
                      <span>Kunci {letter}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {jenisSoal === 'PGK' && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                Opsi Pilihan Ganda Kompleks & Centang Kunci Benar
              </p>
              {opsiPgk.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={kunciPgk.includes(opt) && opt.trim().length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setKunciPgk([...kunciPgk, opt]);
                      } else {
                        setKunciPgk(kunciPgk.filter(k => k !== opt));
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...opsiPgk];
                      const oldVal = updated[idx];
                      updated[idx] = e.target.value;
                      setOpsiPgk(updated);
                      // sync kunci if renamed
                      if (kunciPgk.includes(oldVal)) {
                        setKunciPgk(kunciPgk.map(k => k === oldVal ? e.target.value : k));
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                    placeholder={`Opsi ${idx + 1}`}
                  />
                </div>
              ))}
              <p className="text-[11px] text-slate-400">
                *Centang kotak di samping kiri opsi yang merupakan jawaban benar.
              </p>
            </div>
          )}

          {jenisSoal === 'IS' && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <label className="block text-xs font-semibold text-sky-400 uppercase tracking-wider">
                Kunci Jawaban Isian Singkat (Pisahkan dengan koma jika ada alternatif)
              </label>
              <input
                type="text"
                value={kunciIsian}
                onChange={(e) => setKunciIsian(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="cth: 30, tiga puluh, 30 kg"
              />
              <p className="text-[11px] text-slate-400">
                Koreksi otomatis tidak sensitif huruf besar/kecil (case-insensitive).
              </p>
            </div>
          )}

          {jenisSoal === 'MJ' && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Pasangan Menjodohkan (Kiri & Kanan Benar)
                </p>
                <button
                  type="button"
                  onClick={() => setMjPairs([...mjPairs, { kiri: '', kanan: '' }])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pasangan</span>
                </button>
              </div>
              {mjPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={pair.kiri}
                    onChange={(e) => {
                      const updated = [...mjPairs];
                      updated[idx].kiri = e.target.value;
                      setMjPairs(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    placeholder={`Premis Kiri ${idx + 1}`}
                  />
                  <span className="text-slate-400 text-xs">➔</span>
                  <input
                    type="text"
                    value={pair.kanan}
                    onChange={(e) => {
                      const updated = [...mjPairs];
                      updated[idx].kanan = e.target.value;
                      setMjPairs(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    placeholder={`Pasangan Kanan ${idx + 1}`}
                  />
                  {mjPairs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMjPairs(mjPairs.filter((_, i) => i !== idx))}
                      className="p-1 text-rose-400 hover:bg-slate-800 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {jenisSoal === 'UR' && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Kata Kunci / Rubrik Jawaban Uraian
              </label>
              <textarea
                rows={2}
                value={kunciUraian}
                onChange={(e) => setKunciUraian(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                placeholder="Tuliskan poin-poin penting kunci jawaban untuk memandu guru dalam koreksi manual..."
              />
            </div>
          )}

          {/* Bobot & Pembahasan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bobot Nilai (Poin) *</label>
              <input
                type="number"
                min={1}
                max={20}
                value={bobot}
                onChange={(e) => setBobot(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Pembahasan Soal (Tampil saat selesai)</label>
              <input
                type="text"
                value={pembahasan}
                onChange={(e) => setPembahasan(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                placeholder="Penjelasan langkah penyelesaian..."
              />
            </div>
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
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah ke Bank Soal'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Image Zoom Lightbox Modal */}
      {isZoomedImage && urlGambar && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                Pratinjau Resolusi Penuh Gambar Soal
              </span>
              <button
                type="button"
                onClick={() => setIsZoomedImage(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[75vh] overflow-auto rounded-2xl bg-slate-950 p-2">
              <img
                src={urlGambar}
                alt="Zoomed Question Stimulus"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
