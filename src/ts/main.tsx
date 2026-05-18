import { render } from "preact";
import { useState } from "preact/hooks";
import { Dropzone } from "./components/Dropzone";
import { Compressor } from "./components/Compressor";

const App = () => {
  const [file, setFile] = useState<File | null>(null);

  if (!file) {
    return (
      <div class="landing">
        <h1>Lessly</h1>
        <p class="landing__tagline">
          Compress images in your browser. No upload, fully private.
        </p>
        <Dropzone onFile={setFile} />
        <p class="landing__formats">
          JPEG · PNG · WebP · AVIF · HEIC · GIF
        </p>
      </div>
    );
  }

  return <Compressor file={file} onReset={() => setFile(null)} />;
};

const root = document.getElementById("app");
if (root) render(<App />, root);
