import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

const API = 'http://localhost:3001/api';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Creador visual de plantillas', () => {
  test.setTimeout(180_000);

  test('crea una plantilla estándar en dos pasos y la publica desde el editor visual', async ({
    page,
    request,
  }) => {
    const marker = Date.now();
    const name = `Plantilla visual E2E ${marker}`;

    const loginResponse = await request.post(`${API}/auth/login`, {
      data: {
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token: token } = await loginResponse.json();
    const headers = { Authorization: `Bearer ${token}` };

    let templateId: number | null = null;

    try {
      await loginViaApi(
        page,
        SEED_USERS.admin.email,
        SEED_USERS.admin.password,
      );
      await page.goto('/dashboard/elaboracion');
      await expect(
        page.getByRole('button', { name: /Limpiar imágenes/ }),
      ).toBeVisible();
      await page.getByRole('button', { name: /Limpiar imágenes/ }).click();
      await expect(
        page.getByRole('dialog').getByText('Limpiar imágenes no usadas'),
      ).toBeVisible();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Limpiar' })
        .click();
      await expect(page.getByText(/Limpieza completada:/)).toBeVisible({
        timeout: 30_000,
      });
      await page.getByRole('link', { name: /Nueva plantilla/ }).click();

      await page.getByLabel('Nombre', { exact: true }).fill(name);
      await page.getByLabel('Prefijo de numeración').fill('VIS');
      await page
        .getByRole('button', { name: 'Crear y abrir editor' })
        .click();

      await page.waitForURL(
        /\/dashboard\/elaboracion\/plantillas\/\d+\/diseno$/,
        { timeout: 30_000 },
      );
      templateId = Number(
        page.url().match(/plantillas\/(\d+)\/diseno/)?.[1],
      );
      expect(templateId).toBeGreaterThan(0);

      await expect(
        page.getByRole('heading', { name: 'Editor de plantilla' }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole('button', { name: 'Contenido', exact: true }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Asunto', exact: true }).click();
      const editor = page.locator('.tiptap-editor .ProseMirror');
      await editor.click();
      await page.keyboard.type(`Contenido visual E2E ${marker}.`);
      await page.waitForTimeout(800);

      const bodyImageResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/authoring/assets') &&
          response.request().method() === 'POST',
      );
      await page.locator('[data-testid="rich-text-add-image"]').setInputFiles({
        name: 'cuerpo.png',
        mimeType: 'image/png',
        buffer: PNG,
      });
      const bodyImage = (await (await bodyImageResponse).json()) as {
        url: string;
      };
      await expect(
        page.getByRole('button', { name: 'Izq', exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: 'Izq', exact: true }).click();
      await page.getByLabel('Ancho de imagen').selectOption('50');
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: 'Guardar borrador' }).click();
      await expect(
        page.getByText('Versión borrador creada. Publícala para aplicarla.'),
      ).toBeVisible({ timeout: 20_000 });

      const templateResponse = await request.get(
        `${API}/authoring/templates/${templateId}`,
        { headers },
      );
      expect(templateResponse.ok()).toBeTruthy();
      const template = await templateResponse.json();
      const draft = template.versions.find(
        (version: any) => version.status === 'DRAFT',
      );
      expect(draft).toBeTruthy();
      expect(draft.bodyHtml).toContain('{{> institutionHeader}}');
      expect(draft.bodyHtml).toContain('<div class="content">');
      expect(draft.bodyHtml).toContain('{{documento.asunto}}');
      expect(draft.bodyHtml).toContain('{{{contenido}}}');
      expect(draft.bodyHtml).toContain(`Contenido visual E2E ${marker}.`);
      expect(draft.bodyHtml).toContain(bodyImage.url);
      expect(draft.bodyHtml).toMatch(/width:\s*50%/);
      expect(draft.bodyHtml).toMatch(/margin-left:\s*0(?:px)?/);

      await page.getByRole('button', { name: 'Guardar y publicar' }).click();
      await expect(
        page.getByText('Contenido guardado y publicado.'),
      ).toBeVisible({ timeout: 20_000 });

      await page.goto(`/dashboard/elaboracion/plantillas/${templateId}`);
      const useLink = page.getByRole('link', { name: /Usar plantilla/ }).first();
      await expect(useLink).toBeVisible({ timeout: 20_000 });
      await useLink.click();
      await page.getByRole('button', { name: 'Crear borrador' }).click();
      await page.waitForURL(/\/dashboard\/elaboracion\/\d+\/editar$/, {
        timeout: 30_000,
      });
      await expect(page.getByLabel(/Asunto/)).toBeVisible();
      await expect(page.getByLabel(/Nombre del destinatario/)).toBeVisible();

      const documentId = Number(
        page.url().match(/elaboracion\/(\d+)\/editar/)?.[1],
      );
      expect(documentId).toBeGreaterThan(0);
      const previewResponse = await request.get(
        `${API}/authoring/documents/${documentId}/preview`,
        { headers },
      );
      expect(previewResponse.ok()).toBeTruthy();
      expect((await previewResponse.body()).length).toBeGreaterThan(1_000);
    } finally {
      if (templateId) {
        await request.post(
          `${API}/authoring/templates/${templateId}/deactivate`,
          { headers, data: {} },
        );
      }
    }
  });
});
