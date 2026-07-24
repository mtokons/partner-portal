export const MAX_CV_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export function getCvFileSizeError(fileSizeBytes: number | undefined | null): string | null {
  if (fileSizeBytes == null) return null;
  return fileSizeBytes > MAX_CV_FILE_SIZE_BYTES ? "CV file must be 15MB or smaller." : null;
}
