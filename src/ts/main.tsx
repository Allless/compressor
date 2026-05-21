import { render } from "preact";
import { useState } from "preact/hooks";
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

  const reset = () => {
    setFiles([]);
    setNotice(null);
  };

  const handleFiles = (incoming: File[]) => {
    const decision = routeFiles(incoming);
    setNotice(decision.notice);
    setFiles(decision.files);
  };

  const banner = notice ? <div class="notice">{notice}</div> : null;

  if (files.length === 0) {
    return (
      <div class="landing">
        {banner}
        <h1>
          {ROUTE
            ? `Free ${ROUTE.label} ${ROUTE.verb}`
            : "Lessly · Compressor"}
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
      </div>
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
