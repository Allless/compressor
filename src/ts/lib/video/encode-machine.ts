import type { VideoMeta } from "./types";

export type ProbeState = "checking" | "supported" | "unsupported";

export interface MachineState {
  probe: ProbeState;
  meta: VideoMeta | null;
  metaError: string | null;
  progress: number;
  output: Blob | null;
  err: string | null;
  busy: boolean;
}

export type MachineEvent =
  | { type: "reset" }
  | { type: "probe-ok" }
  | { type: "probe-fail" }
  | { type: "meta-loaded"; meta: VideoMeta }
  | { type: "meta-failed"; msg: string }
  | { type: "settings-changed" }
  | { type: "progress"; p: number }
  | { type: "encode-done"; blob: Blob }
  | { type: "encode-failed"; msg: string }
  | { type: "cancel-requested" };

export type MachineEffect = "start-encode" | "cancel-encode";

export interface Transition {
  state: MachineState;
  effects: MachineEffect[];
}

export const initialMachineState = (): MachineState => ({
  probe: "checking",
  meta: null,
  metaError: null,
  progress: 0,
  output: null,
  err: null,
  busy: false,
});

const canEncode = (s: MachineState): boolean =>
  s.probe === "supported" && s.meta !== null;

const startEncode = (s: MachineState): Transition => ({
  state: {
    ...s,
    busy: true,
    progress: 0,
    output: null,
    err: null,
  },
  effects: s.busy ? ["cancel-encode", "start-encode"] : ["start-encode"],
});

export const reduce = (
  state: MachineState,
  event: MachineEvent,
): Transition => {
  switch (event.type) {
    case "reset":
      return {
        state: initialMachineState(),
        effects: state.busy ? ["cancel-encode"] : [],
      };

    case "probe-ok": {
      const next: MachineState = { ...state, probe: "supported" };
      if (canEncode(next) && !state.busy) return startEncode(next);
      return { state: next, effects: [] };
    }

    case "probe-fail":
      return {
        state: { ...state, probe: "unsupported" },
        effects: state.busy ? ["cancel-encode"] : [],
      };

    case "meta-loaded": {
      const next: MachineState = {
        ...state,
        meta: event.meta,
        metaError: null,
      };
      if (canEncode(next) && !state.busy) return startEncode(next);
      return { state: next, effects: [] };
    }

    case "meta-failed":
      return { state: { ...state, metaError: event.msg }, effects: [] };

    case "settings-changed":
      if (!canEncode(state)) return { state, effects: [] };
      return startEncode(state);

    case "progress":
      if (!state.busy) return { state, effects: [] };
      return { state: { ...state, progress: event.p }, effects: [] };

    case "encode-done":
      return {
        state: { ...state, busy: false, output: event.blob, progress: 1 },
        effects: [],
      };

    case "encode-failed":
      return {
        state: { ...state, busy: false, err: event.msg },
        effects: [],
      };

    case "cancel-requested":
      if (!state.busy) return { state, effects: [] };
      return {
        state: { ...state, busy: false },
        effects: ["cancel-encode"],
      };
  }
};
