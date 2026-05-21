import { useEffect, useRef, useState } from "preact/hooks";
import {
  encodeVideo as defaultEncodeVideo,
  initialMachineState,
  probeFile as defaultProbeFile,
  probeH264Encode as defaultProbeH264,
  reduce,
  type EncodeHandle,
  type EncodeOptions,
  type MachineEffect,
  type MachineEvent,
  type MachineState,
  type ProbeState,
  type VideoMeta,
  type VideoSettings,
} from "../lib/video";

export type { ProbeState };

export interface UseEncodeRuntime {
  probeH264Encode?: () => Promise<boolean>;
  probeFile?: (file: File) => Promise<VideoMeta>;
  encodeVideo?: (opts: EncodeOptions) => EncodeHandle;
}

export type UseEncodeState = MachineState & { cancel: () => void };

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

/**
 * Thin shell over the pure `encode-machine` reducer. Responsibilities:
 *   - call the effectful probe / encode boundary functions when needed,
 *   - translate their callbacks into reducer events,
 *   - filter stale callbacks via a generation counter so race conditions
 *     between cancelled and current encodes can't leak progress / errors.
 *
 * All state-transition logic lives in `lib/video/encode-machine.ts` and is
 * unit-tested directly. This hook contains no decision logic.
 */
export const useEncode = (
  file: File,
  settings: VideoSettings,
  runtime: UseEncodeRuntime = {},
): UseEncodeState => {
  const probeH264 = runtime.probeH264Encode ?? defaultProbeH264;
  const probeFile = runtime.probeFile ?? defaultProbeFile;
  const encode = runtime.encodeVideo ?? defaultEncodeVideo;

  const [state, setState] = useState<MachineState>(initialMachineState);
  const stateRef = useRef<MachineState>(state);
  stateRef.current = state;

  const handleRef = useRef<EncodeHandle | null>(null);
  const generationRef = useRef(0);
  const fileRef = useRef<File>(file);
  fileRef.current = file;
  const settingsRef = useRef<VideoSettings>(settings);
  settingsRef.current = settings;
  const encodeRef = useRef(encode);
  encodeRef.current = encode;

  // Forward-declared dispatch reference so runEffect can re-enter the reducer
  // without a circular function-definition order.
  const dispatchRef = useRef<(e: MachineEvent) => void>(() => {});

  const runEffect = (effect: MachineEffect) => {
    if (effect === "cancel-encode") {
      handleRef.current?.cancel().catch(() => {});
      handleRef.current = null;
      return;
    }
    const gen = ++generationRef.current;
    handleRef.current?.cancel().catch(() => {});
    const handle = encodeRef.current({
      file: fileRef.current,
      settings: settingsRef.current,
      onProgress: (p) => {
        if (generationRef.current === gen) {
          dispatchRef.current({ type: "progress", p });
        }
      },
    });
    handleRef.current = handle;
    handle.result
      .then((blob) => {
        if (generationRef.current === gen) {
          dispatchRef.current({ type: "encode-done", blob });
        }
      })
      .catch((e: unknown) => {
        if (generationRef.current !== gen) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        dispatchRef.current({ type: "encode-failed", msg: errorMessage(e) });
      });
  };

  const dispatch = (event: MachineEvent) => {
    const { state: next, effects } = reduce(stateRef.current, event);
    stateRef.current = next;
    setState(next);
    for (const eff of effects) runEffect(eff);
  };
  dispatchRef.current = dispatch;

  useEffect(() => {
    dispatch({ type: "reset" });
    let alive = true;
    probeH264()
      .then((ok) => {
        if (alive) dispatch({ type: ok ? "probe-ok" : "probe-fail" });
      })
      .catch(() => {
        if (alive) dispatch({ type: "probe-fail" });
      });
    probeFile(file)
      .then((m) => {
        if (alive) dispatch({ type: "meta-loaded", meta: m });
      })
      .catch((e: unknown) => {
        if (alive) dispatch({ type: "meta-failed", msg: errorMessage(e) });
      });
    return () => {
      alive = false;
      handleRef.current?.cancel().catch(() => {});
      handleRef.current = null;
      generationRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, probeH264, probeFile]);

  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    dispatch({ type: "settings-changed" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  return { ...state, cancel: () => dispatch({ type: "cancel-requested" }) };
};
