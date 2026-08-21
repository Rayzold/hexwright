import { beforeAll, describe, expect, it } from "vitest";
import { useStore } from "./useStore";

// generation resolves on a microtask (worker falls back to sync in node)
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("undo/redo", () => {
  beforeAll(async () => {
    useStore.getState().setParam("size", "small");
    useStore.getState().build(false);
    await flush();
  });

  it("captures a paint edit and restores it on undo/redo", () => {
    const world = useStore.getState().world!;
    expect(world).toBeTruthy();
    const original = world.biome[0];

    useStore.getState().pickTool("t:mountains");
    useStore.getState().beginBrush(0);
    expect(useStore.getState().world!.biome[0]).toBe("mountains");
    expect(useStore.getState().undoStack.length).toBe(1);

    useStore.getState().undo();
    expect(useStore.getState().world!.biome[0]).toBe(original);
    expect(useStore.getState().redoStack.length).toBe(1);

    useStore.getState().redo();
    expect(useStore.getState().world!.biome[0]).toBe("mountains");
  });

  it("clears the redo stack when a new edit is made", () => {
    useStore.getState().undo(); // -> redo available
    expect(useStore.getState().redoStack.length).toBeGreaterThan(0);
    useStore.getState().beginBrush(1); // new edit
    expect(useStore.getState().redoStack.length).toBe(0);
  });
});
