import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { geometryDimensions } from "./modelDimensions";
export async function createModelSnapshot(
  mesh: THREE.Mesh,
  sourceName = "selected-part.stl",
) {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  try {
    geometry.rotateX(Math.PI / 2);
    const boundsMm = geometryDimensions(geometry);
    if (Object.values(boundsMm).some((n) => !Number.isFinite(n) || n < 0))
      throw new Error("Cannot export invalid geometry.");
    const data = new STLExporter().parse(new THREE.Mesh(geometry), {
      binary: true,
    });
    const bytes = new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    ).slice();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const revision = Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    const file = new File(
      [bytes],
      sourceName.replace(/\.stl$/i, "") + "-edited.stl",
      { type: "application/octet-stream" },
    );
    return { file, revision, boundsMm, geometry };
  } catch (e) {
    geometry.dispose();
    throw e;
  }
}
