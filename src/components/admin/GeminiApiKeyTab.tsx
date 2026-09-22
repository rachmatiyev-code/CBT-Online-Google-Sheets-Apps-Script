import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Check, 
  Copy, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Zap, 
  RefreshCw,
  Server
} from 'lucide-react';
import { 
  getStoredGeminiKey, 
  setStoredGeminiKey, 
  clearStoredGeminiKey, 
  validateGeminiKey, 
  getGeminiServerStatus 
} from '../../services/geminiKeyService';

interface GeminiApiKeyTabProps {
  onKeyUpdated?: () => void;
}

export const GeminiApiKeyTab: React.FC<GeminiApiKeyTabProps> = ({ onKeyUpdated }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<{ hasEnvKey: boolean; defaultModel: string } | null>(null);
  const [testingStatus, setTestingStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    model?: string;
  } | null>(null);

  useEffect(() => {
    const stored = getStoredGeminiKey();
    setApiKey(stored);

    // Fetch server status
    getGeminiServerStatus().then(status => {
      setServerStatus(status);
    });
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStoredGeminiKey(apiKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (onKeyUpdated) onKeyUpdated();
  };

  const handleClear = () => {
    if (confirm('Yakin ingin menghapus API Key yang tersimpan di browser ini?')) {
      clearStoredGeminiKey();
      setApiKey('');
      setTestingStatus(null);
      if (onKeyUpdated) onKeyUpdated();
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !serverStatus?.hasEnvKey) {
      setTestingStatus({
        loading: false,
        success: false,
        message: 'Masukkan Gemini API Key terlebih dahulu sebelum menguji koneksi.',
      });
      return;
    }

    setTestingStatus({ loading: true });

    const res = await validateGeminiKey(keyToTest);
    setTestingStatus({
      loading: false,
      success: res.success,
      message: res.message,
      model: res.model,
    });
  };

  const isConfigured = !!apiKey.trim() || !!serverStatus?.hasEnvKey;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Konfigurasi Kunci AI
                </span>
                <span className="text-xs text-slate-400">• Google Gemini 3.8 Flash</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Pengaturan Gemini AI API Key
              </h2>
            </div>
          </div>

          {/* Active Status Badge */}
          <div className="flex items-center">
            {isConfigured ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AI Aktif & Siap Digunakan</span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>API Key Belum Diisi</span>
              </div>
            )}
          </div>
        </div>

        {/* Server & Client Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3">
            <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Kunci Pribadi Browser</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {apiKey.trim() 
                  ? `Tersimpan (${apiKey.slice(0, 7)}••••••••${apiKey.slice(-4)})` 
                  : 'Belum ada kunci tersimpan di browser Anda.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3">
            <Server className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Kunci Lingkungan Server (.env)</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {serverStatus?.hasEnvKey 
                  ? 'Tersedia di server (GEMINI_API_KEY terdeteksi)' 
                  : 'Tidak ada kunci default di server .env'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Input Key */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Masukkan Google Gemini API Key Anda:
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 pr-24 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
              <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title={showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Kunci API disimpan secara aman di browser lokal Anda dan hanya digunakan untuk membuat soal otomatis via backend proxy.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950/40"
            >
              <Check className="w-4 h-4" />
              <span>{savedSuccess ? 'Tersimpan!' : 'Simpan Kunci API'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingStatus?.loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-950/40 disabled:opacity-50"
            >
              {testingStatus?.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300" />
              )}
              <span>{testingStatus?.loading ? 'Menguji Koneksi...' : 'Uji Koneksi (Test Ping)'}</span>
            </button>

            {apiKey.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Kunci</span>
              </button>
            )}

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="ml-auto px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
            >
              <span>Dapatkan API Key Gratis di Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>

          {/* Test Status Result Box */}
          {testingStatus && (
            <div className={`p-4 rounded-2xl text-xs flex items-start space-x-3 transition mt-4 ${
              testingStatus.success 
                ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-200' 
                : 'bg-rose-950/80 border border-rose-600/60 text-rose-200'
            }`}>
              {testingStatus.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div>
                <strong className="block text-white">
                  {testingStatus.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                </strong>
                <p className="mt-0.5">{testingStatus.message}</p>
                {testingStatus.model && (
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Model aktif: <code>{testingStatus.model}</code>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Tutorial: Cara Mendapatkan API Key Gratis */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            Panduan Mendapatkan Gemini API Key Gratis (1 Menit)
          </h3>
        </div>

        <ol className="space-y-3 text-xs sm:text-sm text-slate-300 list-decimal list-inside leading-relaxed">
          <li>
            Buka portal resmi Google AI Studio melalui tautan{' '}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer" 
              className="text-amber-400 underline font-semibold hover:text-amber-300"
            >
              aistudio.google.com/app/apikey
            </a>.
          </li>
          <li>
            Masuk (*Sign in*) menggunakan akun Google pribadi atau akun Belajar.id / sekolah Anda.
          </li>
          <li>
            Klik tombol biru <strong>"Create API Key"</strong> (atau <em>Get API key</em>).
          </li>
          <li>
            Pilih project Google Cloud bawaan Anda, lalu salin teks kunci yang diawali dengan <code>AIzaSy...</code>.
          </li>
          <li>
            Tempelkan (*Paste*) ke dalam kolom di atas, lalu klik <strong>"Simpan Kunci API"</strong> dan <strong>"Uji Koneksi"</strong>.
          </li>
        </ol>

        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
          <div>
            <strong className="text-white block">Keamanan & Kuota Gratis</strong>
            <p className="mt-0.5 leading-relaxed">
              Google AI Studio menyediakan paket gratis (*Free Tier*) dengan kuota pembuatan soal yang sangat melimpah untuk kebutuhan CBT sekolah tanpa memerlukan kartu kredit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
