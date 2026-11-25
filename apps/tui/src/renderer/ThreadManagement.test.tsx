import { describe, expect, it, vi } from "vite-plus/test";
import { MouseButtons } from "@opentui/core/testing";
import { makeClientFixture } from "../testing/clientFixture.ts";
import { createTuiTestDriver } from "../testing/driver.tsx";
import { ThreadActionsForm } from "./ThreadManagement.tsx";

describe("ThreadActionsForm", () => {
  it("cancels the worktree prompt when the title is clicked", async () => {
    const fixture = makeClientFixture();
    const onRemoved = vi.fn();
    const driver = await createTuiTestDriver(
      <ThreadActionsForm
        client={fixture.client}
        thread={fixture.threads[0]!}
        active
        initialAction="delete"
        orphanedWorktree={{ cwd: "/workspace/alpha", path: "/workspace/alpha-wt" }}
        onClose={() => undefined}
        onRemoved={onRemoved}
      />,
      { width: 80, height: 12 },
    );
    try {
      await driver.input.pressKey("RETURN");
      expect(driver.captureFrame()).toContain("Keep worktree");

      const title = driver.renderer.root.findDescendantById("thread-action-title")!;
      await driver.mouse.click(title.screenX + 1, title.screenY, MouseButtons.LEFT, {
        delayMs: 0,
      });
      expect(driver.captureFrame()).not.toContain("Keep worktree");

      await driver.input.pressKey("RETURN");
      expect(fixture.managementCommands.some((command) => command.type === "thread.delete")).toBe(
        false,
      );
      expect(onRemoved).not.toHaveBeenCalled();
    } finally {
      await driver.close();
    }
  });
});
