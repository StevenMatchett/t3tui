import { afterEach, describe, expect, it } from "@effect/vitest";

import { createTuiTestDriver, type TuiTestDriver } from "../testing/driver.tsx";
import { CommandPalette, type CommandPaletteItem } from "./CommandPalette.tsx";

const drivers: TuiTestDriver[] = [];
afterEach(async () => {
  await Promise.all(drivers.splice(0).map((driver) => driver.close()));
});

async function renderPalette(
  items: readonly CommandPaletteItem[],
  options: {
    readonly placeholder?: string;
    readonly onSearchQueryChange?: (query: string) => void;
  },
) {
  const driver = await createTuiTestDriver(
    <CommandPalette
      items={items}
      height={10}
      active
      searching={false}
      searchFailed={false}
      searchedQuery=""
      searchDebounceMs={0}
      {...(options.placeholder ? { placeholder: options.placeholder } : {})}
      onSearchQueryChange={options.onSearchQueryChange ?? (() => undefined)}
      onChoose={() => undefined}
      onClose={() => undefined}
    />,
    { width: 80, height: 12 },
  );
  drivers.push(driver);
  return driver;
}

describe("command palette", () => {
  it("forwards one-character queries so callers can filter on them", async () => {
    const queries: string[] = [];
    const driver = await renderPalette([], { onSearchQueryChange: (query) => queries.push(query) });
    await driver.input.typeText("x");
    await driver.flush();
    expect(queries.at(-1)).toBe("x");
  });

  it("shows the caller's placeholder and counts an empty list as 0 of 0", async () => {
    const driver = await renderPalette([], { placeholder: "Filter projects" });
    const frame = driver.captureFrame();
    expect(frame).toContain("Filter projects");
    expect(frame).not.toContain("Search threads and projects");
    expect(frame).toContain("0 of 0");
    expect(frame).not.toContain("1 of 0");
  });
});
