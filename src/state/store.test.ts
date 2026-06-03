import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";
import { createEmptyProject } from "./project";

describe("store undo/redo", () => {
  beforeEach(() => {
    useStore.setState({
      project: createEmptyProject(),
      past: [],
      future: [],
    });
  });

  it("commits a change and can undo it", () => {
    const s = useStore.getState();
    expect(s.canUndo()).toBe(false);

    s.commit((d) => {
      d.name = "Office";
    });
    expect(useStore.getState().project.name).toBe("Office");
    expect(useStore.getState().canUndo()).toBe(true);

    useStore.getState().undo();
    expect(useStore.getState().project.name).toBe("Untitled plan");
  });

  it("redoes an undone change", () => {
    const s = useStore.getState();
    s.commit((d) => {
      d.name = "Warehouse";
    });
    useStore.getState().undo();
    expect(useStore.getState().canRedo()).toBe(true);

    useStore.getState().redo();
    expect(useStore.getState().project.name).toBe("Warehouse");
  });

  it("does not record history for a no-op recipe", () => {
    const s = useStore.getState();
    s.commit(() => {
      /* touch nothing */
    });
    expect(useStore.getState().canUndo()).toBe(false);
  });

  it("clears the redo stack after a new commit", () => {
    const s = useStore.getState();
    s.commit((d) => {
      d.name = "A";
    });
    useStore.getState().undo();
    useStore.getState().commit((d) => {
      d.name = "B";
    });
    expect(useStore.getState().canRedo()).toBe(false);
    expect(useStore.getState().project.name).toBe("B");
  });
});
