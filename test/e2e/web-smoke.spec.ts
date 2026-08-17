import { expect, test } from '@playwright/test';

const externalAuthProviderRequest =
  /(?:accounts\.google\.com|oauth2\.googleapis\.com|apis\.google\.com|\/auth\/v1\/authorize)/i;
const supabaseRequest = /supabase\.co|127\.0\.0\.1:54321|localhost:54321/i;
const localAppOrigin = 'http://127.0.0.1:4173';
const unexpectedExternalRequestsByPage = new WeakMap<object, string[]>();

const publicOverviewPages = [
  { path: '/features', nav: /features|funcionalidades/i, heading: /everything you need|tudo o que precisa/i },
  { path: '/how-it-works', nav: /how it works|como funciona/i, heading: /practical workflow|percurso pr[aá]tico/i },
  { path: '/news', nav: /news|not[ií]cias|novidades/i, heading: /product updates|novidades do produto/i },
  { path: '/about', nav: /about|sobre/i, heading: /shared finances easier|finan[cç]as partilhadas mais claras/i },
] as const;

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

test('web root renders the public homepage with navigation and authentication actions', async ({ page }, testInfo) => {
  const response = await page.goto('/');

  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#root')).toBeAttached();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  if (testInfo.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: /menu/i }).click();
  }
  await expect(page.getByRole('link', { name: /features|funcionalidades/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /news|not[ií]cias/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /sign in|entrar|iniciar sess[aã]o/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /get started|come[cç]ar/i }).first()).toBeVisible();
});

for (const publicPage of publicOverviewPages) {
  test(`${publicPage.path} renders a populated public overview after direct navigation`, async ({ page }) => {
    const response = await page.goto(publicPage.path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(`${publicPage.path.replaceAll('-', '\\-')}(?:[/?#]|$)`));
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: publicPage.heading }).first()).toBeVisible();
    await expect(page.getByRole('main').getByText(/./).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in|entrar|iniciar sess[aã]o|get started|come[cç]ar|open kintally|abrir kintally/i }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: publicPage.heading }).first()).toBeVisible();
  });
}

test('desktop public navigation opens every overview page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop header behaviour.');

  for (const publicPage of publicOverviewPages) {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: publicPage.nav }).click();
    await expect(page).toHaveURL(new RegExp(`${publicPage.path.replaceAll('-', '\\-')}(?:[/?#]|$)`));
    await expect(page.getByRole('heading', { name: publicPage.heading }).first()).toBeVisible();
  }
});

test('desktop language flag dropdown changes language and persists the selection', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop header behaviour.');
  await page.goto('/');

  const languageButton = page.getByRole('button', { name: /language|idioma/i });
  await expect(languageButton).toBeVisible();
  await languageButton.click();
  await page.getByRole('menuitem', { name: /English/i }).click();

  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  await expect(languageButton).toHaveAttribute('aria-expanded', 'false');
});

test('mobile homepage uses an accessible hamburger menu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile header behaviour.');
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: /menu/i });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  await expect(page.getByRole('link', { name: /features|funcionalidades/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /language|idioma/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
});

test('mobile hamburger navigation opens a dedicated public page and closes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile header behaviour.');
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: /menu/i });
  await menuButton.click();
  await page.getByRole('link', { name: /how it works|como funciona/i }).first().click();

  await expect(page).toHaveURL(/\/how-it-works(?:[/?#]|$)/);
  await expect(page.getByRole('heading', { name: /practical workflow|percurso pr[aá]tico/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /open navigation menu|abrir menu de navega[cç][aã]o/i })).toHaveAttribute('aria-expanded', 'false');
});

test('homepage sign-in action opens the existing login route', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: /menu/i }).click();
  }
  await page.getByRole('link', { name: /sign in|entrar|iniciar sess[aã]o/i }).first().click();

  await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
  await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);
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
    await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
    await expect(page.locator('body')).toContainText(/Google|login|sign in|sess/i);
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
