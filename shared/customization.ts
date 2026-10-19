import { z } from "zod";
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
export type Customization = z.infer<typeof customizationSchema>;
