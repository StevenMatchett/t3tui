import { describe, expect, it, vi } from "@effect/vitest";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import { AtomRegistry } from "effect/reactivity";

import { resolveShelfStatus } from "../../app/threadShelves.ts";
import type { TuiThreadShell } from "../../connection/models.ts";
import {
  makeThreadManagementActions,
  threadVisitAt,
  type ThreadManagementCommand,
} from "./management.ts";

describe("thread management actions", () => {
  it("dispatches shared rename/archive/unarchive/delete commands and refreshes archived state", async () => {
    const commands: ThreadManagementCommand[] = [];
    const refreshArchived = vi.fn();
    const actions = makeThreadManagementActions({
      dispatch: async (_registry, command) => {
        commands.push(command);
        return true;
      },
      refreshArchived,
    });
    const registry = AtomRegistry.make();
    const threadId = ThreadId.make("thread-1");
    try {
      expect(await actions.rename(registry, threadId, "  Better title  ")).toBe(true);
      expect(await actions.archive(registry, threadId)).toBe(true);
      expect(await actions.unarchive(registry, threadId)).toBe(true);
      expect(await actions.delete(registry, threadId)).toBe(true);
      expect(commands.map((command) => command.type)).toEqual([
        "thread.meta.update",
        "thread.archive",
        "thread.unarchive",
        "thread.delete",
      ]);
      expect(commands[0]).toMatchObject({ threadId, title: "Better title" });
      expect(refreshArchived).toHaveBeenCalledTimes(4);
    } finally {
      registry.dispose();
    }
  });

  it("rejects an empty title without dispatching", async () => {
    const dispatch = vi.fn(async () => true);
    const actions = makeThreadManagementActions({ dispatch, refreshArchived: () => {} });
    const registry = AtomRegistry.make();
    try {
      expect(await actions.rename(registry, ThreadId.make("thread-1"), "   ")).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      registry.dispose();
    }
  });

  it("visits at the wake time when a timed wake is newer than the thread's last update", () => {
    const now = "2026-11-04T12:00:00.000Z";
    const ago = (minutes: number) => new Date(Date.parse(now) - minutes * 60_000).toISOString();
    const fields: Partial<TuiThreadShell> = {
      id: ThreadId.make("thread-1"),
      projectId: ProjectId.make("project-1"),
      title: "Snoozed",
      createdAt: ago(120),
      updatedAt: ago(60),
      latestUserMessageAt: null,
      latestTurn: null,
      session: null,
      settledOverride: null,
      settledAt: null,
      pinnedAt: null,
      pullRequests: [],
      hasPendingApprovals: false,
      hasPendingUserInput: false,
      hasActionableProposedPlan: false,
      interactionMode: "default",
      snoozedAt: ago(60),
      snoozedUntil: ago(1),
      lastVisitedAt: ago(30),
    };
    const thread = fields as TuiThreadShell;
    expect(resolveShelfStatus(thread, now, true)).toBe("woke");

    const visitedAt = threadVisitAt(thread, now);
    expect(visitedAt).toBe(ago(1));
    expect(resolveShelfStatus({ ...thread, lastVisitedAt: visitedAt }, now, true)).not.toBe("woke");
    expect(threadVisitAt({ ...thread, updatedAt: ago(0) }, now)).toBe(ago(0));
    expect(threadVisitAt({ ...thread, snoozedUntil: null, snoozedAt: null }, now)).toBe(ago(60));
  });
});
