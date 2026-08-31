export const safe = (fn, fallback) => {
  try {
    return typeof fn === 'function' ? fn() : fallback;
  } catch {
    return fallback;
  }
};

/**
 * "Browse for more pictures..." — turn any image file into an account
 * picture: cover-cropped to a 96x96 square on a white ground (XP account
 * pictures are opaque tiles) and returned as a small data URL, so it can
 * live inline in the localStorage user registry. PNG when it stays small
 * (pixel art), JPEG when photographic content makes PNG balloon.
 */
export async function fileToAccountPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('unreadable image'));
      i.src = url;
    });
    const SIZE = 96;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingQuality = 'high';
    const scale = Math.max(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    let out = canvas.toDataURL('image/png');
    if (out.length > 48 * 1024) out = canvas.toDataURL('image/jpeg', 0.85);
    // 'data:,' is what a poisoned canvas produces
    if (!out.startsWith('data:image/')) throw new Error('encode failed');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
