import { afterEach, describe, expect, it } from "@effect/vitest";
import { ProviderDriverKind, ProviderInstanceId } from "@t3tools/contracts";
import { act } from "react";

import { makeClientFixture } from "../testing/clientFixture.ts";
import { createTuiTestDriver, type TuiTestDriver } from "../testing/driver.tsx";
import { AppShell } from "./AppShell.tsx";

const drivers = new Set<TuiTestDriver>();
afterEach(async () => {
  await Promise.all([...drivers].map((driver) => driver.close()));
  drivers.clear();
});

async function setup() {
  const fixture = makeClientFixture();
  const driver = await createTuiTestDriver(<AppShell client={fixture.client} />, {
    width: 110,
    height: 36,
    kittyKeyboard: true,
  });
  drivers.add(driver);
  await driver.input.pressKey(",");
  return { driver, fixture };
}

/** Moves the cursor down until the named row is selected. */
async function select(driver: TuiTestDriver, label: string) {
  for (let step = 0; step < 40; step += 1) {
    if (driver.captureFrame().includes(`> ${label}`)) return;
    await driver.input.pressKey("ARROW_DOWN");
  }
  throw new Error(`No row named ${label}:\n${driver.captureFrame()}`);
}

async function open(driver: TuiTestDriver, ...labels: string[]) {
  for (const label of labels) {
    await select(driver, label);
    await driver.input.pressKey("RETURN");
  }
}

describe("settings", () => {
  it("opens from the sidebar and summarizes providers", async () => {
    const { driver } = await setup();
    const frame = driver.captureFrame();
    expect(frame).toContain("Settings");
    expect(frame).toContain("> Providers: 1 ready");
    await open(driver, "Providers");
    expect(driver.captureFrame()).toContain("Fixture Codex");
    expect(driver.captureFrame()).toContain("Ready");
    await driver.input.pressKey("ESCAPE");
    await driver.input.pressKey("ESCAPE");
    expect(driver.captureFrame()).not.toContain("Settings › ");
  });

  it("turns a built-in provider off as an explicit instance", async () => {
    const { driver, fixture } = await setup();
    await open(driver, "Providers", "Fixture Codex", "Enabled");
    const update = fixture.settingsUpdates.at(-1)!;
    expect(update.mutation).toMatchObject({
      operation: "upsert",
      instanceId: "codex",
      instance: { driver: "codex", enabled: false },
    });
    expect(driver.captureFrame()).toContain("Turned off.");
  });

  it("edits a driver config field and re-checks the provider", async () => {
    const { driver, fixture } = await setup();
    await open(driver, "Providers", "Fixture Codex", "Binary path");
    // The field starts on the current value, the schema default "codex".
    for (const _ of "codex") await driver.input.pressKey("BACKSPACE");
    await driver.input.typeText("/opt/codex/bin/codex");
    await driver.input.pressKey("RETURN");
    expect(fixture.settingsUpdates.at(-1)!.mutation).toMatchObject({
      instance: { config: { binaryPath: "/opt/codex/bin/codex" } },
    });
    await driver.input.pressKey("r");
    expect(fixture.providerCalls).toContain("refresh:codex");
  });

  it("masks an API key edit and keeps a stored secret reference unless replaced or cleared", async () => {
    const { driver, fixture } = await setup();
    const instanceId = ProviderInstanceId.make("antigravity");
    const reference = { provider: "onepassword", reference: "op://Private/item/field" };
    await act(async () => {
      driver.registry.set(fixture.providers, {
        providers: [
          {
            ...fixture.provider,
            instanceId,
            driver: ProviderDriverKind.make("antigravity"),
            displayName: "Fixture Gemini",
          },
        ],
        status: "live",
      });
      driver.registry.update(fixture.settings, (current) =>
        current
          ? {
              ...current,
              providerInstances: {
                [instanceId]: {
                  driver: ProviderDriverKind.make("antigravity"),
                  enabled: true,
                  config: { apiKey: reference },
                },
              },
            }
          : current,
      );
    });
    await driver.flush();
    await open(driver, "Providers", "Fixture Gemini");
    await select(driver, "API key");
    expect(driver.captureFrame()).toContain("secret from onepassword");
    const updates = fixture.settingsUpdates.length;
    await driver.input.pressKey("RETURN");
    await driver.input.pressKey("RETURN");
    const configs = () =>
      fixture.settingsUpdates
        .slice(updates)
        .map((update) =>
          update.mutation?.operation === "upsert" ? update.mutation.instance.config : undefined,
        );
    expect(
      configs().every((config) => config === undefined || "apiKey" in (config as object)),
    ).toBe(true);
    expect(driver.captureFrame()).toContain("secret from onepassword");
    await driver.input.pressKey("RETURN");
    await driver.input.typeText("sk-secret");
    expect(driver.captureFrame()).not.toContain("sk-secret");
    expect(driver.captureFrame()).toContain("•••••••••");
    await driver.input.pressKey("RETURN");
    expect(configs().at(-1)).toMatchObject({ apiKey: "sk-secret" });
    await driver.input.pressKey("x");
    expect(configs().at(-1)).not.toHaveProperty("apiKey");
  });

  it("signs in through the server with a device code", async () => {
    const { driver, fixture } = await setup();
    await act(async () => {
      driver.registry.set(fixture.providers, {
        providers: [
          {
            ...fixture.provider,
            auth: { status: "unauthenticated" },
            setup: { canAuthenticate: true, canInstall: false },
          },
        ],
        status: "live",
      });
    });
    await driver.flush();
    await open(driver, "Providers", "Fixture Codex");
    expect(driver.captureFrame()).toContain("Sign in needed");
    await open(driver, "Sign in", "Sign in to Fixture Codex");
    expect(fixture.providerCalls).toContain("auth:codex");
    const frame = driver.captureFrame();
    expect(frame).toContain("ABCD-1234");
    expect(frame).toContain("https://example.com/device");
    // Leaving a waiting flow cancels it on the server.
    await driver.input.pressKey("ESCAPE");
    expect(fixture.providerCalls).toContain("cancel:codex");
  });

  it("adds a second provider account", async () => {
    const { driver, fixture } = await setup();
    await open(driver, "Providers", "Add a provider account…");
    await open(driver, "Display name");
    await driver.input.typeText("Work Codex");
    await driver.input.pressKey("RETURN");
    await open(driver, "Add account");
    expect(fixture.settingsUpdates.at(-1)!.mutation).toEqual({
      operation: "create",
      instanceId: "codex-2",
      instance: {
        driver: "codex",
        enabled: true,
        displayName: "Work Codex",
        config: { setupMode: "existing" },
      },
    });
  });

  it("changes general settings", async () => {
    const { driver, fixture } = await setup();
    await open(driver, "General", "Default permissions");
    expect(fixture.settingsUpdates.at(-1)!.patch).toEqual({
      defaultRuntimeMode: "approval-required",
    });
    expect(driver.captureFrame()).toContain("Default permissions: Ask before changes");
    await open(driver, "Worktrees folder");
    await driver.input.typeText("~/worktrees");
    await driver.input.pressKey("RETURN");
    expect(fixture.settingsUpdates.at(-1)!.patch).toEqual({ worktreesDirectory: "~/worktrees" });
  });
});
