import { describe, expect, it } from "@effect/vitest";

import { agentFixture } from "../testing/agentFixture.ts";
import { orderSwarmAgents } from "./AgentSwarm.tsx";

describe("orderSwarmAgents", () => {
  it("lists running agents before idle ones and finished ones last, keeping arrival order", () => {
    const agent = (id: string, status: ReturnType<typeof agentFixture>["status"]) => ({
      ...agentFixture(id),
      status,
    });
    const ordered = orderSwarmAgents([
      agent("done", "completed"),
      agent("first", "running"),
      agent("idle", "idle"),
      agent("failed", "failed"),
      agent("second", "waiting"),
      agent("third", "pending"),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual([
      "first",
      "second",
      "third",
      "idle",
      "done",
      "failed",
    ]);
  });
});
