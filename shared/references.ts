import { z } from "zod";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 20_000_000;
export const referenceAssetSchema = z
  .object({
    path: z.string().min(1).max(300),
    originalName: z.string().min(1).max(255),
    bytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
    contentType: z.enum(["image/jpeg", "image/png"]),
  })
  .strict();
export const referenceMeasurementSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    valueMm: z.number().finite().positive().max(1_000_000),
  })
  .strict();
const xyz = z
  .object({
    x: z.number().finite().positive().max(1_000_000),
    y: z.number().finite().positive().max(1_000_000),
    z: z.number().finite().positive().max(1_000_000),
  })
  .strict();
export const customizationSchema = z
  .object({
    sourceName: z.string().min(1).max(255),
    originalBoundsMm: xyz,
    editedBoundsMm: xyz,
    scale: xyz,
    proportionsLocked: z.boolean(),
  })
  .strict();
export const referenceContextSchema = z
  .object({
    references: z.array(referenceAssetSchema).max(3).optional(),
    referenceNotes: z.string().trim().max(1000).optional(),
    referenceMeasurement: referenceMeasurementSchema.optional(),
    customization: customizationSchema.optional(),
  })
  .strict();
export type ReferenceAsset = z.infer<typeof referenceAssetSchema>;
export type ReferenceContext = z.infer<typeof referenceContextSchema>;
export type Customization = z.infer<typeof customizationSchema>;
