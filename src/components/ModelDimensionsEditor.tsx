import React, { useState } from "react";
import {
  axes,
  geometryDimensions,
  scaleForDimensions,
  type XYZ,
} from "../utils/modelDimensions";
import type { ModelData } from "../utils/modelManager";
export default function ModelDimensionsEditor({
  model,
  onApply,
  onDirty,
  onLockChange,
  locked,
}: {
  model: ModelData;
  locked: boolean;
  onApply: (scale: XYZ) => void;
  onDirty: (dirty: boolean) => void;
  onLockChange: (locked: boolean) => void;
}) {
  const original = geometryDimensions(model.originalGeometry);
  const current = Object.fromEntries(
    axes.map((a) => [a, original[a] * model.transform.scale[a]]),
  ) as XYZ;
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        axes.map((a) => [a, String(Number(current[a].toFixed(4)))]),
      ) as Record<keyof XYZ, string>,
  );
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  function change(axis: keyof XYZ, value: string) {
    const next = { ...values, [axis]: value };
    if (locked && Number(value) > 0 && original[axis] > 0)
      for (const a of axes)
        if (a !== axis)
          next[a] = String(
            Number(((original[a] * Number(value)) / original[axis]).toFixed(4)),
          );
    setValues(next);
    setDirty(true);
    onDirty(true);
    setError("");
  }
  function apply(reset = false) {
    try {
      const target = Object.fromEntries(
        axes.map((a) => [a, Number(values[a])]),
      ) as XYZ;
      const scale = reset
        ? { x: 1, y: 1, z: 1 }
        : scaleForDimensions(original, target, "x", locked);
      onApply(scale);
      setValues(Object.fromEntries(axes.map(a=>[a,String(Number((original[a]*scale[a]).toFixed(4)))])) as Record<keyof XYZ,string>);
      onDirty(false);
      setDirty(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Overall model dimensions in mm (STL units assumed). Original:{" "}
        {axes.map((a) => original[a].toFixed(2)).join(" × ")} mm. These axes
        follow the original model, independent of camera or placement.
      </p>
      <fieldset
        disabled={model.locked}
        className="space-y-3 disabled:opacity-50"
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => {
              onLockChange(e.target.checked);
            }}
          />
          Lock proportions for dimension edits
        </label>
        {!locked && (
          <p className="text-amber-800">
            Independent scaling changes holes, wall thickness and clearances.
            Check fit before ordering.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {axes.map((a) => (
            <label key={a} className="min-w-0">
              {a.toUpperCase()} dimension (mm)
              <input
                className="block w-full rounded border p-2"
                type="number"
                min="0.0001"
                step="any"
                value={values[a]}
                onChange={(e) => change(a, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
            disabled={!dirty}
            onClick={() => apply()}
          >
            Apply dimensions
          </button>
          <button
            className="rounded border px-3 py-2"
            onClick={() => apply(true)}
          >
            Reset original dimensions
          </button>
        </div>
      </fieldset>
      {model.locked && <p>Unlock the model in Model controls to resize it.</p>}
      {dirty && <p>Apply or reset dimensions before requesting a quote.</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
