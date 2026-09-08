import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from "./auth.setup";
import { WorkflowFixtureRegistry } from "./workflow-fixtures";

test.describe("Workflow configurable: admin, iniciador y rector", () => {
  test.setTimeout(180_000);

  test("admin navega, selecciona una definición aplicable y rector aprueba desde la UI", async ({
    browser,
    page,
    request,
  }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const definitionName = `E2E Workflow ${uniqueId}`;
    const documentDescription = `E2E Workflow Document ${uniqueId}`;
    let rectorPage: Page | undefined;
    let adminApi: APIRequestContext | undefined;
    let documentId: number;
    const fixtures = new WorkflowFixtureRegistry(uniqueId);

    try {
      const admin = await getAccessToken(
        request,
        SEED_USERS.admin.email,
        SEED_USERS.admin.password,
      );
      adminApi = await createAuthenticatedApiContext(admin.token);

      const upload = await adminApi.post(`${API_BASE_URL}/documents/upload`, {
        multipart: {
          file: {
            name: `workflow-${uniqueId}.pdf`,
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.4\nworkflow journey"),
          },
          description: documentDescription,
          isPublic: "false",
        },
      });
      expect(
        upload.ok(),
        `La preparación del documento falló: ${upload.status()}`,
      ).toBeTruthy();
      documentId = (await upload.json()).id;
      fixtures.track("document", documentId);

      await loginViaApi(
        page,
        SEED_USERS.admin.email,
        SEED_USERS.admin.password,
      );
      await page.goto("/dashboard/home");
      const settingsNavigation = page
        .getByRole("link", { name: "Configuración" })
        .first();
      const settingsHref = await settingsNavigation.getAttribute("href");
      expect(settingsHref).toBe("/dashboard/settings");
      await page.goto(settingsHref!);
      await expect(page).toHaveURL(/\/dashboard\/settings$/);
      const workflowNavigation = page.getByRole("link", {
        name: /Flujos de trabajo/,
      });
      const workflowHref = await workflowNavigation.getAttribute("href");
      expect(workflowHref).toBe("/dashboard/settings?section=workflows");
      await page.goto(workflowHref!);
      await expect(page).toHaveURL(/\/dashboard\/settings\?section=workflows$/);
      await expect(
        page.getByRole("heading", { name: "Flujos de trabajo" }),
      ).toBeVisible();

      await page
        .getByPlaceholder("Nombre de la definición")
        .fill(definitionName);
      await page
        .getByPlaceholder("Descripción y propósito del flujo de trabajo")
        .fill("Journey E2E de aprobación secuencial");
      await page.getByPlaceholder("Clave del rol").fill("rector");
      const creationResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/workflow-definitions") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Crear definición" }).click();
      const createdVersion = await creationResponsePromise.then((response) =>
        response.json(),
      );
      fixtures.track("definition", createdVersion.templateId);
      fixtures.track("version", createdVersion.id);
      const activation = await adminApi.post(
        `${API_BASE_URL}/workflow-definitions/${createdVersion.templateId}/versions/${createdVersion.id}/activate`,
      );
      expect(
        activation.ok(),
        `La activación de la definición falló: ${activation.status()}`,
      ).toBeTruthy();
      await page.reload();

      const definitionRow = page
        .getByText(definitionName, { exact: true })
        .locator("xpath=../..");
      await expect(definitionRow).toContainText("1 versión(es)");
      await definitionRow.getByRole("button", { name: "Ver detalle" }).click();
      await expect(page.getByText("Versión 1", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Activa", { exact: true }).last(),
      ).toBeVisible();

      await page.goto(`/dashboard/documents/${documentId}`);
      const workflowPanel = page
        .getByText("Flujo de trabajo", { exact: true })
        .first();
      await expect(workflowPanel).toBeVisible();
      await page
        .getByRole("button", { name: "Iniciar flujo de trabajo" })
        .click();
      const startDialog = page.getByRole("dialog");
      await expect(
        startDialog.getByRole("heading", { name: "Iniciar flujo de trabajo" }),
      ).toBeVisible();
      const confirmStart = startDialog.getByRole("button", {
        name: "Confirmar",
      });
      await expect(confirmStart).toBeDisabled();
      await startDialog.getByRole("combobox").click();
      await page
        .getByRole("option", { name: `${definitionName} · versión 1` })
        .click();
      await expect(confirmStart).toBeEnabled();
      const startResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/documents/${documentId}/workflows`) &&
          response.request().method() === "POST",
      );
      await confirmStart.click();
      const startResponse = await startResponsePromise;
      expect(startResponse.request().postDataJSON()).toMatchObject({
        versionId: expect.any(Number),
      });
      const execution = await startResponse.json();
      if (execution.id) fixtures.track("execution", execution.id);
      await expect(page.getByText("Etapa actual: rector")).toBeVisible();
      await expect(
        page.getByText("Pendiente", { exact: true }).first(),
      ).toBeVisible();

      rectorPage = await browser.newPage();
      await loginViaApi(
        rectorPage,
        SEED_USERS.rector.email,
        SEED_USERS.rector.password,
      );
      await rectorPage.goto(`/dashboard/documents/${documentId}`);
      const rectorWorkflowPanel = rectorPage
        .getByText("Flujo de trabajo", { exact: true })
        .first();
      await expect(rectorWorkflowPanel).toBeVisible();
      await expect(
        rectorPage.getByRole("button", { name: "Aprobar" }),
      ).toBeVisible();

      await rectorPage.getByRole("button", { name: "Aprobar" }).click();
      const approvalDialog = rectorPage.getByRole("dialog");
      await expect(
        approvalDialog.getByRole("heading", { name: "Aprobar" }),
      ).toBeVisible();
      const transitionResponsePromise = rectorPage.waitForResponse(
        (response) =>
          response.url().includes("/workflows/") &&
          response.request().method() === "POST",
      );
      await approvalDialog.getByRole("button", { name: "Confirmar" }).click();
      const transitionResponse = await transitionResponsePromise;
      expect(
        transitionResponse.ok(),
        `La aprobación falló: ${transitionResponse.status()}`,
      ).toBeTruthy();

      await rectorPage.reload();
      await expect(rectorPage.getByText("Aprobado")).toBeVisible();
      await expect(
        rectorPage.getByText("Etapa actual: Finalizado"),
      ).toBeVisible();
      await expect(
        rectorPage.getByRole("heading", { name: "Historial de transiciones" }),
      ).toBeVisible();
      await expect(rectorPage.getByText("Aprobar")).toBeVisible();
      await expect(rectorPage.getByText("Completado")).toBeVisible();
    } finally {
      try {
        await fixtures.cleanup({
          execution: async (id, record) => ({
            status: "isolated",
            evidence:
              `Backend has no execution deletion endpoint; execution ${id} ` +
              `remains attributable to isolated run ${record.scopeId}.`,
          }),
          version: async (id, record) => ({
            status: "isolated",
            evidence:
              `Backend has no version deletion endpoint; version ${id} ` +
              `remains attributable to isolated run ${record.scopeId}.`,
          }),
          definition: async (id, record) => ({
            status: "isolated",
            evidence:
              `Backend has no definition deletion endpoint; definition ${id} ` +
              `remains isolated by the unique run scope ${record.scopeId}.`,
          }),
          document: async (id) => {
            if (!adminApi) {
              throw new Error("authenticated cleanup context unavailable");
            }
            const response = await adminApi.delete(
              `${API_BASE_URL}/documents/${id}`,
            );
            if (!response.ok() && response.status() !== 404)
              throw new Error(`document ${id}: ${response.status()}`);
            return {
              status: "deleted",
              evidence:
                response.status() === 404
                  ? `document ${id} was already absent`
                  : `document ${id} deleted through the supported endpoint`,
            };
          },
        });
      } finally {
        await rectorPage?.close();
        await adminApi?.dispose();
      }
    }
  });
});
