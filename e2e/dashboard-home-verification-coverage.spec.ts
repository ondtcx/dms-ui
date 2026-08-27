import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

const CONTRAST_THRESHOLD = 4.5;

type Fixture = {
  adminApi: APIRequestContext;
  userApi: APIRequestContext;
  userEmail: string;
  userPassword: string;
  userId?: string;
  documentId?: number;
  permissionId?: number;
};

async function expectApiSuccess(response: { ok(): boolean; status(): number; statusText(): string }, action: string) {
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`${action} failed: ${response.status()} ${response.statusText()}`);
  }
}

async function expectGone(api: APIRequestContext, path: string, resource: string): Promise<void> {
  const response = await api.get(path);
  if (response.status() !== 404) throw new Error(`${resource} remains after cleanup: ${response.status()}`);
}

async function createFixture(api: APIRequestContext): Promise<Fixture> {
  const admin = await getAccessToken(api, SEED_USERS.admin.email, SEED_USERS.admin.password);
  const adminApi = await createAuthenticatedApiContext(admin.token);
  const userEmail = `dashboard-verification-${Date.now()}@example.com`;
  const userPassword = 'Dashboard123!';
  const fixture: Fixture = { adminApi, userApi: adminApi, userEmail, userPassword };

  const registration = await adminApi.post(`${API_BASE_URL}/auth/register`, {
    data: { name: 'Dashboard Verification User', email: userEmail, password: userPassword },
  });
  if (!registration.ok()) throw new Error(`USER registration failed: ${registration.status()}`);
  fixture.userId = (await registration.json()).user.id;

  const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
    multipart: {
       file: { name: 'dashboard-verification.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nverification') },
      description: `Dashboard verification ${Date.now()}`,
      isPublic: 'false',
    },
  });
  if (!upload.ok()) throw new Error(`DRAFT upload failed: ${upload.status()}`);
  fixture.documentId = (await upload.json()).id;

  const grant = await adminApi.post(`${API_BASE_URL}/permissions/documents/${fixture.documentId}/grant`, {
    data: { userId: fixture.userId, canView: true },
  });
  if (!grant.ok()) throw new Error(`Permission grant failed: ${grant.status()}`);
  fixture.permissionId = (await grant.json()).id;

  const user = await getAccessToken(api, userEmail, userPassword);
  fixture.userApi = await createAuthenticatedApiContext(user.token);
  return fixture;
}

async function cleanupFixture(fixture: Fixture): Promise<void> {
  const failures: string[] = [];
  if (fixture.permissionId) {
    const response = await fixture.adminApi.delete(`${API_BASE_URL}/permissions/documents/permissions/${fixture.permissionId}`);
    try { await expectApiSuccess(response, 'Permission revoke'); } catch (error) { failures.push(String(error)); }
  }
  if (fixture.documentId) {
    const response = await fixture.adminApi.delete(`${API_BASE_URL}/documents/${fixture.documentId}/permanent`);
    try { await expectApiSuccess(response, 'Document cleanup'); } catch (error) { failures.push(String(error)); }
  }
  if (fixture.userId) {
    const response = await fixture.adminApi.delete(`${API_BASE_URL}/users/${fixture.userId}`);
    try { await expectApiSuccess(response, 'USER cleanup'); } catch (error) { failures.push(String(error)); }
  }
  if (fixture.documentId) {
    try { await expectGone(fixture.adminApi, `${API_BASE_URL}/documents/${fixture.documentId}`, 'Document'); } catch (error) { failures.push(String(error)); }
  }
  if (fixture.userId) {
    try { await expectGone(fixture.adminApi, `${API_BASE_URL}/users/${fixture.userId}`, 'USER'); } catch (error) { failures.push(String(error)); }
  }
  await fixture.userApi.dispose();
  if (fixture.adminApi !== fixture.userApi) await fixture.adminApi.dispose();
  if (failures.length) throw new Error(`Fixture cleanup failed:\n${failures.join('\n')}`);
}

async function tabTo(page: Page, locator: ReturnType<Page['getByRole']>): Promise<number> {
  for (let index = 1; index <= 40; index += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((element) => element === document.activeElement).catch(() => false)) return index;
  }
  throw new Error(`Keyboard focus did not reach ${await locator.getAttribute('aria-label')}`);
}

function contrastRatio(foreground: number[], background: number[]): number {
  const luminance = (rgb: number[]) => rgb.map((value) => value / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const light = luminance(foreground);
  const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

async function assertReadable(page: Page): Promise<void> {
   const ratios = await page.locator('main h1, main h2, main a[href="/dashboard/documents"], main button').evaluateAll((elements) => elements.map((element) => {
    const parse = (value: string): number[] => {
       const oklch = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+|none)(?:deg)?\s*\)/);
       if (oklch) {
         const [lightness, chroma, rawHue] = oklch.slice(1).map(Number);
         const hue = Number.isNaN(rawHue) ? 0 : rawHue;
        const angle = (hue * Math.PI) / 180;
        const a = chroma * Math.cos(angle);
        const b = chroma * Math.sin(angle);
        const lms = [lightness + 0.3963377774 * a + 0.2158037573 * b, lightness - 0.1055613458 * a - 0.0638541728 * b, lightness - 0.0894841775 * a - 1.291485548 * b].map((value) => value ** 3);
        const rgb = [4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2], -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2], -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2]];
        return rgb.map((channel) => 255 * (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055));
      }
       const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
       if (value.includes('%')) return channels.map((channel) => channel * 2.55);
       return Math.max(...channels) <= 1 ? channels.map((channel) => channel * 255) : channels;
    };
    const style = getComputedStyle(element);
    let parent: Element | null = element;
    let background = [255, 255, 255];
    while (parent) {
      const color = getComputedStyle(parent).backgroundColor;
      if (!color.includes('rgba(0, 0, 0, 0)') && !color.includes('transparent')) { background = parse(color); break; }
      parent = parent.parentElement;
    }
    return { label: element.textContent?.trim().slice(0, 40), foreground: parse(style.color), background };
  }));
  for (const pair of ratios) {
    expect(contrastRatio(pair.foreground, pair.background), `${pair.label}: ${pair.foreground} on ${pair.background}`).toBeGreaterThanOrEqual(CONTRAST_THRESHOLD);
  }
}

test.describe('Dashboard home verification coverage', () => {
  test('covers pending continuation branches and authorized keyboard order', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);

    for (const pendingHasMore of [true, false]) {
      await page.route('**/api/documents/dashboard-summary', async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        await route.fulfill({ response, json: { ...body, pendingHasMore } });
      });
      await page.goto('/dashboard/home');
      const pendingSection = page.getByRole('heading', { name: 'Pendientes de oficialización' }).locator('xpath=..');
      const continuation = pendingSection.getByRole('link', { name: /Ver todos/ });
      if (pendingHasMore) await expect(continuation).toHaveAttribute('href', '/dashboard/documents');
      else await expect(continuation).toHaveCount(0);
      await page.unroute('**/api/documents/dashboard-summary');
    }
  });

  test('covers constrained keyboard/theme branches and permission revocation', async ({ browser, page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
    await page.goto('/dashboard/home');
    const homeMain = page.locator('main.mx-auto');
    await expect(homeMain).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const cta = page.getByRole('button', { name: 'Nuevo documento' });
    const documents = page.getByRole('link', { name: /Documentos.*Ver y gestionar/ });
    const calendar = page.getByRole('link', { name: /Calendario.*Vista por fecha/ });
    const ctaTab = await tabTo(page, cta);
    const documentsTab = await tabTo(page, documents);
    const calendarTab = await tabTo(page, calendar);
    expect(documentsTab).toBeGreaterThan(ctaTab);
    expect(calendarTab).toBeGreaterThan(0);

    for (const theme of ['light', 'dark']) {
      await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
      await assertReadable(page);
    }
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    const fixture = await createFixture(request);
    const userPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await loginViaApi(userPage, fixture.userEmail, fixture.userPassword);
      await userPage.goto('/dashboard/home');
       const row = userPage.getByRole('link', { name: /dashboard-verification\.pdf/i });
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('href', `/dashboard/documents/${fixture.documentId}`);

      const revoke = await fixture.adminApi.delete(`${API_BASE_URL}/permissions/documents/permissions/${fixture.permissionId}`);
      expect(revoke.ok()).toBeTruthy();
      fixture.permissionId = undefined;
      await row.click();
      await expect(userPage.getByRole('heading', { name: 'Documento no encontrado' })).toBeVisible();
    } finally {
      await userPage.close();
      await cleanupFixture(fixture);
    }
  });
});
