// Client for the generation worker, with a synchronous fallback when Workers
// aren't available (tests / SSR). Requests are FIFO so the latest reforge wins.

import type { Params } from "../core/types";
import { buildWorld, type BuildResult, type KeepEdits } from "../core/worldgen";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: BuildResult) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./genWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<{ id: number; result: BuildResult }>) => {
      const { id, result } = e.data;
      const resolve = pending.get(id);
      if (resolve) {
        pending.delete(id);
        resolve(result);
      }
    };
    worker.onerror = () => {
      // give up on the worker; future calls fall back to synchronous generation
      worker = null;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

/** Generate a world, off the main thread when possible. */
export function generate(params: Params, keep?: KeepEdits): Promise<BuildResult> {
  const w = getWorker();
  if (!w) return Promise.resolve(buildWorld(params, keep));
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, params, keep });
  });
}
