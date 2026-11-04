import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

async function uploadForReview(
  api: APIRequestContext,
  reviewerId: string,
  marker: string,
): Promise<number> {
  const name = `notification-${marker}.pdf`;
  const upload = await api.post(`${API_BASE_URL}/documents/upload`, {
    multipart: {
      file: {
        name,
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\nnotificación e2e'),
      },
      description: `Notificación E2E ${marker}`,
      isPublic: 'false',
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const id = (await upload.json()).id as number;
  const submit = await api.post(
    `${API_BASE_URL}/document-reviews/${id}/submit`,
    { data: { reviewerId } },
  );
  expect(submit.ok(), await submit.text()).toBeTruthy();
  return id;
}

test.describe('Notificaciones de revisión', () => {
  test.setTimeout(120_000);

  test('respeta la preferencia in-app, abre el enlace y marca todo como leído', async ({
    page,
    request,
  }) => {
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
    const teacherApi = await createAuthenticatedApiContext(teacher.token);
    const users = await adminApi.get(`${API_BASE_URL}/authoring/users`);
    const teacherUser = (await users.json()).find(
      (user: { email?: string | null }) =>
        user.email === SEED_USERS.profesor.email,
    );
    expect(teacherUser).toBeDefined();

    try {
      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto('/dashboard/mi-cuenta');
      const inApp = page.getByRole('switch', {
        name: /Avisos en la aplicación/,
      });
      await expect(inApp).toHaveAttribute('aria-checked', 'true');
      await inApp.click();
      await expect(inApp).toHaveAttribute('aria-checked', 'false');
      await page.getByRole('button', { name: 'Guardar preferencias' }).click();
      await expect(
        page.getByText('Preferencias de notificaciones actualizadas'),
      ).toBeVisible({ timeout: 20_000 });

      await uploadForReview(
        adminApi,
        teacherUser.id,
        `off-${Date.now()}`,
      );
      expect(
        (await (
          await teacherApi.get(`${API_BASE_URL}/notifications`)
        ).json()).data,
      ).toHaveLength(0);

      await page.reload();
      await page
        .getByRole('switch', { name: /Avisos en la aplicación/ })
        .click();
      await page.getByRole('button', { name: 'Guardar preferencias' }).click();
      await expect(
        page.getByText('Preferencias de notificaciones actualizadas'),
      ).toBeVisible({ timeout: 20_000 });

      const documentId = await uploadForReview(
        adminApi,
        teacherUser.id,
        `on-${Date.now()}`,
      );

      await page.goto('/dashboard');
      await page
        .getByRole('button', { name: /Notificaciones/ })
        .first()
        .click();
      await expect(
        page.getByText('Documento pendiente de revisión', { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await page.getByRole('link', { name: 'Abrir recurso' }).first().click();
      await page.waitForURL(new RegExp(`/dashboard/documents/${documentId}$`));
      await page
        .getByPlaceholder(/Observación de devolución/)
        .fill('Aprobado desde notificaciones E2E');
      await page.getByRole('button', { name: 'Aprobar' }).click();
      await expect(page.getByText('Aprobado').first()).toBeVisible({
        timeout: 20_000,
      });

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard');
      await page
        .getByRole('button', { name: /Notificaciones/ })
        .first()
        .click();
      await expect(
        page.getByText('Documento aprobado', { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await page
        .getByRole('button', { name: 'Marcar todas como leídas' })
        .click();
      await expect(
        page.getByRole('button', { name: /Notificaciones, 0 sin leer/ }),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await adminApi.dispose();
      await teacherApi.dispose();
    }
  });
});
