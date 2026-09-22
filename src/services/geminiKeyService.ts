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
  try {
    const res = await fetch('/api/validate-gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: key.trim() }),
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return {
        success: true,
        message: data.message || 'Kunci Gemini API valid dan siap digunakan!',
        model: data.model,
        reply: data.reply,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Kunci API tidak valid atau gagal terhubung.',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Gagal menghubungi server untuk verifikasi kunci API.',
    };
  }
}

export async function getGeminiServerStatus(): Promise<{
  hasEnvKey: boolean;
  defaultModel: string;
}> {
  try {
    const res = await fetch('/api/gemini-status');
    if (res.ok) {
      const data = await res.json();
      return {
        hasEnvKey: Boolean(data.hasEnvKey),
        defaultModel: data.defaultModel || 'gemini-3.8-flash',
      };
    }
  } catch (e) {
    console.error('Failed to get Gemini server status', e);
  }
  return { hasEnvKey: false, defaultModel: 'gemini-3.8-flash' };
}
