import { describe, expect, it, vi } from "vite-plus/test";
import { act, useState } from "react";
import { createTuiTestDriver } from "../testing/driver.tsx";
import { NavigationContextMenu } from "./ThreadContextMenu.tsx";

type Entry = { readonly action: string; readonly label: string; readonly disabled?: boolean };

describe("NavigationContextMenu", () => {
  it("keeps the selection on a remaining item when the actions shrink", async () => {
    const onChoose = vi.fn();
    let setActions: (actions: readonly Entry[]) => void = () => undefined;
    function Harness() {
      const [actions, set] = useState<readonly Entry[]>([
        { action: "pin", label: "Pin" },
        { action: "settle", label: "Settle" },
        { action: "delete", label: "Delete" },
      ]);
      setActions = set;
      return (
        <NavigationContextMenu
          id="menu"
          x={0}
          y={0}
          width={40}
          height={10}
          actions={actions}
          onChoose={onChoose}
          onClose={() => undefined}
        />
      );
    }
    const driver = await createTuiTestDriver(<Harness />, { width: 40, height: 10 });
    try {
      await driver.input.pressKey("ARROW_DOWN");
      await driver.input.pressKey("ARROW_DOWN");
      await act(async () => setActions([{ action: "pin", label: "Pin" }]));
      await driver.input.pressKey("RETURN");
      expect(onChoose).toHaveBeenCalledWith("pin");
    } finally {
      await driver.close();
    }
  });

  it("does not label disabled items as running", async () => {
    const driver = await createTuiTestDriver(
      <NavigationContextMenu
        id="menu"
        x={0}
        y={0}
        width={40}
        height={10}
        actions={[{ action: "settle", label: "Settle (3)", disabled: true }]}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
      { width: 40, height: 10 },
    );
    try {
      const frame = driver.captureFrame();
      expect(frame).toContain("Settle (3)");
      expect(frame).not.toContain("(running)");
    } finally {
      await driver.close();
    }
  });
});
