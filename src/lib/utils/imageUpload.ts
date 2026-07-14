const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD = 1.2 * 1024 * 1024;
const MAX_EDGE = 1600;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "يُسمح فقط بصور JPG أو PNG أو WebP.";
  }
  if (file.size > MAX_BYTES * 2) {
    return "حجم الصورة كبير جدًا (الحد الأقصى 5 ميغابايت بعد الضغط).";
  }
  return null;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("INVALID_IMAGE"));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Compress large images client-side before upload; returns original when small enough. */
export async function prepareImageForUpload(file: File): Promise<File> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  if (file.size <= COMPRESS_THRESHOLD && file.type !== "image/png") {
    return file;
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );
  if (!blob) return file;
  if (blob.size > MAX_BYTES) {
    throw new Error("تعذر ضغط الصورة إلى الحجم المسموح (5 ميغابايت).");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "category";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
