declare module "libheif-js/wasm-bundle" {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      imageData: ImageData,
      callback: (displayData: ImageData | null) => void,
    ): void;
  }
  interface HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }
  const libheif: {
    HeifDecoder: new () => HeifDecoder;
  };
  export default libheif;
}

declare module "gifsicle-wasm-browser" {
  interface GifsicleInput {
    file: File | Blob | ArrayBuffer | string;
    name: string;
  }
  interface GifsicleOptions {
    input: GifsicleInput[];
    command: string[];
    folder?: string[];
    isStrict?: boolean;
  }
  const gifsicle: {
    run(options: GifsicleOptions): Promise<File[]>;
  };
  export default gifsicle;
}
