// Image processing and compression utility for CBT Questions
// Supports file upload compression to lightweight Base64 Data URL and clipboard pasting

export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down proportionally if exceeds max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw data URL
          const rawUrl = e.target?.result as string;
          resolve({
            dataUrl: rawUrl,
            originalSize: file.size,
            compressedSize: file.size,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG transparency if PNG, else use JPEG for optimal compression
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const approxCompressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: approxCompressedSize,
        });
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat format berkas gambar.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas gambar dari perangkat.'));
    };

    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
