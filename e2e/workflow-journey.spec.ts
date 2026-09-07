import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe('Workflow configurable: admin, iniciador y rector', () => {
  test.setTimeout(180_000);

  test('admin crea y activa, inicia un documento y rector aprueba desde la UI', async ({ browser, page, request }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const definitionName = `E2E Workflow ${uniqueId}`;
    const documentDescription = `E2E Workflow Document ${uniqueId}`;
    let rectorPage: Page | undefined;
    let adminApi: APIRequestContext | undefined;
    let documentId: number;

    try {
      const admin = await getAccessToken(request, SEED_USERS.admin.email, SEED_USERS.admin.password);
      adminApi = await createAuthenticatedApiContext(admin.token);

      const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: `workflow-${uniqueId}.pdf`,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\nworkflow journey'),
          },
          description: documentDescription,
          isPublic: 'false',
        },
      });
      expect(upload.ok(), `La preparación del documento falló: ${upload.status()}`).toBeTruthy();
      documentId = (await upload.json()).id;

      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto('/dashboard/workflows');
      await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();

      await page.getByPlaceholder('Nombre de la definición').fill(definitionName);
      await page.getByPlaceholder('Descripción (opcional)').fill('Journey E2E de aprobación secuencial');
      await page.getByPlaceholder('Clave del rol').fill('rector');
      await page.getByRole('button', { name: 'Crear definición' }).click();

      const definitionRow = page.getByText(definitionName, { exact: true }).locator('xpath=../..');
      await expect(definitionRow).toContainText('Versión 1');
      await definitionRow.getByRole('button', { name: /Activar última versión/i }).click();
      await expect(definitionRow).toContainText('Activa');

      await page.goto(`/dashboard/documents/${documentId}`);
      const workflowPanel = page.getByText('Flujo de aprobación').locator('xpath=../..');
      await expect(workflowPanel).toBeVisible();
      await page.getByRole('button', { name: 'Iniciar workflow' }).click();
      const startDialog = page.getByRole('dialog');
      await expect(startDialog.getByRole('heading', { name: 'Iniciar workflow' })).toBeVisible();
      await startDialog.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.getByText('Etapa actual: rector')).toBeVisible();
      await expect(workflowPanel).toContainText('Pendiente');

      rectorPage = await browser.newPage();
      await loginViaApi(rectorPage, SEED_USERS.rector.email, SEED_USERS.rector.password);
      await rectorPage.goto(`/dashboard/documents/${documentId}`);
      const rectorWorkflowPanel = rectorPage.getByText('Flujo de aprobación').locator('xpath=../..');
      await expect(rectorWorkflowPanel).toBeVisible();
      await expect(rectorPage.getByRole('button', { name: 'Aprobar' })).toBeVisible();

      await rectorPage.getByRole('button', { name: 'Aprobar' }).click();
      const approvalDialog = rectorPage.getByRole('dialog');
      await expect(approvalDialog.getByRole('heading', { name: 'Aprobar' })).toBeVisible();
      const transitionResponsePromise = rectorPage.waitForResponse((response) =>
        response.url().includes('/workflows/') && response.request().method() === 'POST',
      );
      await approvalDialog.getByRole('button', { name: 'Confirmar' }).click();
      const transitionResponse = await transitionResponsePromise;
      expect(transitionResponse.ok(), `La aprobación falló: ${transitionResponse.status()}`).toBeTruthy();

      await rectorPage.reload();
      await expect(rectorPage.getByText('Aprobado')).toBeVisible();
      await expect(rectorPage.getByText('Etapa actual: Finalizado')).toBeVisible();
      await expect(rectorPage.getByRole('heading', { name: 'Historial de transiciones' })).toBeVisible();
      await expect(rectorPage.getByText('Aprobar')).toBeVisible();
      await expect(rectorPage.getByText('Completado')).toBeVisible();
    } finally {
      await rectorPage?.close();
      await adminApi?.dispose();
    }
  });
});
