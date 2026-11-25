import { describe, expect, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";

import {
  effectiveInstanceConfig,
  GENERAL_SETTINGS,
  nextGeneralValue,
  parseInstanceId,
  providerConfigFields,
  providerInstanceUpdate,
  providerStatus,
  suggestInstanceId,
  configSecretProvider,
  withConfigFieldValue,
  withoutConfigField,
} from "./settingsModel.ts";

const codex = ProviderDriverKind.make("codex");
const provider: ServerProvider = {
  instanceId: ProviderInstanceId.make("codex"),
  driver: codex,
  enabled: true,
  installed: true,
  version: "1.0.0",
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: "2026-01-01T00:00:00.000Z",
  models: [],
  slashCommands: [],
  skills: [],
};

describe("providerStatus", () => {
  it("reports the first thing a provider needs", () => {
    expect(providerStatus(provider).label).toBe("Ready");
    expect(providerStatus({ ...provider, enabled: false }).label).toBe("Off");
    expect(providerStatus({ ...provider, installed: false }).label).toBe("Not installed");
    expect(providerStatus({ ...provider, auth: { status: "unauthenticated" } }).label).toBe(
      "Sign in needed",
    );
  });
});

describe("provider config fields", () => {
  it("follows the contract schema's order and hides internal fields", () => {
    const keys = providerConfigFields(codex).map((field) => field.key);
    expect(keys.slice(0, 2)).toEqual(["binaryPath", "homePath"]);
    expect(keys).not.toContain("enabled");
    expect(keys).not.toContain("customModels");
  });

  it("drops an emptied field the schema omits when empty", () => {
    const binaryPath = providerConfigFields(codex).find((field) => field.key === "binaryPath")!;
    expect(withConfigFieldValue({ binaryPath: "/x", homePath: "~" }, binaryPath, " ")).toEqual({
      homePath: "~",
    });
    expect(withConfigFieldValue({}, binaryPath, " /y ")).toEqual({ binaryPath: "/y" });
  });

  it("keeps a stored secret when its masked edit is confirmed blank, and clears it explicitly", () => {
    const apiKey = providerConfigFields(ProviderDriverKind.make("antigravity")).find(
      (field) => field.key === "apiKey",
    )!;
    const reference = { provider: "onepassword", reference: "op://Private/item/field" };
    expect(apiKey.control).toBe("password");
    expect(withConfigFieldValue({ apiKey: "sk-1" }, apiKey, "")).toEqual({ apiKey: "sk-1" });
    expect(withConfigFieldValue({ apiKey: reference }, apiKey, " ")).toEqual({ apiKey: reference });
    expect(withConfigFieldValue({ apiKey: reference }, apiKey, "sk-2")).toEqual({ apiKey: "sk-2" });
    expect(withoutConfigField({ apiKey: "sk-1", gcpProject: "p" }, apiKey)).toEqual({
      gcpProject: "p",
    });
    expect(configSecretProvider({ apiKey: reference }, apiKey)).toBe("onepassword");
    expect(configSecretProvider({ apiKey: "sk-1" }, apiKey)).toBeNull();
  });
});

describe("provider instances", () => {
  it("treats a never-edited provider as a bare instance of its driver", () => {
    expect(effectiveInstanceConfig(DEFAULT_SERVER_SETTINGS, provider)).toEqual({
      driver: "codex",
      enabled: true,
    });
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      providerInstances: { codex: { driver: codex, enabled: false, config: { binaryPath: "/x" } } },
    };
    expect(effectiveInstanceConfig(settings, provider)).toMatchObject({
      config: { binaryPath: "/x" },
    });
  });

  it("saves an instance as an atomic upsert", () => {
    const instance = { driver: codex, enabled: false };
    expect(providerInstanceUpdate(provider, instance)).toEqual({
      patch: {},
      mutation: { operation: "upsert", instanceId: "codex", instance },
    });
  });

  it("suggests and validates new instance ids", () => {
    expect(suggestInstanceId(codex, ["codex", "codex-2"])).toBe("codex-3");
    expect(parseInstanceId("codex-2", ["codex-2"])).toHaveProperty("error");
    expect(parseInstanceId("Work Codex", [])).toHaveProperty("error");
    expect(parseInstanceId(" work-codex ", [])).toEqual({ id: "work-codex" });
  });
});

describe("general settings", () => {
  it("flips toggles, cycles choices, and edits text", () => {
    const byKey = (key: string) => GENERAL_SETTINGS.find((setting) => setting.key === key)!;
    expect(nextGeneralValue(byKey("defaultAutoPull"), false)).toBe(true);
    expect(nextGeneralValue(byKey("responseStreamingMode"), "paragraph")).toBe("turn");
    expect(nextGeneralValue(byKey("worktreesDirectory"), "")).toBeNull();
    expect(byKey("defaultThreadEnvMode").patch("")).toEqual({ defaultThreadEnvMode: null });
  });
});
