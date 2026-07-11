import { expect, test } from '@playwright/test';

const externalAuthProviderRequest =
  /(?:accounts\.google\.com|oauth2\.googleapis\.com|apis\.google\.com|\/auth\/v1\/authorize)/i;
const supabaseRequest = /supabase\.co|127\.0\.0\.1:54321|localhost:54321/i;
const localAppOrigin = 'http://127.0.0.1:4173';
const unexpectedExternalRequestsByPage = new WeakMap<object, string[]>();

test.beforeEach(async ({ page }) => {
  const unexpectedExternalRequests: string[] = [];
  unexpectedExternalRequestsByPage.set(page, unexpectedExternalRequests);

  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);

    if (url.origin === localAppOrigin) {
      await route.continue();
      return;
    }

    if (externalAuthProviderRequest.test(requestUrl)) {
      await route.fulfill({
        status: 204,
        contentType: 'text/plain',
        body: '',
      });
      return;
    }

    if (supabaseRequest.test(requestUrl)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    unexpectedExternalRequests.push(requestUrl);
    await route.fulfill({
      status: 599,
      contentType: 'text/plain',
      body: 'Unexpected external request blocked by security smoke test.',
    });
  });
});

test.afterEach(async ({ page }) => {
  expect(unexpectedExternalRequestsByPage.get(page) ?? []).toEqual([]);
});

test('public login route renders without a 404', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#root')).toBeAttached();
});

test('invite deep link route survives refresh', async ({ page }) => {
  const response = await page.goto('/invite/fake-token');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#root')).toBeAttached();
  await page.reload();
  await expect(page.locator('#root')).toBeAttached();
});

test('protected deep links redirect to login instead of 404 after refresh', async ({ page }) => {
  for (const route of ['/settings', '/accounts', '/transactions', '/budget']) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator('#root')).toBeAttached();
    await page.reload();
    await expect(page.locator('#root')).toBeAttached();
  }

  await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);
  await expect(page.locator('body')).not.toContainText(/Logout|Terminar sessao/i);
});

test('signed-out session remains signed out across protected refreshes', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);

  await page.reload();
  await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);
  await expect(page.locator('body')).not.toContainText(/Dashboard|Total wealth|Patrimonio total/i);
});
