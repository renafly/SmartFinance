import { expect, test } from '@playwright/test';

const externalAuthProviderRequest =
  /(?:accounts\.google\.com|oauth2\.googleapis\.com|apis\.google\.com|\/auth\/v1\/authorize)/i;
const supabaseRequest = /supabase\.co|127\.0\.0\.1:54321|localhost:54321/i;

test.beforeEach(async ({ page }) => {
  await page.route(externalAuthProviderRequest, async (route) => {
    await route.fulfill({
      status: 204,
      contentType: 'text/plain',
      body: '',
    });
  });

  await page.route(supabaseRequest, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
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

test('protected deep link redirects to login instead of 404', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);
});
