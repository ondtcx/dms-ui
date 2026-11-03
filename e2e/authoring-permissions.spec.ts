import { expect, test } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

test.describe('Permisos de elaboración documental', () => {
  test.setTimeout(120_000);

  test('respeta el modo lectura y muestra los permisos configurables', async ({
    page,
  }) => {
    await loginViaApi(
      page,
      SEED_USERS.profesor.email,
      SEED_USERS.profesor.password,
    );
    await page.goto('/dashboard/elaboracion');
    await expect(
      page.getByRole('heading', { name: 'Elaboración documental' }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('link', { name: /Nueva plantilla/ }),
    ).toHaveCount(0);

    await page.goto('/dashboard/elaboracion/plantillas/61');
    await expect(page.getByText('Oficio institucional').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('link', { name: /Editar diseño/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: /Nueva versión/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Duplicar', exact: true }),
    ).toHaveCount(0);

    await page.goto('/dashboard/elaboracion/plantillas/61/diseno');
    await expect(
      page.getByText(/No tienes permiso para diseñar plantillas/),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: 'Guardar diseño', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Guardar y publicar', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Agregar texto' }),
    ).toBeDisabled();

    await loginViaApi(
      page,
      SEED_USERS.admin.email,
      SEED_USERS.admin.password,
    );
    await page.goto('/dashboard/settings?section=roles');
    await expect(
      page.getByText('Elaboración documental', { exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText('Diseñar plantillas de elaboración documental', {
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText('Publicar versiones de plantillas de elaboración', {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });
});

test.describe('Rol diseñador sin publicación', () => {
  test.setTimeout(120_000);

  test('puede guardar un diseño pero no publicarlo', async ({ page, request }) => {
    const API = 'http://localhost:3001/api';
    const login = await request.post(`${API}/auth/login`, {
      data: {
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      },
    });
    const { access_token: adminToken } = await login.json();
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const oficioResponse = await request.get(`${API}/authoring/templates/61`, {
      headers: adminHeaders,
    });
    const oficio = await oficioResponse.json();
    const oficioVersion = oficio.versions.find(
      (version: any) => version.status === 'PUBLISHED',
    );
    const createResponse = await request.post(`${API}/authoring/templates`, {
      headers: adminHeaders,
      data: {
        name: `Prueba diseñador E2E ${Date.now()}`,
        description: 'Plantilla temporal para permisos de diseñador.',
        bodyHtml: oficioVersion.bodyHtml,
        fields: oficioVersion.fields,
        pageFrame: oficioVersion.pageFrame,
        pageSize: 'Letter',
        orientation: 'portrait',
        numberPrefix: 'TST',
      },
    });
    const template = await createResponse.json();
    const firstVersion = template.versions[0];
    await request.post(
      `${API}/authoring/templates/${template.id}/versions/${firstVersion.id}/publish`,
      { headers: adminHeaders, data: {} },
    );

    try {
      await loginViaApi(
        page,
        SEED_USERS.secretario.email,
        SEED_USERS.secretario.password,
      );
      await page.goto(`/dashboard/elaboracion/plantillas/${template.id}/diseno`);
      await expect(
        page.getByRole('button', { name: 'Guardar diseño', exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole('button', { name: 'Guardar y publicar', exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Guardar diseño', exact: true })
        .click();
      await page.waitForURL(
        new RegExp(`/dashboard/elaboracion/plantillas/${template.id}$`),
        { timeout: 45_000 },
      );
      await expect(
        page.getByRole('button', { name: 'Publicar', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Versión creada', { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });

      const secretaryLogin = await request.post(`${API}/auth/login`, {
        data: {
          email: SEED_USERS.secretario.email,
          password: SEED_USERS.secretario.password,
        },
      });
      const { access_token: secretaryToken } = await secretaryLogin.json();
      const draftResponse = await request.get(
        `${API}/authoring/templates/${template.id}`,
        { headers: { Authorization: `Bearer ${secretaryToken}` } },
      );
      const draftTemplate = await draftResponse.json();
      const draft = draftTemplate.versions.find(
        (version: any) => version.status === 'DRAFT',
      );
      expect(draft).toBeTruthy();
      const publishResponse = await request.post(
        `${API}/authoring/templates/${template.id}/versions/${draft.id}/publish`,
        {
          headers: { Authorization: `Bearer ${secretaryToken}` },
          data: {},
        },
      );
      expect(publishResponse.status()).toBe(403);
    } finally {
      await request.post(
        `${API}/authoring/templates/${template.id}/deactivate`,
        { headers: adminHeaders, data: {} },
      );
    }
  });
});
