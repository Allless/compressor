import { useState } from "preact/hooks";

const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/gif,video/mp4,video/quicktime,video/webm,video/x-matroska,.heic,.heif,.mp4,.mov,.m4v,.webm,.mkv";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export const Dropzone = ({ onFiles, compact }: DropzoneProps) => {
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null | undefined) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      class={`dropzone ${compact ? "dropzone--compact" : ""} ${dragging ? "dropzone--active" : ""}`}
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
        handle(e.dataTransfer?.files);
      }}
    >
      <input
        type="file"
        accept={ACCEPTED}
        multiple
        class="dropzone__input"
        onChange={(e) => handle(e.currentTarget.files)}
      />
      <p class="dropzone__title">
        {compact ? "Add more images" : "Drop an image here"}
      </p>
      <p class="dropzone__subtitle">
        {compact ? "or click to add" : "or click to choose — drop multiple to batch"}
      </p>
    </div>
  );
};
