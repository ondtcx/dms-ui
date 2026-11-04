import { expect, test, type Locator } from '@playwright/test';
import {
  API_BASE_URL,
  createAuthenticatedApiContext,
  getAccessToken,
  loginViaApi,
  SEED_USERS,
} from './auth.setup';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const QA_EMAIL = `e2e.journey.${stamp}@colegio.edu`;
const QA_PASSWORD = 'Demo123!';
const QA_NAME = `E2E Analista ${stamp}`;
const EDITOR_NAME = `E2E Editor ${stamp}`;
const TEMPLATE_NAME = `E2E Oficio ${stamp}`;
const UPLOAD_NAME = `E2E Constancia ${stamp}`;

const samplePdf = '../doc-examples/school-samples/constancia-estudios-juan-pablo-medina.pdf';
const replacementPdf = '../doc-examples/school-samples/constancia-conducta-isabella-paredes.pdf';

test('full document journey: user, editor, template, upload, review, emission and archive', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(600_000);

  await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
  const admin = await getAccessToken(request, SEED_USERS.admin.email, SEED_USERS.admin.password);
  const adminApi = await createAuthenticatedApiContext(admin.token);

  // 1. Create a user through the real admin UI.
  await page.goto('/dashboard/users');
  await page.getByRole('button', { name: 'Crear usuario' }).click({ force: true });
  const userDialog = page.getByRole('dialog');
  await userDialog.getByLabel('Nombre').fill(QA_NAME);
  await userDialog.getByLabel('Email').fill(QA_EMAIL);
  await userDialog.getByLabel('Contraseña').fill(QA_PASSWORD);
  await userDialog.getByLabel('Rol').selectOption({ label: 'Secretario' });
  await userDialog.getByRole('button', { name: 'Crear usuario' }).click({ force: true });
  await expect(page.getByText(QA_EMAIL)).toBeVisible({ timeout: 10000 });

  const usersResponse = await adminApi.get(`${API_BASE_URL}/users?status=all`);
  const usersBody = await usersResponse.json();
  const users = Array.isArray(usersBody) ? usersBody : usersBody.data ?? [];
  const qaUser = users.find((user: any) => user.email === QA_EMAIL);
  expect(qaUser?.id).toBeTruthy();
  const qaContext = await browser.newContext();
  const qaPage = await qaContext.newPage();
  await loginViaApi(qaPage, QA_EMAIL, QA_PASSWORD);
  const qaAuth = await getAccessToken(request, QA_EMAIL, QA_PASSWORD);
  const qaApi = await createAuthenticatedApiContext(qaAuth.token);

  const rectorContext = await browser.newContext();
  const rectorPage = await rectorContext.newPage();
  await loginViaApi(rectorPage, SEED_USERS.rector.email, SEED_USERS.rector.password);

  const pickReviewer = async (scope: Locator, reviewerName = 'Erika Ramirez') => {
    const trigger = scope.getByRole('combobox', { name: /Revisor/ }).first();
    await expect(trigger).toBeEnabled({ timeout: 15000 });
    await trigger.click();
    const search = qaPage.getByRole('combobox', { name: 'Buscar revisor' });
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill(reviewerName);
    const option = qaPage.getByRole('option', { name: new RegExp(reviewerName) });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await expect(search).toBeHidden({ timeout: 10000 });
    await expect(trigger).toContainText(reviewerName);
  };

  const submitAuthoring = async (documentId: number) => {
    const saveButton = qaPage.getByRole('button', { name: 'Guardar' });
    await saveButton.click();
    await expect(saveButton).toBeEnabled({ timeout: 15000 });
    await qaPage.getByRole('button', { name: 'Enviar a revisión' }).click();
    const dialog = qaPage.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await pickReviewer(dialog);
    await dialog.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(dialog).toHaveCount(0, { timeout: 15000 });
    await expect(qaPage).toHaveURL(
      new RegExp(`/dashboard/elaboracion/${documentId}$`),
      { timeout: 15000 },
    );
    await expect(qaPage.getByText('En revisión').first()).toBeVisible({
      timeout: 10000,
    });
  };

  let editorId = 0;
  let templateDocId = 0;
  let uploadDocId = 0;

  try {
    // 2. Editor-first creation with the institutional frame.
    await qaPage.goto('/dashboard/documents');
    await expect(qaPage.getByRole('button', { name: 'Crear' })).toBeVisible();
    await qaPage.getByRole('button', { name: 'Crear' }).click({ force: true });
    const createDialog = qaPage.getByRole('dialog');
    await expect(createDialog.getByRole('tab', { name: 'Editor' })).toHaveAttribute('aria-selected', 'true');
    const frameSwitch = createDialog.getByRole('checkbox', {
      name: 'Usar formato institucional del Acta de entrega-recepción',
    });
    await expect(frameSwitch).not.toBeChecked();
    await frameSwitch.check({ force: true });
    await createDialog.getByLabel('Nombre del documento (opcional)').fill(EDITOR_NAME);
    await createDialog.getByRole('button', { name: 'Crear en editor' }).click({ force: true });
    await qaPage.waitForURL('**/dashboard/elaboracion/*/editar', { timeout: 15000 });
    editorId = Number(qaPage.url().match(/elaboracion\/(\d+)\/editar/)?.[1]);
    expect(editorId).toBeGreaterThan(0);
    await expect(qaPage.getByRole('heading', { name: EDITOR_NAME })).toBeVisible();
    await expect(qaPage.getByText('Documento en blanco institucional').first()).toBeVisible();
    await expect(qaPage.getByText('Título y etiquetas de firmas')).toBeVisible();
    await qaPage.locator('.ProseMirror').first().click({ force: true });
    await qaPage.keyboard.type('Contenido del documento E2E creado en el editor.');
    await submitAuthoring(editorId);
    await expect(qaPage.getByText('En revisión').first()).toBeVisible();
    const editorDetail = await (await qaApi.get(`${API_BASE_URL}/documents/${editorId}`)).json();
    expect(editorDetail.authoring?.pageFrame?.mode).toBe('fullPage');
    expect(editorDetail.templateData?.template?.name).toBe('Documento en blanco institucional');
    // 3. Reviewer returns, creator corrects, reviewer approves, creator emits and archives.
    await rectorPage.goto('/dashboard/documents/pending');
    const authoringCard = rectorPage.locator('[data-slot="card"]').filter({ hasText: EDITOR_NAME }).first();
    await expect(authoringCard).toBeVisible();
    await authoringCard.getByRole('button', { name: 'Devolver' }).click({ force: true });
    const returnDialog = rectorPage.getByRole('dialog');
    await returnDialog.getByLabel(/Observación/).fill('E2E: falta precisar el destinatario.');
    await returnDialog.getByRole('button', { name: 'Devolver' }).click({ force: true });
    await expect(authoringCard).toHaveCount(0, { timeout: 10000 });

    await qaPage.goto(`/dashboard/elaboracion/${editorId}/editar`);
    await expect(qaPage.getByText(/Observaciones de la devolución/)).toBeVisible();
    await qaPage.locator('.ProseMirror').first().click({ force: true });
    await qaPage.keyboard.type(' Contenido corregido después de la devolución E2E.');
    await submitAuthoring(editorId);

    await rectorPage.goto('/dashboard/documents/pending');
    const approveCard = rectorPage.locator('[data-slot="card"]').filter({ hasText: EDITOR_NAME }).first();
    await expect(approveCard).toBeVisible();
    await approveCard.getByRole('button', { name: 'Aprobar' }).click({ force: true });
    const approveDialog = rectorPage.getByRole('dialog');
    await approveDialog.getByRole('button', { name: 'Aprobar' }).click({ force: true });
    await expect(approveCard).toHaveCount(0, { timeout: 10000 });

    await rectorPage.goto(`/dashboard/elaboracion/${editorId}`);
    await expect(rectorPage.getByText(/Solo el creador puede emitirlo/)).toBeVisible();
    await expect(rectorPage.getByRole('button', { name: 'Emitir y numerar' })).toHaveCount(0);
    await qaPage.goto(`/dashboard/elaboracion/${editorId}`);
    await qaPage.getByRole('button', { name: 'Emitir y numerar' }).click({ force: true });
    const emitDialog = qaPage.getByRole('dialog');
    await emitDialog.getByRole('button', { name: 'Emitir y numerar' }).click({ force: true });
    await expect(qaPage.getByText('Emitido').first()).toBeVisible({ timeout: 10000 });
    await expect(qaPage.getByText(/DOC-/).first()).toBeVisible();
    await qaPage.getByRole('button', { name: 'Archivar' }).click({ force: true });
    const archiveDialog = qaPage.getByRole('dialog');
    await archiveDialog.getByRole('button', { name: 'Archivar' }).click({ force: true });
    await expect(qaPage.getByText('Archivado').first()).toBeVisible({ timeout: 10000 });

    await qaPage.goto(`/dashboard/documents/${editorId}/audit`);
    await expect(qaPage.getByText('Origen del documento')).toBeVisible();
    await expect(qaPage.getByText('Creado en el editor')).toBeVisible();
    await expect(qaPage.getByText('Estado y etapas')).toBeVisible();
    await expect(qaPage.getByRole('heading', { name: 'Registro de actividad' })).toBeVisible();
    const audit = await (await qaApi.get(`${API_BASE_URL}/documents/${editorId}/audit?limit=20`)).json();
    const actions = audit.data.map((event: any) => event.action);
    expect(actions).toEqual(expect.arrayContaining(['CREATE', 'SUBMIT', 'APPROVE', 'COMPLETE', 'ARCHIVE']));
    // 4. Template creation with its own document type.
    await qaPage.goto('/dashboard/documents');
    await qaPage.getByRole('button', { name: 'Crear' }).click({ force: true });
    const templateCreateDialog = qaPage.getByRole('dialog');
    await templateCreateDialog.getByRole('tab', { name: 'Plantilla' }).click({ force: true });
    await templateCreateDialog.getByPlaceholder('Buscar plantilla por nombre o descripción').fill('Oficio institucional');
    await templateCreateDialog.getByRole('button', { name: /Oficio institucional/ }).click({ force: true });
    await templateCreateDialog.getByLabel('Nombre del documento (opcional)').fill(TEMPLATE_NAME);
    await templateCreateDialog.getByRole('button', { name: 'Crear desde plantilla' }).click({ force: true });
    await qaPage.waitForURL('**/dashboard/elaboracion/*/editar', { timeout: 15000 });
    templateDocId = Number(qaPage.url().match(/elaboracion\/(\d+)\/editar/)?.[1]);
    await expect(qaPage.getByRole('heading', { name: TEMPLATE_NAME })).toBeVisible();
    await qaPage.getByLabel('Nombre del destinatario').fill('Lcda. Erika Ramirez');
    await qaPage.getByLabel('Cargo del destinatario').fill('Rectora General');
    await qaPage.getByLabel('Asunto').fill('Oficio de prueba E2E');
    await qaPage.getByLabel('Nombre del firmante').fill('Fabian Díaz');
    await qaPage.getByLabel('Cargo del firmante').fill('Secretario Académico');
    await qaPage.locator('.ProseMirror').first().click({ force: true });
    await qaPage.keyboard.type('Contenido del oficio de prueba E2E.');
    await submitAuthoring(templateDocId);
    await expect(qaPage.getByText('En revisión').first()).toBeVisible();
    const templateDetail = await (await qaApi.get(`${API_BASE_URL}/documents/${templateDocId}`)).json();
    expect(templateDetail.documentType?.name).toBe('Oficio');

    await rectorPage.goto('/dashboard/documents/pending');
    const templateCard = rectorPage.locator('[data-slot="card"]').filter({ hasText: TEMPLATE_NAME }).first();
    await expect(templateCard).toBeVisible();
    await templateCard.getByRole('button', { name: 'Aprobar' }).click({ force: true });
    const templateApproveDialog = rectorPage.getByRole('dialog');
    await templateApproveDialog.getByRole('button', { name: 'Aprobar' }).click({ force: true });
    await expect(templateCard).toHaveCount(0, { timeout: 10000 });

    await qaPage.goto(`/dashboard/elaboracion/${templateDocId}`);
    await qaPage.getByRole('button', { name: 'Emitir y numerar' }).click({ force: true });
    const templateEmitDialog = qaPage.getByRole('dialog');
    await templateEmitDialog.getByRole('button', { name: 'Emitir y numerar' }).click({ force: true });
    await expect(qaPage.getByText('Emitido').first()).toBeVisible({ timeout: 10000 });
    // 5. Upload creation, review, file update during review, approval and archive.
    await qaPage.goto('/dashboard/documents');
    await qaPage.getByRole('button', { name: 'Crear' }).click({ force: true });
    const uploadCreateDialog = qaPage.getByRole('dialog');
    await uploadCreateDialog.getByRole('tab', { name: 'Subir' }).click({ force: true });
    await uploadCreateDialog.getByRole('button', { name: 'Subir un archivo' }).click({ force: true });
    const uploadDialog = qaPage.getByRole('dialog');
    await uploadDialog.getByLabel('Archivo *').setInputFiles(samplePdf);
    await uploadDialog.getByLabel('Nombre del documento (opcional)').first().fill(UPLOAD_NAME);
    const generalCheckbox = uploadDialog.getByRole('checkbox', { name: 'Documento general' });
    if (await generalCheckbox.isChecked()) await generalCheckbox.uncheck({ force: true });
    await uploadDialog.getByRole('combobox', { name: /Tipo de documento/ }).first().click({ force: true });
    await qaPage.getByRole('option', { name: 'Constancia de Estudios' }).click({ force: true });
    await uploadDialog.getByRole('button', { name: 'Subir Documento' }).click({ force: true });
    await expect(uploadDialog).toHaveCount(0, { timeout: 15000 });

    const uploadedList = await (await qaApi.get(`${API_BASE_URL}/documents?search=${encodeURIComponent(UPLOAD_NAME)}&limit=10`)).json();
    const uploadedDoc = uploadedList.data.find((document: any) => document.name === UPLOAD_NAME);
    expect(uploadedDoc?.id).toBeTruthy();
    uploadDocId = uploadedDoc.id;

    await qaPage.goto(`/dashboard/documents/${uploadDocId}`);
    const uploadReviewPanel = qaPage
      .locator('[data-slot="card"]')
      .filter({ hasText: 'Revisión del documento' })
      .first();
    await expect(uploadReviewPanel.getByText('Revisión del documento')).toBeVisible();
    await pickReviewer(uploadReviewPanel);
    await uploadReviewPanel
      .getByRole('button', { name: 'Enviar a revisión' })
      .click();
    await expect
      .poll(
        async () =>
          (await (await qaApi.get(`${API_BASE_URL}/documents/${uploadDocId}`)).json())
            .review?.status,
        { timeout: 15000 },
      )
      .toBe('IN_REVIEW');

    await rectorPage.goto(`/dashboard/documents/${uploadDocId}`);
    const uploadedReviewPanel = rectorPage.locator('[data-slot="card"]').filter({ hasText: 'Revisión del documento' }).first();
    await uploadedReviewPanel
      .getByPlaceholder('Observación de devolución (opcional al aprobar)')
      .fill('E2E: actualizar el archivo con la versión vigente.');
    await uploadedReviewPanel.getByRole('button', { name: 'Devolver' }).click({ force: true });
    await expect(rectorPage.getByText('Devuelto').first()).toBeVisible({ timeout: 10000 });
    await qaPage.goto(`/dashboard/documents/${uploadDocId}`);
    await qaPage.getByRole('button', { name: 'Actualizar archivo' }).click({ force: true });
    const replaceDialog = qaPage.getByRole('dialog');
    await replaceDialog.getByLabel('Nuevo archivo *').setInputFiles(replacementPdf);
    await replaceDialog.getByRole('button', { name: 'Actualizar' }).click({ force: true });
    await expect(replaceDialog).toHaveCount(0, { timeout: 10000 });
    await expect(qaPage.getByText('Devuelto').first()).toBeVisible({ timeout: 10000 });
    await expect(qaPage.getByText('Versión actualizada').first()).toBeVisible();

    const afterUpdate = await (await qaApi.get(`${API_BASE_URL}/documents/${uploadDocId}`)).json();
    expect(afterUpdate.review?.status).toBe('CHANGES_REQUESTED');
    expect(afterUpdate.review?.documentVersionId).toBe(2);
    const resubmitPanel = qaPage
      .locator('[data-slot="card"]')
      .filter({ hasText: 'Revisión del documento' })
      .first();
    await pickReviewer(resubmitPanel);
    await resubmitPanel
      .getByRole('button', { name: 'Enviar a revisión' })
      .click();
    await expect
      .poll(
        async () =>
          (await (await qaApi.get(`${API_BASE_URL}/documents/${uploadDocId}`)).json())
            .review?.status,
        { timeout: 15000 },
      )
      .toBe('IN_REVIEW');
    await rectorPage.goto(`/dashboard/documents/${uploadDocId}`);
    const finalReviewPanel = rectorPage.locator('[data-slot="card"]').filter({ hasText: 'Revisión del documento' }).first();
    await finalReviewPanel.getByRole('button', { name: 'Aprobar' }).click({ force: true });
    await expect(rectorPage.getByText('Aprobado').first()).toBeVisible({ timeout: 10000 });
    await qaPage.goto(`/dashboard/documents/${uploadDocId}`);
    const archivePanel = qaPage.locator('[data-slot="card"]').filter({ hasText: 'Revisión del documento' }).first();
    await archivePanel.getByRole('button', { name: 'Archivar' }).click({ force: true });
    const archiveUploadDialog = qaPage.getByRole('dialog');
    await archiveUploadDialog.getByRole('button', { name: 'Archivar' }).click({ force: true });
    await expect
      .poll(
        async () =>
          (await (await qaApi.get(`${API_BASE_URL}/documents/${uploadDocId}`)).json())
            .review?.status,
        { timeout: 10000 },
      )
      .toBe('ARCHIVED');
    const archivedUpload = await (await qaApi.get(`${API_BASE_URL}/documents/${uploadDocId}`)).json();
    expect(archivedUpload.archivedAt).toBeTruthy();
    // 6. Notifications and traceability for the reviewer.
    const notificationAuth = await getAccessToken(
      request,
      SEED_USERS.rector.email,
      SEED_USERS.rector.password,
    );
    const notificationApi = await createAuthenticatedApiContext(
      notificationAuth.token,
    );
    const notificationsResponse = await notificationApi.get(
      `${API_BASE_URL}/notifications?filter=unread&limit=50`,
    );
    const notifications = await notificationsResponse.json();
    expect(
      notifications.data.some(
        (notification: any) =>
          notification.document?.id === editorId &&
          notification.actorName === QA_NAME &&
          notification.title,
      ),
    ).toBe(true);
  } finally {
    for (const id of [editorId, templateDocId, uploadDocId].filter(Boolean)) {
      await qaApi.delete(`${API_BASE_URL}/documents/${id}`).catch(() => undefined);
    }
    await adminApi.delete(`${API_BASE_URL}/users/${qaUser.id}`, { data: { reason: 'E2E journey cleanup' } }).catch(() => undefined);
    await qaContext.close();
    await rectorContext.close();
  }
});
