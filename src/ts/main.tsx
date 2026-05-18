import { render } from "preact";
import { useState } from "preact/hooks";
import { Dropzone } from "./components/Dropzone";
import { Compressor } from "./components/Compressor";
import { BatchView } from "./components/BatchView";

const App = () => {
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => setFiles([]);

  if (files.length === 0) {
    return (
      <div class="landing">
        <h1>Lessly</h1>
        <p class="landing__tagline">
          Compress images in your browser. No upload, fully private.
        </p>
        <Dropzone onFiles={setFiles} />
        <p class="landing__formats">JPEG · PNG · WebP · AVIF · HEIC · GIF</p>
      </div>
    );
  }

  if (files.length === 1) {
    return <Compressor file={files[0]} onReset={reset} />;
  }

  return <BatchView initialFiles={files} onReset={reset} />;
};

const root = document.getElementById("app");
if (root) render(<App />, root);
