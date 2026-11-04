import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

test.describe('Lotes de elaboración documental', () => {
  test.setTimeout(180_000);

  test('genera dos borradores, descarga el ZIP y emite uno', async ({ page }) => {
    const marker = Date.now();
    const subject = `Lote E2E ${marker}`;

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
      page.getByRole('button', { name: 'Varios destinatarios' }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Varios destinatarios' }).click();
    await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/lote$/);
    await expect(
      page.getByRole('heading', { name: 'Generar para varios destinatarios' }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Asunto').fill(subject);
    await page.getByLabel('Nombre del firmante').fill('Rector E2E');
    await page.getByLabel('Cargo del firmante').fill('Rector');
    const editor = page.locator('.tiptap-editor .ProseMirror');
    await editor.click();
    await page.keyboard.type(`Contenido común del lote ${marker}.`);
    await page
      .getByPlaceholder(/Ana Pérez \| Directora/)
      .fill('Ana Pérez | Directora\nLuis Gómez | Coordinador');

    await page.getByRole('button', { name: 'Generar borradores' }).click();
    await expect(
      page.getByText(/2 borrador\(es\) creado\(s\)/),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Resultado: 2 documento(s)')).toBeVisible({
      timeout: 20_000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar ZIP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);

    await page.getByRole('link', { name: 'Abrir borrador' }).first().click();
    await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/editar$/);
    await page.getByRole('button', { name: 'Enviar a revisión' }).click();
    const submitDialog = page.getByRole('dialog');
    await submitDialog.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForURL(/\/dashboard\/elaboracion\/\d+$/);

    await page.getByRole('button', { name: 'Aprobar' }).first().click();
    const approveDialog = page.getByRole('dialog');
    await approveDialog
      .getByPlaceholder('Observaciones...')
      .fill('Aprobado desde lote E2E');
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
  });
});
