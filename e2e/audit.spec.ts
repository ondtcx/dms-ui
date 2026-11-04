import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe('Auditoría documental y de plantillas', () => {
  test.setTimeout(120_000);

  test('registra eventos del documento, niega al compartido y exporta actividad CSV', async ({
    page,
    request,
  }) => {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `audit-${marker}.pdf`;
    const admin = await getAccessToken(
      request,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);

    try {
      const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\nauditoría e2e'),
          },
          description: `Auditoría E2E ${marker}`,
          isPublic: 'false',
        },
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
      const documentId = (await upload.json()).id as number;

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

      const downloaded = await adminApi.get(
        `${API_BASE_URL}/documents/${documentId}/download`,
      );
      expect(downloaded.ok(), await downloaded.text()).toBeTruthy();

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/documents/${documentId}/audit`);
      await expect(
        page.getByRole('heading', { name: 'Registro de actividad' }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Creación', { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText('Compartición', { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByText('Descarga', { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto(`/dashboard/documents/${documentId}/audit`);
      await expect(
        page.getByText(
          'No tiene autorización para consultar la auditoría de este documento.',
        ),
      ).toBeVisible({ timeout: 20_000 });

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard/elaboracion/plantillas/61');
      await expect(
        page.getByText('Actividad de la plantilla'),
      ).toBeVisible({ timeout: 20_000 });
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'CSV' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^actividad-.*\.csv$/);
    } finally {
      await adminApi.dispose();
    }
  });
});
