import { expect, test, type Page } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe('Elaboración documental', () => {
  test.setTimeout(180_000);

  test('crea, guarda, envía a revisión, aprueba y emite un oficio', async ({ page }) => {
    const marker = Date.now();
    const subject = `Oficio E2E ${marker}`;

    await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
    await page.goto('/dashboard/elaboracion');

    await expect(
      page.getByRole('heading', { name: 'Elaboración documental' }),
    ).toBeVisible({ timeout: 20_000 });

    const oficioCard = page
      .getByText('Oficio institucional', { exact: true })
      .first()
      .locator('xpath=ancestor::div[@data-slot="card"][1]');
    await expect(oficioCard).toBeVisible({ timeout: 20_000 });
    await oficioCard.getByRole('button', { name: 'Usar plantilla' }).click();

    await expect(page.getByRole('button', { name: 'Crear borrador' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Crear borrador' }).click();

    await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/editar$/, {
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel(/Nombre del destinatario/).fill('Destinatario E2E');
    await page.getByLabel(/Cargo del destinatario/).fill('Cargo E2E');
    await page.getByLabel(/Asunto/).fill(subject);

    const editor = page.locator('.tiptap-editor .ProseMirror');
    await editor.click();
    await page.keyboard.type(`Contenido del oficio E2E ${marker}.`);
    await page.waitForTimeout(1_200);

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Borrador guardado')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Enviar a revisión' }).click();
    const submitDialog = page.getByRole('dialog');
    await expect(submitDialog.getByText('Enviar a revisión')).toBeVisible();
    await submitDialog.getByRole('button', { name: 'Enviar' }).click();

    await page.waitForURL(/\/dashboard\/elaboracion\/\d+$/, {
      timeout: 30_000,
    });
    await expect(page.getByText('En revisión').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.locator('iframe[title="Vista previa del documento"]'),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Aprobar' }).first().click();
    const approveDialog = page.getByRole('dialog');
    await approveDialog.getByPlaceholder('Observaciones...').fill('Aprobado en E2E');
    await approveDialog.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText('Aprobado').first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Emitir' }).click();
    await expect(page.getByText('Emitido').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/DOC-OFI-\d{4}-\d{4}/).first()).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('devuelve, corrige, reenvía, aprueba y emite', async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000);
    const marker = Date.now();
    const admin = await getAccessToken(
      request,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    const adminApi = await createAuthenticatedApiContext(admin.token);

    try {
      const usersResponse = await adminApi.get(`${API_BASE_URL}/authoring/users`);
      expect(usersResponse.ok()).toBeTruthy();
      const users = (await usersResponse.json()) as Array<{
        id: string;
        email?: string | null;
      }>;
      const rector = users.find(
        (user) => user.email === SEED_USERS.rector.email,
      );
      expect(rector, 'rector not found').toBeDefined();

      const { documentId } = await createOficioDraft(page, marker);

      const submitDialog = page.getByRole('dialog');
      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      await submitDialog.locator('select').selectOption(rector!.id);
      await submitDialog.getByRole('button', { name: 'Enviar' }).click();
      await page.waitForURL(
        new RegExp(`/dashboard/elaboracion/${documentId}$`),
        { timeout: 30_000 },
      );
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });

      await loginViaApi(page, SEED_USERS.rector.email, SEED_USERS.rector.password);
      await page.goto(`/dashboard/elaboracion/${documentId}`);
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole('button', { name: 'Devolver' }).click();
      const returnDialog = page.getByRole('dialog');
      await returnDialog
        .getByPlaceholder('Observaciones...')
        .fill('Falta el sello de secretaría');
      await returnDialog.getByRole('button', { name: 'Devolver' }).click();
      await expect(page.getByText('Devuelto').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText('Falta el sello de secretaría', { exact: true }).first(),
      ).toBeVisible();

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/elaboracion/${documentId}`);
      await page.getByRole('button', { name: 'Editar' }).click();
      await page.waitForURL(
        new RegExp(`/dashboard/elaboracion/${documentId}/editar$`),
      );
      await page.getByLabel(/Asunto/).fill(`Oficio E2E corregido ${marker}`);
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Borrador guardado')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole('button', { name: 'Enviar a revisión' }).click();
      const resubmitDialog = page.getByRole('dialog');
      await resubmitDialog.locator('select').selectOption(rector!.id);
      await resubmitDialog.getByRole('button', { name: 'Enviar' }).click();
      await page.waitForURL(
        new RegExp(`/dashboard/elaboracion/${documentId}$`),
        { timeout: 30_000 },
      );
      await expect(page.getByText('En revisión').first()).toBeVisible({
        timeout: 20_000,
      });

      await loginViaApi(page, SEED_USERS.rector.email, SEED_USERS.rector.password);
      await page.goto(`/dashboard/elaboracion/${documentId}`);
      await page.getByRole('button', { name: 'Aprobar' }).first().click();
      const approveDialog = page.getByRole('dialog');
      await approveDialog
        .getByPlaceholder('Observaciones...')
        .fill('Aprobado tras la corrección');
      await approveDialog.getByRole('button', { name: 'Aprobar' }).click();
      await expect(page.getByText('Aprobado').first()).toBeVisible({
        timeout: 20_000,
      });

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(`/dashboard/elaboracion/${documentId}`);
      await page.getByRole('button', { name: 'Emitir' }).click();
      await expect(page.getByText('Emitido').first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/DOC-OFI-\d{4}-\d{4}/).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole('button', { name: 'Descargar PDF' }),
      ).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });
});

async function createOficioDraft(page: Page, marker: number) {
  const subject = `Oficio E2E devolución ${marker}`;
  await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
  await page.goto('/dashboard/elaboracion');
  await expect(
    page.getByRole('heading', { name: 'Elaboración documental' }),
  ).toBeVisible({ timeout: 20_000 });

  const oficioCard = page
    .getByText('Oficio institucional', { exact: true })
    .first()
    .locator('xpath=ancestor::div[@data-slot="card"][1]');
  await expect(oficioCard).toBeVisible({ timeout: 20_000 });
  await oficioCard.getByRole('button', { name: 'Usar plantilla' }).click();

  await expect(
    page.getByRole('button', { name: 'Crear borrador' }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/editar$/, {
    timeout: 30_000,
  });
  await page.getByLabel(/Nombre del destinatario/).fill('Destinatario E2E');
  await page.getByLabel(/Cargo del destinatario/).fill('Cargo E2E');
  await page.getByLabel(/Asunto/).fill(subject);
  const editor = page.locator('.tiptap-editor .ProseMirror');
  await editor.click();
  await page.keyboard.type(`Contenido del oficio con devolución ${marker}.`);
  await page.waitForTimeout(1_200);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Borrador guardado')).toBeVisible({
    timeout: 20_000,
  });

  const match = page.url().match(/\/elaboracion\/(\d+)\/editar$/);
  expect(match, 'document id not found in editor URL').toBeTruthy();
  return { documentId: Number(match![1]), subject };
}
