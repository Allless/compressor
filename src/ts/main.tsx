import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Dropzone } from "./components/Dropzone";
import { Compressor } from "./components/Compressor";
import { BatchView } from "./components/BatchView";
import { LazyVideoCompressor } from "./components/LazyVideoCompressor";
import { parseRoute } from "./lib/route";
import { isVideoFile } from "./lib/detect-video";
import { routeFiles } from "./lib/route-files";

const ROUTE = parseRoute(window.location.pathname);

const App = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // `dragenter` / `dragleave` fire for every child element crossed during a
  // single drag, so we keep a counter and only toggle the overlay when it
  // hits zero. Refs keep the counter from triggering re-renders.
  const dragDepth = useRef(0);

  const reset = () => {
    setFiles([]);
    setNotice(null);
  };

  const handleFiles = (incoming: File[]) => {
    const decision = routeFiles(incoming);
    setNotice(decision.notice);
    setFiles(decision.files);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && files.length > 0) reset();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (files.length > 0) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const dropped: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) dropped.push(f);
        }
      }
      if (dropped.length > 0) {
        e.preventDefault();
        handleFiles(dropped);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [files.length]);

  // Full-page drop target — only active on the landing view to avoid
  // hijacking drops onto the Compressor / BatchView, where the dropzone
  // semantics differ (replace vs append).
  useEffect(() => {
    if (files.length > 0) return;

    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer?.types?.includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current++;
      setDragOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      const list = e.dataTransfer?.files;
      if (list && list.length > 0) handleFiles(Array.from(list));
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      dragDepth.current = 0;
      setDragOver(false);
    };
  }, [files.length]);

  const banner = notice ? <div class="notice">{notice}</div> : null;
  const overlay = dragOver ? (
    <div class="drag-overlay" aria-hidden="true">
      <div class="drag-overlay__inner">Drop file to compress</div>
    </div>
  ) : null;

  if (files.length === 0) {
    return (
      <>
        <div class="landing">
          {banner}
          <h1>
            {ROUTE
              ? `Free ${ROUTE.label} ${ROUTE.verb}`
              : "Allless · Compressor"}
          </h1>
          <p class="landing__tagline">
            {ROUTE
              ? `Drop your ${ROUTE.label} files. Everything runs locally in your browser — no upload.`
              : "Compress images and video in your browser. No upload, fully private."}
          </p>
          <Dropzone onFiles={handleFiles} />
          <p class="landing__formats">
            JPEG · PNG · WebP · AVIF · HEIC · GIF · MP4 · MOV · WebM · MKV
          </p>
          <p class="landing__hint">Or paste an image from the clipboard.</p>
        </div>
        {overlay}
      </>
    );
  }

  if (files.length === 1) {
    if (isVideoFile(files[0])) {
      return (
        <>
          {banner}
          <LazyVideoCompressor file={files[0]} onReset={reset} />
        </>
      );
    }
    return (
      <>
        {banner}
        <Compressor file={files[0]} onReset={reset} />
      </>
    );
  }

  return (
    <>
      {banner}
      <BatchView initialFiles={files} onReset={reset} />
    </>
  );
};

const root = document.getElementById("app");
if (root) render(<App />, root);
