import { downloadZip } from "client-zip";

export interface ZipEntry {
  name: string;
  blob: Blob;
}

export const buildZip = async (entries: ZipEntry[]): Promise<Blob> => {
  return downloadZip(
    entries.map((e) => ({ name: e.name, input: e.blob })),
  ).blob();
};

export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
