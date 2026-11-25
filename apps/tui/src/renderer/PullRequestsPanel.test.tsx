import { afterEach, describe, expect, it } from "@effect/vitest";
import { act } from "react";

import { makeClientFixture } from "../testing/clientFixture.ts";
import { createTuiTestDriver, type TuiTestDriver } from "../testing/driver.tsx";
import { AppShell } from "./AppShell.tsx";

const drivers: TuiTestDriver[] = [];
afterEach(async () => {
  await Promise.all(drivers.splice(0).map((driver) => driver.close()));
});

const tick = async (driver: TuiTestDriver, run: () => Promise<unknown>) => {
  await act(async () => {
    await run();
  });
  await driver.flush();
};

async function openPullRequest() {
  const fixture = makeClientFixture();
  const driver = await createTuiTestDriver(<AppShell client={fixture.client} />, {
    width: 120,
    height: 40,
    kittyKeyboard: true,
  });
  drivers.push(driver);
  await driver.input.pressKey("RETURN");
  await driver.input.pressKey("RETURN");
  await tick(driver, () => driver.input.pressKey("k", { ctrl: true }));
  await driver.input.typeText("pull requests list");
  await tick(driver, () => driver.input.pressKey("RETURN"));
  await tick(driver, () => driver.input.pressKey("RETURN"));
  return { driver, fixture };
}

describe("pull request review", () => {
  it("requests changes with only line notes and no message", async () => {
    const { driver, fixture } = await openPullRequest();
    await tick(driver, () => driver.input.pressKey("TAB"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    for (let index = 0; index < 5; index += 1)
      await tick(driver, () => driver.input.pressKey("ARROW_DOWN"));
    await tick(driver, () => driver.input.pressKey("n"));
    await driver.input.typeText("Why two?");
    await driver.flush();
    await tick(driver, () => driver.input.pressKey("RETURN"));

    await tick(driver, () => driver.input.pressKey("r"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    expect(driver.captureFrame()).toContain("Request changes");
    await tick(driver, () => driver.input.pressKey("RETURN"));
    expect(driver.captureFrame()).not.toContain("needs a message");
    expect(fixture.pullRequestReviews).toMatchObject([
      { number: 42, verdict: "request-changes", body: "", comments: [{ body: "Why two?" }] },
    ]);
  });

  it("starts the code cursor at the top each time the code view opens", async () => {
    const { driver } = await openPullRequest();
    await tick(driver, () => driver.input.pressKey("TAB"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    for (let index = 0; index < 5; index += 1)
      await tick(driver, () => driver.input.pressKey("ARROW_DOWN"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    await tick(driver, () => driver.input.pressKey("TAB"));
    // The file header takes no note, so N only opens a comment if the cursor kept its old line.
    await tick(driver, () => driver.input.pressKey("n"));
    expect(driver.captureFrame()).not.toContain("Comment on this line");
  });
});
