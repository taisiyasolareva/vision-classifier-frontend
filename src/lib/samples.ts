/**
 * Built-in sample images from the validation set.
 * Served from public/samples/ (Vite serves public/ at root).
 *
 * To update: replace the 3 files in public/samples/ and adjust this array
 * so label matches the model's label mapping (e.g. folder names from val).
 */
export type SampleEntry = {
  id: string;
  /** Path under public/ — use leading slash for root (e.g. /samples/class_000.jpg) */
  src: string;
  /** Class name shown under thumbnail; must match model's label mapping */
  label: string;
};

export const SAMPLE_IMAGES: SampleEntry[] = [
  { id: "class_000", src: "/samples/class_000.jpg", label: "class_000" },
  { id: "class_001", src: "/samples/class_001.jpg", label: "class_001" },
  { id: "class_002", src: "/samples/class_002.jpg", label: "class_002" },
];

/**
 * Fetch a sample image by URL and return it as a File for the predict API.
 * Fails if the asset is missing (e.g. wrong base path in production).
 */
export async function fetchSampleAsFile(
  src: string,
  filename: string
): Promise<File> {
  const res = await fetch(src, { cache: "default" });
  if (!res.ok) {
    throw new Error(`Failed to load sample image (${res.status}): ${src}`);
  }
  const blob = await res.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], filename, { type });
}
