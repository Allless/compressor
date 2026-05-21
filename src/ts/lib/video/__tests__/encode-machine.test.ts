import { describe, expect, it } from "vitest";
import {
  initialMachineState,
  reduce,
  type MachineState,
  type VideoMeta,
} from "..";

const meta = (): VideoMeta => ({
  displayWidth: 1920,
  displayHeight: 1080,
  durationSec: 10,
  hasAudio: true,
});

const blob = () => new Blob([new Uint8Array(4)], { type: "video/mp4" });

const ready = (): MachineState => ({
  ...initialMachineState(),
  probe: "supported",
  meta: meta(),
});

const busyReady = (): MachineState => ({
  ...ready(),
  busy: true,
  progress: 0.3,
});

describe("encode-machine: initial state", () => {
  it("starts in 'checking' with no meta, no encode", () => {
    const s = initialMachineState();
    expect(s.probe).toBe("checking");
    expect(s.meta).toBeNull();
    expect(s.busy).toBe(false);
    expect(s.output).toBeNull();
    expect(s.err).toBeNull();
  });
});

describe("encode-machine: probe events", () => {
  it("probe-ok flips probe to supported", () => {
    const { state, effects } = reduce(initialMachineState(), {
      type: "probe-ok",
    });
    expect(state.probe).toBe("supported");
    expect(effects).toEqual([]);
  });

  it("probe-ok kicks off encode when meta is already loaded", () => {
    const s: MachineState = {
      ...initialMachineState(),
      meta: meta(),
    };
    const { state, effects } = reduce(s, { type: "probe-ok" });
    expect(state.busy).toBe(true);
    expect(effects).toEqual(["start-encode"]);
  });

  it("probe-fail flips probe to unsupported and cancels any in-flight encode", () => {
    const { state, effects } = reduce(busyReady(), { type: "probe-fail" });
    expect(state.probe).toBe("unsupported");
    expect(effects).toEqual(["cancel-encode"]);
  });

  it("probe-fail without in-flight encode emits no effects", () => {
    const { effects } = reduce(initialMachineState(), { type: "probe-fail" });
    expect(effects).toEqual([]);
  });
});

describe("encode-machine: metadata events", () => {
  it("meta-loaded stores meta and kicks off encode when probe is supported", () => {
    const s: MachineState = {
      ...initialMachineState(),
      probe: "supported",
    };
    const { state, effects } = reduce(s, {
      type: "meta-loaded",
      meta: meta(),
    });
    expect(state.meta).toEqual(meta());
    expect(state.busy).toBe(true);
    expect(effects).toEqual(["start-encode"]);
  });

  it("meta-loaded waits for probe before starting encode", () => {
    const { state, effects } = reduce(initialMachineState(), {
      type: "meta-loaded",
      meta: meta(),
    });
    expect(state.meta).toEqual(meta());
    expect(state.busy).toBe(false);
    expect(effects).toEqual([]);
  });

  it("meta-failed records the error message and does not start anything", () => {
    const { state, effects } = reduce(initialMachineState(), {
      type: "meta-failed",
      msg: "not a video",
    });
    expect(state.metaError).toBe("not a video");
    expect(effects).toEqual([]);
  });

  it("meta-loaded clears a prior metaError", () => {
    const s: MachineState = {
      ...initialMachineState(),
      metaError: "stale error",
    };
    const { state } = reduce(s, { type: "meta-loaded", meta: meta() });
    expect(state.metaError).toBeNull();
  });
});

describe("encode-machine: settings changes", () => {
  it("settings-changed restarts the encode when one is in flight", () => {
    const s = busyReady();
    const { state, effects } = reduce(s, { type: "settings-changed" });
    expect(state.busy).toBe(true);
    expect(state.progress).toBe(0);
    expect(effects).toEqual(["cancel-encode", "start-encode"]);
  });

  it("settings-changed starts an encode when idle but ready", () => {
    const { state, effects } = reduce(ready(), { type: "settings-changed" });
    expect(state.busy).toBe(true);
    expect(effects).toEqual(["start-encode"]);
  });

  it("settings-changed is ignored while probe is still checking", () => {
    const { state, effects } = reduce(initialMachineState(), {
      type: "settings-changed",
    });
    expect(state.busy).toBe(false);
    expect(effects).toEqual([]);
  });

  it("settings-changed is ignored when probe is unsupported", () => {
    const s: MachineState = {
      ...initialMachineState(),
      probe: "unsupported",
      meta: meta(),
    };
    const { effects } = reduce(s, { type: "settings-changed" });
    expect(effects).toEqual([]);
  });

  it("settings-changed clears prior output and error", () => {
    const s: MachineState = {
      ...ready(),
      output: blob(),
      err: "stale error",
    };
    const { state } = reduce(s, { type: "settings-changed" });
    expect(state.output).toBeNull();
    expect(state.err).toBeNull();
  });
});

describe("encode-machine: progress and completion", () => {
  it("progress updates only when busy", () => {
    const idle = reduce(ready(), { type: "progress", p: 0.5 });
    expect(idle.state.progress).toBe(0);

    const busy = reduce(busyReady(), { type: "progress", p: 0.5 });
    expect(busy.state.progress).toBe(0.5);
  });

  it("encode-done stores the blob, clears busy, sets progress to 1", () => {
    const b = blob();
    const { state, effects } = reduce(busyReady(), {
      type: "encode-done",
      blob: b,
    });
    expect(state.output).toBe(b);
    expect(state.busy).toBe(false);
    expect(state.progress).toBe(1);
    expect(effects).toEqual([]);
  });

  it("encode-failed records the message and clears busy", () => {
    const { state, effects } = reduce(busyReady(), {
      type: "encode-failed",
      msg: "codec exploded",
    });
    expect(state.err).toBe("codec exploded");
    expect(state.busy).toBe(false);
    expect(effects).toEqual([]);
  });
});

describe("encode-machine: cancellation", () => {
  it("cancel-requested while busy clears busy and emits cancel-encode", () => {
    const { state, effects } = reduce(busyReady(), {
      type: "cancel-requested",
    });
    expect(state.busy).toBe(false);
    expect(effects).toEqual(["cancel-encode"]);
  });

  it("cancel-requested while idle is a no-op", () => {
    const { state, effects } = reduce(ready(), { type: "cancel-requested" });
    expect(state.busy).toBe(false);
    expect(effects).toEqual([]);
  });
});

describe("encode-machine: reset", () => {
  it("reset returns to the initial state", () => {
    const s: MachineState = {
      probe: "supported",
      meta: meta(),
      metaError: null,
      progress: 0.5,
      output: blob(),
      err: null,
      busy: true,
    };
    const { state, effects } = reduce(s, { type: "reset" });
    expect(state).toEqual(initialMachineState());
    expect(effects).toEqual(["cancel-encode"]);
  });

  it("reset from idle emits no effects", () => {
    const { effects } = reduce(initialMachineState(), { type: "reset" });
    expect(effects).toEqual([]);
  });
});
