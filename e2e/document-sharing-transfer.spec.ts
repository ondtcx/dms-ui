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
  prefix: string,
): Promise<{ id: number; name: string }> {
  const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `${prefix}-${marker}.pdf`;
  const response = await api.post(`${API_BASE_URL}/documents/upload`, {
    multipart: {
      file: {
        name,
        mimeType: 'application/pdf',
        buffer: Buffer.from(`%PDF-1.4\n${prefix} e2e`),
      },
      description: `${prefix} ${marker}`,
      isPublic: 'false',
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return { id: (await response.json()).id, name };
}

async function userNameByEmail(
  api: APIRequestContext,
  email: string,
): Promise<string> {
  const response = await api.get(`${API_BASE_URL}/users/for-selection`);
  expect(response.ok()).toBeTruthy();
  const users = (await response.json()) as Array<{
    id: string;
    name?: string | null;
    email: string;
  }>;
  const user = users.find((entry) => entry.email === email);
  expect(user, `${email} not found`).toBeDefined();
  return user!.name?.trim() || user!.email;
}

test.describe('Compartir y transferir documentos', () => {
  test.setTimeout(120_000);

  test('comparte un documento, lo revoca y corta el acceso', async ({
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
    const document = await uploadDocument(adminApi, 'sharing');

    try {
      expect(
        (await teacherApi.get(`${API_BASE_URL}/documents/${document.id}`)).status(),
      ).toBe(404);

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/documents/${document.id}`);
      await page.getByRole('button', { name: 'Compartir', exact: true }).click();

      const dialog = page.getByRole('dialog');
      await dialog
        .getByPlaceholder('Nombre o correo (mínimo 2 caracteres)')
        .fill(SEED_USERS.profesor.email);
      const result = dialog
        .getByRole('listitem')
        .filter({ hasText: SEED_USERS.profesor.email });
      await expect(result).toBeVisible({ timeout: 20_000 });
      await result.getByRole('button', { name: /Seleccionar/ }).click();
      await dialog.getByRole('button', { name: /^Dar acceso a/ }).click();
      await expect(
        page.getByText('Acceso compartido correctamente'),
      ).toBeVisible({ timeout: 20_000 });

      expect(
        (await teacherApi.get(`${API_BASE_URL}/documents/${document.id}`)).status(),
      ).toBe(200);

      await page.getByRole('button', { name: 'Compartir', exact: true }).click();
      const revoke = dialog.getByRole('button', { name: /Revocar concesión/ });
      await expect(revoke).toBeVisible({ timeout: 20_000 });
      await revoke.click();
      await expect(
        page.getByText('Acceso revocado correctamente'),
      ).toBeVisible({ timeout: 20_000 });
      expect(
        (await teacherApi.get(`${API_BASE_URL}/documents/${document.id}`)).status(),
      ).toBe(404);
    } finally {
      await adminApi.dispose();
      await teacherApi.dispose();
    }
  });

  test('transfiere la propiedad y el destinatario la acepta', async ({
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
    const document = await uploadDocument(adminApi, 'transfer');
    const teacherName = await userNameByEmail(
      adminApi,
      SEED_USERS.profesor.email,
    );

    try {
      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/documents/${document.id}`);
      await page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-ellipsis-vertical, svg.lucide-more-vertical') })
        .click();
      await page.getByRole('menuitem', { name: 'Transferir propiedad' }).click();

      const dialog = page.getByRole('dialog');
      await dialog.locator(`#transfer-recipient-${document.id}`).click();
      await page.getByRole('option', { name: teacherName, exact: true }).click();
      await dialog
        .getByLabel('Motivo o comentario')
        .fill('Transferencia E2E de propiedad');
      await dialog.getByRole('button', { name: 'Enviar solicitud' }).click();
      await expect(
        page.getByText('Solicitud de transferencia enviada'),
      ).toBeVisible({ timeout: 20_000 });

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto('/dashboard/transfers/received');
      const row = page
        .getByText(document.name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "sm:items-center")][1]');
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await expect(
        page.getByText('Transferencia aceptada; el documento ya es tuyo'),
      ).toBeVisible({ timeout: 20_000 });

      const owned = await teacherApi.get(
        `${API_BASE_URL}/documents/${document.id}`,
      );
      expect(owned.status()).toBe(200);
      expect((await owned.json()).uploadedById).toBe(teacher.user.id);
    } finally {
      await adminApi.dispose();
      await teacherApi.dispose();
    }
  });
});
