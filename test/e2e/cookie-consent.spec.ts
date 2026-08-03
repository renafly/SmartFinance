import { expect, test } from "@playwright/test";

const storageKey = "sf_cookie_consent_v1";
const acceptAll = /accept all|aceitar tudo/i;
const rejectOptional = /reject optional|rejeitar opcionais/i;
const managePreferences = /manage preferences|gerir prefer/i;
const savePreferences = /save preferences|guardar prefer/i;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();
});

test("accept all persists the decision across reloads", async ({ page }) => {
  await page.getByRole("button", { name: acceptAll }).click();

  await expect(page.getByRole("button", { name: acceptAll })).toBeHidden();
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(JSON.parse(stored ?? "{}")).toMatchObject({
    version: 1,
    necessary: true,
    preferences: true,
    analytics: true,
  });

  await page.reload();
  await expect(page.getByRole("button", { name: acceptAll })).toBeHidden();
});

test("reject optional persists both optional categories as disabled", async ({
  page,
}) => {
  await page.getByRole("button", { name: rejectOptional }).click();

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(JSON.parse(stored ?? "{}")).toMatchObject({
    necessary: true,
    preferences: false,
    analytics: false,
  });
});

test("granular preferences can enable preferences without analytics", async ({
  page,
}) => {
  await page.getByRole("button", { name: managePreferences }).click();

  const preferences = page.getByRole("switch", {
    name: /^preferences$|^prefer/i,
  });
  const analytics = page.getByRole("switch", {
    name: /^analytics$|^an[aá]lise$/i,
  });
  await preferences.click();
  await expect(preferences).toBeChecked();
  await expect(analytics).not.toBeChecked();
  await page.getByRole("button", { name: savePreferences }).click();

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(JSON.parse(stored ?? "{}")).toMatchObject({
    necessary: true,
    preferences: true,
    analytics: false,
  });
});

test("a stale consent version returns the user to undecided", async ({
  page,
}) => {
  await page.evaluate(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 0,
          necessary: true,
          preferences: true,
          analytics: true,
          decidedAt: "2026-07-30T10:00:00.000Z",
        }),
      ),
    { key: storageKey },
  );

  await page.reload();

  await expect(page.getByRole("button", { name: acceptAll })).toBeVisible();
});
