import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Dropzone } from "./Dropzone";
import {
  compress,
  detectFormat,
  type DecodableFormat,
  type EncodableFormat,
} from "../lib/compress";
import { formatBytes } from "../lib/format";
import { buildZip, triggerDownload } from "../lib/zip";

type Status = "pending" | "processing" | "done" | "error";

interface Item {
  id: string;
  file: File;
  inputFormat: DecodableFormat | null;
  status: Status;
  output?: { blob: Blob; format: EncodableFormat };
  error?: string;
}

interface BatchViewProps {
  initialFiles: File[];
  onReset: () => void;
  initialTarget?: EncodableFormat;
}

const TARGETS: { value: EncodableFormat; label: string }[] = [
  { value: "webp", label: "WebP" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "avif", label: "AVIF" },
  { value: "gif", label: "GIF" },
];

const downloadName = (original: File, format: EncodableFormat): string => {
  const base = original.name.replace(/\.[^.]+$/, "");
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}.${ext}`;
};

const makeItem = (file: File): Item => {
  let inputFormat: DecodableFormat | null = null;
  try {
    inputFormat = detectFormat(file);
  } catch {
    // leave null; processing will surface a clearer error
  }
  return {
    id: crypto.randomUUID(),
    file,
    inputFormat,
    status: "pending",
  };
};

export const BatchView = ({
  initialFiles,
  onReset,
  initialTarget,
}: BatchViewProps) => {
  const [items, setItems] = useState<Item[]>(() => initialFiles.map(makeItem));
  const [target, setTarget] = useState<EncodableFormat>(
    initialTarget ?? "webp",
  );
  const [quality, setQuality] = useState(75);
  const [zipping, setZipping] = useState(false);

  // Sequential processing using a ref to avoid useEffect race conditions.
  const processingRef = useRef(false);
  const itemsRef = useRef<Item[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (processingRef.current) return;
    if (!items.some((i) => i.status === "pending")) return;

    processingRef.current = true;
    (async () => {
      while (true) {
        const next = itemsRef.current.find((i) => i.status === "pending");
        if (!next) break;

        setItems((prev) =>
          prev.map((i) =>
            i.id === next.id ? { ...i, status: "processing" } : i,
          ),
        );

        try {
          const output = await compress(next.file, target, quality);
          setItems((prev) =>
            prev.map((i) => {
              if (i.id !== next.id) return i;
              // If user re-queued this item during the await, leave it alone.
              if (i.status !== "processing") return i;
              return { ...i, status: "done", output };
            }),
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setItems((prev) =>
            prev.map((i) => {
              if (i.id !== next.id) return i;
              if (i.status !== "processing") return i;
              return { ...i, status: "error", error: message };
            }),
          );
        }
      }
      processingRef.current = false;
    })();
  }, [items, target, quality]);

  const addFiles = (files: File[]) => {
    setItems((prev) => [...prev, ...files.map(makeItem)]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const reprocessAll = () => {
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        status: "pending" as Status,
        output: undefined,
        error: undefined,
      })),
    );
  };

  const counts = useMemo(() => {
    const out = { pending: 0, processing: 0, done: 0, error: 0 };
    for (const i of items) out[i.status]++;
    return out;
  }, [items]);

  const downloadAll = async () => {
    const entries: { name: string; blob: Blob }[] = [];
    for (const i of items) {
      if (i.status === "done" && i.output) {
        entries.push({
          name: downloadName(i.file, i.output.format),
          blob: i.output.blob,
        });
      }
    }
    if (entries.length === 0) return;
    setZipping(true);
    try {
      const blob = await buildZip(entries);
      triggerDownload(blob, `lessly-${Date.now()}.zip`);
    } finally {
      setZipping(false);
    }
  };

  const canDownloadAll = counts.done > 0 && !zipping;
  const busy = counts.pending > 0 || counts.processing > 0;

  return (
    <div class="converter">
      <header class="converter__header">
        <h1>Lessly — Batch</h1>
        <button class="btn btn--small" onClick={onReset}>
          ← Back
        </button>
      </header>

      <div class="controls controls--sticky">
        <label class="control">
          <span class="control__label">Output format</span>
          <select
            class="control__select"
            value={target}
            onChange={(e) =>
              setTarget(e.currentTarget.value as EncodableFormat)
            }
          >
            {TARGETS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {target !== "png" && (
          <label class="control">
            <span class="control__label">Quality · {quality}</span>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onInput={(e) => setQuality(Number(e.currentTarget.value))}
              class="control__range"
            />
          </label>
        )}

        <div class="controls__actions">
          <button
            class="btn btn--small"
            onClick={reprocessAll}
            disabled={busy}
          >
            Re-process all
          </button>
          <button
            class="btn btn--primary"
            onClick={downloadAll}
            disabled={!canDownloadAll}
          >
            {zipping
              ? "Zipping…"
              : `Download all${counts.done > 0 ? ` (${counts.done})` : ""}`}
          </button>
        </div>
      </div>

      <ul class="queue">
        {items.map((item) => {
          const output = item.output;
          const originalSize = item.file.size;
          const newSize = output?.blob.size ?? 0;
          const savings =
            output && originalSize > 0
              ? ((originalSize - newSize) / originalSize) * 100
              : 0;

          return (
            <li key={item.id} class={`queue-item queue-item--${item.status}`}>
              <div class="queue-item__main">
                <div class="queue-item__name">{item.file.name}</div>
                <div class="queue-item__meta">
                  {formatBytes(originalSize)}
                  {item.inputFormat && ` · ${item.inputFormat.toUpperCase()}`}
                  {item.status === "done" && output && (
                    <>
                      {" → "}
                      {formatBytes(newSize)}
                      {" · "}
                      {output.format.toUpperCase()}
                      <span
                        class={`queue-item__savings ${savings < 0 ? "queue-item__savings--negative" : ""}`}
                      >
                        {savings >= 0
                          ? ` −${savings.toFixed(0)}%`
                          : ` +${(-savings).toFixed(0)}%`}
                      </span>
                    </>
                  )}
                </div>
                {item.status === "error" && item.error && (
                  <div class="queue-item__error">{item.error}</div>
                )}
              </div>

              <div class="queue-item__actions">
                {item.status === "pending" && (
                  <span class="queue-item__badge">Pending</span>
                )}
                {item.status === "processing" && (
                  <span class="queue-item__badge queue-item__badge--processing">
                    Converting…
                  </span>
                )}
                {item.status === "done" && output && (
                  <button
                    class="btn btn--small"
                    onClick={() =>
                      triggerDownload(
                        output.blob,
                        downloadName(item.file, output.format),
                      )
                    }
                  >
                    Download
                  </button>
                )}
                <button
                  class="queue-item__remove"
                  aria-label="Remove"
                  onClick={() => removeItem(item.id)}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dropzone onFiles={addFiles} compact />
    </div>
  );
};
