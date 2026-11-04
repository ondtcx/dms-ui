import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe('Búsqueda documental', () => {
  test.setTimeout(120_000);

  test('respeta permisos y aplica filtros de tipo', async ({ page, request }) => {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const query = `search-${marker}`;
    const fileName = `${query}.pdf`;
    const admin = await getAccessToken(
      request,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    const teacher = await getAccessToken(
      request,
      SEED_USERS.profesor.email,
      SEED_USERS.profesor.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);

    try {
      const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\nbúsqueda e2e'),
          },
          description: `Documento de búsqueda ${marker}`,
          isPublic: 'false',
        },
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
      const documentId = (await upload.json()).id as number;

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/search?q=${encodeURIComponent(query)}`);
      await expect(
        page.getByRole('heading', { name: new RegExp(`Resultados para.*${query}`) }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(fileName, { exact: true })).toBeVisible({
        timeout: 20_000,
      });

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto(`/dashboard/search?q=${encodeURIComponent(query)}`);
      await expect(page.getByText(/0 documento/)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(fileName, { exact: true })).toHaveCount(0);

      const users = await adminApi.get(`${API_BASE_URL}/authoring/users`);
      const teacherUser = (await users.json()).find(
        (user: { email?: string | null }) =>
          user.email === SEED_USERS.profesor.email,
      );
      expect(teacherUser).toBeDefined();
      const share = await adminApi.post(
        `${API_BASE_URL}/permissions/documents/${documentId}/sharing`,
        { data: { userId: teacherUser.id } },
      );
      expect(share.ok(), await share.text()).toBeTruthy();

      await page.goto(`/dashboard/search?q=${encodeURIComponent(query)}`);
      await expect(page.getByText(fileName, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await page.goto(
        `/dashboard/search?q=${encodeURIComponent(query)}&mimetypes=application/pdf`,
      );
      await expect(page.getByText(fileName, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await page.goto(
        `/dashboard/search?q=${encodeURIComponent(query)}&mimetypes=image/png`,
      );
      await expect(page.getByText(/0 documento/)).toBeVisible({
        timeout: 20_000,
      });

      const directoryName = `searchdir-${marker}`;
      const directoryResponse = await adminApi.post(
        `${API_BASE_URL}/directories`,
        { data: { name: directoryName } },
      );
      expect(directoryResponse.ok(), await directoryResponse.text()).toBeTruthy();

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(
        `/dashboard/search?q=${encodeURIComponent(directoryName)}`,
      );
      await expect(page.getByText('Carpetas', { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole('link', { name: directoryName, exact: true }),
      ).toBeVisible({ timeout: 20_000 });

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto(
        `/dashboard/search?q=${encodeURIComponent(directoryName)}`,
      );
      await expect(page.getByText(/0 documento/)).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole('link', { name: directoryName, exact: true }),
      ).toHaveCount(0);

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard/search');
      await expect(page.getByText('Búsquedas recientes')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(query, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await adminApi.dispose();
    }
  });
});
