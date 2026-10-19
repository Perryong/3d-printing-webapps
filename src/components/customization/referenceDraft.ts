import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIXELS,
  type ReferenceContext,
} from "../../../shared/references";
export type DraftPhoto = { id: string; file: File };
export type ReferenceDraft = {
  photos: DraftPhoto[];
  notes: string;
  measurementLabel: string;
  measurementMm: string;
};
export const emptyReferences: ReferenceDraft = {
  photos: [],
  notes: "",
  measurementLabel: "",
  measurementMm: "",
};
export function referenceContext(d: ReferenceDraft): ReferenceContext {
  return {
    referenceNotes: d.notes,
    ...(d.measurementLabel || d.measurementMm
      ? {
          referenceMeasurement: {
            label: d.measurementLabel,
            valueMm: Number(d.measurementMm),
          },
        }
      : {}),
  };
}
export async function validatePhoto(file: File) {
  if (
    !["image/jpeg", "image/png"].includes(file.type) ||
    !/\.(png|jpe?g)$/i.test(file.name) ||
    file.size <= 0 ||
    file.size > MAX_PHOTO_BYTES
  )
    throw new Error("Choose a JPEG or PNG up to 5 MiB.");
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > MAX_PHOTO_PIXELS)
      throw new Error("Reference photos must be 20 megapixels or smaller.");
  } finally {
    image.close();
  }
}
