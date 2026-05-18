import { useState } from "preact/hooks";

const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/gif,.heic,.heif";

interface DropzoneProps {
  onFile: (file: File) => void;
}

export const Dropzone = ({ onFile }: DropzoneProps) => {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined | null) => {
    if (file) onFile(file);
  };

  return (
    <div
      class={`dropzone ${dragging ? "dropzone--active" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer?.files[0]);
      }}
    >
      <input
        type="file"
        accept={ACCEPTED}
        class="dropzone__input"
        onChange={(e) => handleFile(e.currentTarget.files?.[0])}
      />
      <p class="dropzone__title">Drop an image here</p>
      <p class="dropzone__subtitle">or click to choose a file</p>
    </div>
  );
};
