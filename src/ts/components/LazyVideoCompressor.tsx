import { useEffect, useState } from "preact/hooks";
import type { ComponentType } from "preact";

interface VideoCompressorProps {
  file: File;
  onReset: () => void;
}

export const LazyVideoCompressor = (props: VideoCompressorProps) => {
  const [Comp, setComp] = useState<ComponentType<VideoCompressorProps> | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import("./VideoCompressor")
      .then((m) => alive && setComp(() => m.VideoCompressor))
      .catch((e: unknown) => {
        if (alive)
          setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return (
      <div class="compressor">
        <header class="compressor__header">
          <h1>Lessly · Compressor</h1>
          <button class="btn btn--small" onClick={props.onReset}>
            ← New file
          </button>
        </header>
        <div class="compressor__placeholder">
          <span class="compressor__error">
            Failed to load video pipeline: {err}
          </span>
        </div>
      </div>
    );
  }

  if (!Comp) {
    return (
      <div class="compressor">
        <header class="compressor__header">
          <h1>Lessly · Compressor</h1>
          <button class="btn btn--small" onClick={props.onReset}>
            ← New file
          </button>
        </header>
        <div class="compressor__placeholder">Loading video pipeline…</div>
      </div>
    );
  }

  return <Comp {...props} />;
};
