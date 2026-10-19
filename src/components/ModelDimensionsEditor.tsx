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
  downloadDisabled,
  onDownload,
  children,
}: {
  model: ModelData;
  locked: boolean;
  downloadDisabled: boolean;
  onDownload: () => void;
  children?: React.ReactNode;
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
  function change(axis: keyof XYZ, value: string, proportional = locked) {
    const next = { ...values, [axis]: value };
    if (proportional && Number(value) > 0 && current[axis] > 0)
      for (const a of axes)
        if (a !== axis)
          next[a] = String(
            Number(((current[a] * Number(value)) / current[axis]).toFixed(4)),
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
        : scaleForDimensions(original, target, "x", locked, current);
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
    <div>
      <div className="max-h-32 overflow-y-auto px-3 py-2 md:max-h-52" tabIndex={0} aria-label="Dimension settings">
        <fieldset disabled={model.locked} className="space-y-2 disabled:opacity-50">
          <div className="grid grid-cols-3 gap-2">
            {axes.map((a) => (
              <label key={a} className="min-w-0 text-xs md:text-sm">
                <span aria-hidden="true">{a.toUpperCase()} (mm)</span>
                <input
                  aria-label={`${a.toUpperCase()} dimension (mm)`}
                  className="block min-h-11 w-full rounded border p-2 text-base"
                  type="number" min="0.0001" step="any"
                  value={values[a]}
                  onChange={(e) => change(a, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="flex min-h-8 items-center gap-2 text-sm">
            <input type="checkbox" checked={locked}
              aria-label="Lock proportions for dimension edits"
              onChange={(e) => {
                onLockChange(e.target.checked);
                if (e.target.checked && dirty) change("x", values.x, true);
              }} />
            Lock proportions
          </label>
          {!locked && <p className="text-sm text-amber-800">Independent scaling changes holes, wall thickness and clearances. Check fit before ordering.</p>}
        </fieldset>
        <p className="mt-2 text-xs text-slate-600">
          Overall model dimensions in mm (STL units assumed). Original: {axes.map((a) => original[a].toFixed(2)).join(" × ")} mm.
          These axes follow the original model, independent of camera or placement.
        </p>
        {model.locked && <p>Unlock the model in Model controls to resize it.</p>}
        {children}
      </div>
      {error && <p role="alert" className="px-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-3 gap-2 border-t bg-white px-3 py-2">
        <button aria-label="Apply dimensions" className="min-h-11 rounded bg-blue-700 px-2 text-sm text-white disabled:opacity-50"
          disabled={!dirty || model.locked} onClick={() => apply()}>Apply</button>
        <button aria-label="Reset original dimensions" className="min-h-11 rounded border px-2 text-sm disabled:opacity-50"
          disabled={model.locked} onClick={() => apply(true)}>Reset</button>
        <button aria-label="Download edited STL" className="min-h-11 rounded border px-2 text-sm disabled:opacity-50"
          disabled={downloadDisabled} onClick={onDownload}>Download</button>
      </div>
      {dirty && <p className="px-3 pb-2 text-xs">Apply or reset dimensions before requesting a quote.</p>}
    </div>
  );
}
