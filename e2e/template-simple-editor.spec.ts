import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

const API = 'http://localhost:3001/api';

test.describe('Editor simple de plantillas', () => {
  test.setTimeout(180_000);

  test('arrastra, guarda y publica un diseño y lo usa en un documento', async ({
    page,
    request,
  }) => {
    const marker = Date.now();
    const loginResponse = await request.post(`${API}/auth/login`, {
      data: {
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token: token } = await loginResponse.json();
    const headers = { Authorization: `Bearer ${token}` };

    const oficioResponse = await request.get(`${API}/authoring/templates/61`, {
      headers,
    });
    expect(oficioResponse.ok()).toBeTruthy();
    const oficio = await oficioResponse.json();
    const oficioVersion = oficio.versions.find(
      (version: any) => version.status === 'PUBLISHED',
    );
    expect(oficioVersion).toBeTruthy();

    const createResponse = await request.post(`${API}/authoring/templates`, {
      headers,
      data: {
        name: `Prueba editor simple E2E ${marker}`,
        description: 'Plantilla temporal para la prueba del editor simple.',
        bodyHtml: oficioVersion.bodyHtml,
        fields: oficioVersion.fields,
        pageFrame: oficioVersion.pageFrame,
        pageSize: 'Letter',
        orientation: 'portrait',
        numberPrefix: 'TST',
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const template = await createResponse.json();
    const draftVersion = template.versions[0];
    const publishResponse = await request.post(
      `${API}/authoring/templates/${template.id}/versions/${draftVersion.id}/publish`,
      { headers, data: {} },
    );
    expect(publishResponse.ok()).toBeTruthy();

    try {
      await loginViaApi(
        page,
        SEED_USERS.admin.email,
        SEED_USERS.admin.password,
      );
      await page.goto(
        `/dashboard/elaboracion/plantillas/${template.id}/diseno`,
      );
      await expect(
        page.getByRole('button', { name: 'Simple', exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Agregar texto' }).click();
      const newTextLayers = page.getByRole('button', { name: 'Texto nuevo' });
      await expect(newTextLayers).toHaveCount(1);
      await page.getByRole('button', { name: 'Duplicar' }).click();
      await expect(newTextLayers).toHaveCount(2);
      await page.getByRole('button', { name: 'Copiar' }).click();
      await page.getByRole('button', { name: 'Pegar' }).click();
      await expect(newTextLayers).toHaveCount(3);
      await page.getByRole('button', { name: 'Eliminar' }).click();
      await expect(newTextLayers).toHaveCount(2);
      await newTextLayers.first().click();
      await newTextLayers.nth(1).click({ modifiers: ['Control'] });
      const groupHandle = page.locator('[data-group-resize]');
      await expect(groupHandle).toBeVisible();
      const groupBounds = await groupHandle.boundingBox();
      expect(groupBounds).not.toBeNull();
      await page.mouse.move(
        groupBounds!.x + groupBounds!.width / 2,
        groupBounds!.y + groupBounds!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        groupBounds!.x + groupBounds!.width / 2 + 40,
        groupBounds!.y + groupBounds!.height / 2 + 20,
        { steps: 8 },
      );
      await page.mouse.up();
      await newTextLayers.first().click();
      await page.getByRole('button', { name: 'Al fondo' }).click();
      await page
        .getByRole('button', { name: 'Título', exact: true })
        .first()
        .click();
      const before = Number(
        await page.locator('input[type="number"]').first().inputValue(),
      );
      await page
        .getByRole('button', { name: 'Subtítulo', exact: true })
        .first()
        .click({ modifiers: ['Control'] });
      await expect(page.getByText(/2 elementos seleccionados/)).toBeVisible();
      await expect(page).toHaveScreenshot('simple-editor-multi.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.03,
        mask: [page.getByText(/Prueba editor simple E2E/)],
      });
      await page.getByRole('button', { name: 'Izq.' }).click();
      const box = page.locator('[data-box-id="acta-5"]');
      const bounds = await box.boundingBox();
      expect(bounds).not.toBeNull();
      await page.mouse.move(
        bounds!.x + bounds!.width / 2,
        bounds!.y + bounds!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds!.x + bounds!.width / 2 + 30,
        bounds!.y + bounds!.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForTimeout(400);
      await page
        .getByRole('button', { name: 'Título', exact: true })
        .first()
        .click();
      const after = Number(
        await page.locator('input[type="number"]').first().inputValue(),
      );
      expect(after).not.toBe(before);
      await page.getByRole('button', { name: 'B', exact: true }).click();
      await expect(page).toHaveScreenshot('simple-editor.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.03,
        mask: [page.getByText(/Prueba editor simple E2E/)],
      });

      await page.getByRole('button', { name: 'Guardar y publicar' }).click();
      await page.waitForURL(
        new RegExp(`/dashboard/elaboracion/plantillas/${template.id}$`),
        { timeout: 45_000 },
      );
      await expect(
        page.getByRole('link', { name: /Usar plantilla/ }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await page.getByRole('link', { name: /Usar plantilla/ }).first().click();
      await page.getByRole('button', { name: 'Crear borrador' }).click();
      await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/editar$/, {
        timeout: 45_000,
      });
      const documentId = Number(
        page.url().match(/elaboracion\/(\d+)\/editar/)?.[1],
      );
      expect(documentId).toBeGreaterThan(0);
      const documentResponse = await request.get(
        `${API}/authoring/documents/${documentId}`,
        { headers },
      );
      expect(documentResponse.ok()).toBeTruthy();
      const document = await documentResponse.json();
      expect(document.templateData?.templateVersion?.version).toBe(
        draftVersion.version + 1,
      );
      const title = document.authoring?.pageFrame?.body?.boxes?.find(
        (box: any) => box.id === 'acta-5',
      );
      expect(title?.x).toBe(after);
      const resizedText = document.authoring?.pageFrame?.body?.boxes?.find(
        (box: any) => box.content === 'Texto nuevo',
      );
      expect(resizedText?.width).toBeGreaterThan(200);
      const previewResponse = await request.get(
        `${API}/authoring/documents/${documentId}/preview`,
        { headers },
      );
      expect(previewResponse.ok()).toBeTruthy();

      await page.goto(`/dashboard/elaboracion/plantillas/${template.id}`);
      await page.getByRole('button', { name: 'Duplicar', exact: true }).click();
      const duplicateDialog = page.getByRole('dialog');
      await duplicateDialog
        .getByLabel('Nombre de la nueva plantilla')
        .fill(`Prueba editor simple E2E copia ${marker}`);
      await duplicateDialog
        .getByRole('button', { name: 'Duplicar', exact: true })
        .click();
      await page.waitForURL(
        (url) => {
          const match = url.pathname.match(/\/plantillas\/(\d+)$/);
          return Boolean(match && Number(match[1]) !== template.id);
        },
        { timeout: 30_000 },
      );
      const copyId = Number(page.url().match(/plantillas\/(\d+)$/)?.[1]);
      expect(copyId).toBeGreaterThan(0);
      expect(copyId).not.toBe(template.id);
      const copyResponse = await request.get(
        `${API}/authoring/templates/${copyId}`,
        { headers },
      );
      expect(copyResponse.ok()).toBeTruthy();
      const copy = await copyResponse.json();
      expect(copy.name).toContain('copia');
      expect(copy.versions?.[0]?.pageFrame?.mode).toBe('fullPage');

      await request.post(`${API}/authoring/templates/${copyId}/deactivate`, {
        headers,
        data: {},
      });
    } finally {
      await request.post(`${API}/authoring/templates/${template.id}/deactivate`, {
        headers,
        data: {},
      });
    }
  });
});
