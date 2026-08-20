// Web Worker that runs world generation off the main thread so reforging a
// large continent never janks the UI. buildWorld is pure (no DOM), so it runs
// unchanged here; typed arrays are structure-cloned back to the caller.

import type { Params } from "../core/types";
import { buildWorld, type KeepEdits } from "../core/worldgen";

interface GenRequest {
  id: number;
  params: Params;
  keep?: KeepEdits;
}

// Cast the worker global to a minimal shape to avoid DOM/WebWorker lib clashes.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<GenRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

ctx.onmessage = (e) => {
  const { id, params, keep } = e.data;
  const result = buildWorld(params, keep);
  ctx.postMessage({ id, result });
};
