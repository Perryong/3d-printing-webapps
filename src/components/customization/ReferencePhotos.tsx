import React, { useEffect, useState, useRef } from "react";
import { validatePhoto, type ReferenceDraft } from "./referenceDraft";
function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <img src={url} alt={file.name} className="h-24 w-full object-contain" />
  );
}
export default function ReferencePhotos({
  draft,
  onChange,
  disabled,
  onPending,
}: {
  draft: ReferenceDraft;
  onChange: (d: ReferenceDraft) => void;
  disabled: boolean;
  onPending: (pending: boolean) => void;
}) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const latest = useRef(draft);
  latest.current = draft;
  return (
    <div className="space-y-3 border-t pt-3">
      <h3 className="font-semibold">Photo references (optional)</h3>
      <p className="text-sm">
        Reference only — photos do not generate CAD. Up to 3 JPEG/PNG files, 5
        MiB and 20 megapixels each. Uploaded only when you submit a quote
        request.
      </p>
      <label>
        Add reference photos
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={disabled || loading || draft.photos.length >= 3}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            setError("");
            setLoading(true);
            onPending(true);
            try {
              if (files.length + latest.current.photos.length > 3)
                throw new Error("Maximum 3 reference photos.");
              for (const f of files) await validatePhoto(f);
              onChange({
                ...latest.current,
                photos: [
                  ...latest.current.photos,
                  ...files.map((file) => ({ file, id: crypto.randomUUID() })),
                ],
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
              onPending(false);
            }
          }}
        />
      </label>
      {loading && <p>Checking photos…</p>}
      <div className="grid grid-cols-3 gap-2">
        {draft.photos.map((p) => (
          <div key={p.id} className="min-w-0">
            <Preview file={p.file} />
            <p className="text-xs break-all">{p.file.name}</p>
            <button
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...draft,
                  photos: draft.photos.filter((f) => f.id !== p.id),
                })
              }
              aria-label={"Remove " + p.file.name}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <label>
        Reference notes
        <textarea
          maxLength={1000}
          disabled={disabled}
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        />
      </label>
      <label>
        Known measurement label (optional)
        <input
          maxLength={80}
          disabled={disabled}
          placeholder="e.g. mounting hole spacing"
          value={draft.measurementLabel}
          onChange={(e) =>
            onChange({ ...draft, measurementLabel: e.target.value })
          }
        />
      </label>
      <label>
        Known measurement (mm)
        <input
          type="number"
          min="0.0001"
          step="any"
          disabled={disabled}
          value={draft.measurementMm}
          onChange={(e) =>
            onChange({ ...draft, measurementMm: e.target.value })
          }
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
