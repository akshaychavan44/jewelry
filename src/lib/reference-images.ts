export const REFERENCE_IMAGE_LIMIT = 3;
export const REFERENCE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const REFERENCE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function referenceImagesError(files: { size: number; type: string }[]): string | undefined {
  if (files.length > REFERENCE_IMAGE_LIMIT) return "Attach up to three reference images.";
  for (const file of files) {
    if (!REFERENCE_IMAGE_TYPES.includes(file.type)) return "Reference images must be JPEG, PNG or WebP.";
    if (file.size <= 0 || file.size > REFERENCE_IMAGE_MAX_BYTES) return "Each reference image must be non-empty and 3 MB or smaller.";
  }
}
