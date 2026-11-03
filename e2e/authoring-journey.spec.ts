import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

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
});
