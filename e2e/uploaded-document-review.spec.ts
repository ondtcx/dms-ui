import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

async function uploadDocument(
  api: APIRequestContext,
  description: string,
): Promise<{ id: number; name: string }> {
  const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `review-${marker}.pdf`;
  const response = await api.post(`${API_BASE_URL}/documents/upload`, {
    multipart: {
      file: {
        name,
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\nrevisión manual e2e'),
      },
      description,
      isPublic: 'false',
    },
  });
  expect(response.ok(), `upload failed: ${response.status()}`).toBeTruthy();
  return { id: (await response.json()).id, name };
}

async function reviewerIdByEmail(
  api: APIRequestContext,
  email: string,
): Promise<string> {
  const response = await api.get(`${API_BASE_URL}/authoring/users`);
  expect(response.ok()).toBeTruthy();
  const users = (await response.json()) as Array<{
    id: string;
    email?: string | null;
  }>;
  const reviewer = users.find((user) => user.email === email);
  expect(reviewer, `reviewer ${email} not found`).toBeDefined();
  return reviewer!.id;
}

test.describe('Revisión manual de documentos subidos', () => {
  test.setTimeout(180_000);

  test('usa la bandeja compartida, devuelve, reenvía y aprueba', async ({
    page,
    request,
  }) => {
    const admin = await getAccessToken(
      request,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);
    const marker = `shared-${Date.now()}`;
    const document = await uploadDocument(
      adminApi,
      `Documento de revisión compartida ${marker}`,
    );

    try {
      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/documents/${document.id}`);

      await expect(page.getByText('Revisión del documento')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText('Borrador').first()).toBeVisible();
      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/dashboard/elaboracion/pendientes');
      await expect(
        page.getByText('Documentos subidos en revisión'),
      ).toBeVisible();
      const pendingRow = page
        .getByText(document.name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "sm:justify-between")][1]');
      await expect(pendingRow).toBeVisible({ timeout: 20_000 });
      await pendingRow.getByRole('link', { name: 'Revisar' }).click();
      await page.waitForURL(new RegExp(`/dashboard/documents/${document.id}$`));

      await page
        .getByPlaceholder(/Observación de devolución/)
        .fill('Falta la firma de la secretaría');
      await page.getByRole('button', { name: 'Devolver' }).click();
      await expect(page.getByText('Cambios solicitados').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText('Falta la firma de la secretaría', { exact: true }).first(),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });
      await page
        .getByPlaceholder(/Observación de devolución/)
        .fill('Aprobado tras corregir');
      await page.getByRole('button', { name: 'Aprobar' }).click();
      await expect(page.getByText('Aprobado').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText('Aprobado tras corregir', { exact: true }).first(),
      ).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('asigna revisor, le da acceso y le notifica la aprobación al autor', async ({
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
    const marker = `reviewer-${Date.now()}`;
    const document = await uploadDocument(
      adminApi,
      `Documento con revisor asignado ${marker}`,
    );
    const teacherId = await reviewerIdByEmail(
      adminApi,
      SEED_USERS.profesor.email,
    );

    try {
      const teacherReviewBefore = await teacherApi.get(
        `${API_BASE_URL}/document-reviews/${document.id}`,
      );
      const teacherDocumentBefore = await teacherApi.get(
        `${API_BASE_URL}/documents/${document.id}`,
      );
      const teacherPendingBefore = await teacherApi.get(
        `${API_BASE_URL}/document-reviews/pending`,
      );
      expect(teacherReviewBefore.status()).toBe(404);
      expect(teacherDocumentBefore.status()).toBe(404);
      expect(
        ((await teacherPendingBefore.json()) as Array<{ documentId: number }>).some(
          (review) => review.documentId === document.id,
        ),
      ).toBeFalsy();

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/documents/${document.id}`);
      await expect(page.getByText('Revisión del documento')).toBeVisible({
        timeout: 20_000,
      });
      const reviewerSelect = page.locator('#document-review-reviewer');
      await expect(reviewerSelect).toBeVisible();
      await reviewerSelect.selectOption(teacherId);
      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });

      expect(
        (
          await teacherApi.get(
            `${API_BASE_URL}/document-reviews/${document.id}`,
          )
        ).status(),
      ).toBe(200);
      expect(
        (
          await teacherApi.get(`${API_BASE_URL}/documents/${document.id}`)
        ).status(),
      ).toBe(200);

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto('/dashboard/elaboracion/pendientes');
      const pendingRow = page
        .getByText(document.name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "sm:justify-between")][1]');
      await expect(pendingRow).toBeVisible({ timeout: 20_000 });
      await pendingRow.getByRole('link', { name: 'Revisar' }).click();
      await page.waitForURL(new RegExp(`/dashboard/documents/${document.id}$`));
      await expect(page.getByText('Revisión del documento')).toBeVisible({
        timeout: 20_000,
      });
      await page
        .getByPlaceholder(/Observación de devolución/)
        .fill('Aprobado por el revisor');
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
    } finally {
      await adminApi.dispose();
      await teacherApi.dispose();
    }
  });
});
