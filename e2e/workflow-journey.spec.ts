import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe('Workflow configurable deshabilitado', () => {
  test.setTimeout(120_000);

  test('oculta la administración, muestra el aviso y rechaza inicios', async ({
    page,
    request,
  }) => {
    const admin = await getAccessToken(
      request,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: `workflow-disabled-${marker}.pdf`,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\nworkflow disabled e2e'),
          },
          description: `Documento workflow deshabilitado ${marker}`,
          isPublic: 'false',
        },
      });
      expect(upload.ok(), `upload failed: ${upload.status()}`).toBeTruthy();
      const documentId = (await upload.json()).id as number;

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard/settings');
      await expect(
        page.getByRole('heading', { name: 'Configuración' }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole('link', { name: /Flujos de trabajo/ }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Flujos de trabajo', { exact: true }),
      ).toHaveCount(0);

      await page.goto('/dashboard/workflows');
      await expect(
        page.getByText('Flujos de trabajo deshabilitados', { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByText(/El workflow configurable está deshabilitado/),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Flujos de trabajo', exact: true }),
      ).toHaveCount(0);

      const start = await adminApi.post(
        `${API_BASE_URL}/documents/${documentId}/workflows`,
        { data: {} },
      );
      expect(start.status()).toBe(403);
      expect(await start.json()).toMatchObject({
        message: 'El workflow configurable está deshabilitado',
      });

      const definitions = await adminApi.get(
        `${API_BASE_URL}/workflow-definitions`,
      );
      expect(definitions.status()).toBe(200);
      const history = await adminApi.get(
        `${API_BASE_URL}/documents/${documentId}/workflows`,
      );
      expect(history.status()).toBe(200);
    } finally {
      await adminApi.dispose();
    }
  });
});
