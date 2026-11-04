import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

const OUTSIDER = {
  email: 'prof.matematica@colegio.edu',
  password: 'Demo123!',
};

async function userIdByEmail(
  api: APIRequestContext,
  email: string,
): Promise<string> {
  const response = await api.get(`${API_BASE_URL}/authoring/users`);
  expect(response.ok()).toBeTruthy();
  const users = (await response.json()) as Array<{
    id: string;
    email?: string | null;
  }>;
  const user = users.find((entry) => entry.email === email);
  expect(user, `${email} not found`).toBeDefined();
  return user!.id;
}

test.describe('Directorios y recepción', () => {
  test.setTimeout(180_000);

  test('crea carpeta, activa recepción, recibe participante y delegado', async ({
    page,
    request,
  }) => {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const directoryName = `Recepción E2E ${marker}`;
    const fileName = `reception-${marker}.pdf`;
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
    const outsider = await getAccessToken(
      request,
      OUTSIDER.email,
      OUTSIDER.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);
    const teacherApi = await createAuthenticatedApiContext(teacher.token);
    const outsiderApi = await createAuthenticatedApiContext(outsider.token);

    try {
      const teacherId = await userIdByEmail(adminApi, SEED_USERS.profesor.email);
      const outsiderId = await userIdByEmail(adminApi, OUTSIDER.email);

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard/directories/new');
      await page.getByLabel('Nombre').fill(directoryName);
      await page.getByRole('button', { name: 'Crear carpeta' }).click();
      await page.waitForURL(/\/dashboard\/directories$/);
      await page.getByRole('button', { name: directoryName, exact: true }).click();
      await expect(page.getByText('Contenido de la carpeta')).toBeVisible();

      await page
        .getByRole('button', { name: new RegExp(`Configurar recepción de ${directoryName}`) })
        .click();
      await expect(page.getByText('Activar la recepción es irreversible')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByLabel(/Entiendo que la activación/).check();
      await page.getByRole('button', { name: 'Activar recepción' }).click();
      await expect(page.getByText('Recepción activada')).toBeVisible({
        timeout: 20_000,
      });
      await page.keyboard.press('Escape');
      await expect(page.getByText('Recepción activada')).toBeHidden();

      const directoryResponse = await adminApi.get(
        `${API_BASE_URL}/directories/accessible?limit=50`,
      );
      expect(directoryResponse.ok()).toBeTruthy();
      const accessible = await directoryResponse.json();
      const directory = (accessible.data as Array<{ id: number; name: string }>).find(
        (entry) => entry.name === directoryName,
      );
      expect(directory, 'created directory not found').toBeDefined();

      const participant = await adminApi.post(
        `${API_BASE_URL}/directories/${directory!.id}/reception/participants`,
        { data: { userId: teacherId, peerRead: true } },
      );
      expect(participant.ok(), await participant.text()).toBeTruthy();

      const upload = await teacherApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\nrecepción e2e'),
          },
          description: `Documento de recepción ${marker}`,
          directoryId: String(directory!.id),
          isPublic: 'false',
        },
      });
      expect(upload.ok(), await upload.text()).toBeTruthy();
      const documentId = (await upload.json()).id as number;

      expect(
        (await teacherApi.get(`${API_BASE_URL}/documents/${documentId}`)).status(),
      ).toBe(200);
      expect(
        (await outsiderApi.get(`${API_BASE_URL}/documents/${documentId}`)).status(),
      ).toBe(404);

      await loginViaApi(
        page,
        SEED_USERS.profesor.email,
        SEED_USERS.profesor.password,
      );
      await page.goto('/dashboard/directories');
      await page
        .getByRole('button', { name: new RegExp(`Recepción: ${directoryName}`) })
        .click();
      await expect(page.getByText(fileName, { exact: true })).toBeVisible({
        timeout: 20_000,
      });

      const delegate = await adminApi.patch(
        `${API_BASE_URL}/directories/${directory!.id}/reception/delegates/${outsiderId}`,
        { data: { readAll: true } },
      );
      expect(delegate.ok(), await delegate.text()).toBeTruthy();
      expect(
        (await outsiderApi.get(`${API_BASE_URL}/documents/${documentId}`)).status(),
      ).toBe(200);

      await loginViaApi(page, OUTSIDER.email, OUTSIDER.password);
      await page.goto('/dashboard/directories');
      await page
        .getByRole('button', { name: new RegExp(`Recepción: ${directoryName}`) })
        .click();
      await expect(page.getByText(fileName, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await adminApi.dispose();
      await teacherApi.dispose();
      await outsiderApi.dispose();
    }
  });
});
