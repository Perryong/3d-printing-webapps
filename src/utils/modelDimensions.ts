import type { BufferGeometry } from "three";
export type XYZ = { x: number; y: number; z: number };
export const axes = ["x", "y", "z"] as const;
export function geometryDimensions(geometry: BufferGeometry): XYZ {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox!;
  return { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z };
}
export function scaleForDimensions(
  original: XYZ,
  target: XYZ,
  editedAxis: keyof XYZ,
  lockRatio: boolean,
): XYZ {
  for (const a of axes)
    if (
      !Number.isFinite(original[a]) ||
      original[a] <= 0 ||
      !Number.isFinite(target[a]) ||
      target[a] <= 0
    )
      throw new Error(
        "Dimensions must be finite and greater than zero. Flat geometry cannot be resized.",
      );
  const ratio = target[editedAxis] / original[editedAxis];
  return Object.fromEntries(
    axes.map((a) => [a, lockRatio ? ratio : target[a] / original[a]]),
  ) as XYZ;
}
