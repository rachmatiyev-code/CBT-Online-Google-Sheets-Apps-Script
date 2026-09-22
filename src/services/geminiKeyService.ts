// Gemini API Key Management Service
// Stores custom API key securely in client localStorage and validates with server

const STORAGE_KEY = 'cbt_gemini_api_key';

export function getStoredGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearStoredGeminiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function validateGeminiKey(key: string): Promise<{
  success: boolean;
  message: string;
  model?: string;
  reply?: string;
}> {
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    return {
      success: false,
      message: 'Kunci API tidak boleh kosong.',
    };
  }

  // 1. First attempt: call local / serverless proxy /api/validate-gemini-key
  try {
    const res = await fetch('/api/validate-gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: trimmedKey }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        return {
          success: true,
          message: data.message || 'Kunci Gemini API valid dan siap digunakan!',
          model: data.model || 'gemini-3.8-flash',
          reply: data.reply,
        };
      } else if (data.message) {
        return {
          success: false,
          message: data.message,
        };
      }
    }
  } catch (proxyError) {
    console.warn('Proxy API validation route failed or unavailable, falling back to direct Google API check:', proxyError);
  }

  // 2. Direct client-side validation to Google Gemini endpoint (works on Vercel, Netlify, GitHub Pages, etc.)
  try {
    const startTime = Date.now();
    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Balas persis satu kata: PONG' }] }],
        }),
      }
    );

    const googleContentType = googleRes.headers.get('content-type') || '';
    if (googleContentType.includes('application/json')) {
      const data = await googleRes.json();
      const elapsed = Date.now() - startTime;

      if (googleRes.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'PONG';
        return {
          success: true,
          message: `Kunci Gemini API valid dan aktif! Terverifikasi langsung ke Google Gemini (${elapsed}ms).`,
          model: 'gemini-3.8-flash',
          reply: text,
        };
      } else {
        const errMsg = data?.error?.message || `Kode respon Google: ${googleRes.status}`;
        if (googleRes.status === 400 || errMsg.toLowerCase().includes('api_key') || errMsg.toLowerCase().includes('key not valid')) {
          return {
            success: false,
            message: 'Kunci API tidak valid. Silakan periksa kembali API Key dari Google AI Studio.',
          };
        }
        if (googleRes.status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource has been exhausted')) {
          return {
            success: false,
            message: 'Kunci API valid, namun kuota permintaan sedang terlampaui (Rate limit / Quota exceeded).',
          };
        }
        return {
          success: false,
          message: `Gagal verifikasi kunci: ${errMsg}`,
        };
      }
    } else {
      return {
        success: false,
        message: `Koneksi Google Gemini mengembalikan status ${googleRes.status}. Pastikan koneksi internet stabil.`,
      };
    }
  } catch (directError: any) {
    return {
      success: false,
      message: directError?.message || 'Gagal menghubungi server Gemini. Periksa koneksi internet Anda.',
    };
  }
}

export async function getGeminiServerStatus(): Promise<{
  hasEnvKey: boolean;
  defaultModel: string;
}> {
  try {
    const res = await fetch('/api/gemini-status');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return {
        hasEnvKey: Boolean(data.hasEnvKey),
        defaultModel: data.defaultModel || 'gemini-3.8-flash',
      };
    }
  } catch (e) {
    // Non-blocking in serverless/static environments
  }
  return { hasEnvKey: false, defaultModel: 'gemini-3.8-flash' };
}
