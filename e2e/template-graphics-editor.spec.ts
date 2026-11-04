import { expect, test, type APIRequestContext } from '@playwright/test';
import { loginViaApi, SEED_USERS } from './auth.setup';

const API = 'http://localhost:3001/api';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#7cb342"/></svg>',
  'utf8',
);

async function uploadFromInput(
  page: import('@playwright/test').Page,
  testId: string,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/authoring/assets') &&
      response.request().method() === 'POST',
  );
  await page.locator(`[data-testid="${testId}"]`).setInputFiles(file);
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{
    url: string;
    filename: string;
    mimeType: string;
  }>;
}

async function createStandardTemplate(
  request: APIRequestContext,
  headers: Record<string, string>,
  name: string,
) {
  const response = await request.post(`${API}/authoring/templates`, {
    headers,
    data: {
      name,
      description: 'Plantilla temporal para el editor gráfico.',
      bodyHtml:
        '<div class="doc">\n  {{> institutionHeader}}\n  <div class="doc-title">{{documento.tipo}}</div>\n  <div class="meta"><span>{{documento.fecha}}</span><span>{{documento.numero}}</span></div>\n  <div class="content">\n    {{{contenido}}}\n  </div>\n</div>',
      styles:
        '.doc { font-family: Arial, sans-serif; font-size: 11pt; }\n.doc-title { text-align: center; font-weight: 700; }\n.content { text-align: justify; }',
      fields: {
        fields: [
          {
            key: 'documento.asunto',
            label: 'Asunto',
            type: 'text',
            required: true,
          },
          {
            key: 'contenido',
            label: 'Contenido',
            type: 'richtext',
            required: true,
          },
        ],
      },
      pageSize: 'A4',
      orientation: 'portrait',
      numberPrefix: 'GRA',
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('Editor gráfico de plantillas', () => {
  test.setTimeout(180_000);

  test('sube imágenes y fondos a un encabezado visual de plantilla estándar', async ({
    page,
    request,
  }) => {
    const marker = Date.now();
    const login = await request.post(`${API}/auth/login`, {
      data: {
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      },
    });
    const { access_token: token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };
    const template = await createStandardTemplate(
      request,
      headers,
      `Plantilla gráfica E2E ${marker}`,
    );

    try {
      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(
        `/dashboard/elaboracion/plantillas/${template.id}/diseno`,
      );

      await page.getByRole('button', { name: 'Marco', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Empezar en blanco' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Diseñar visualmente' })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Diseñar', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0, {
        timeout: 10_000,
      });

      const institutionBox = page.locator(
        '[data-frame-canvas] [data-box-id="institution"]',
      );
      await expect(institutionBox).toBeVisible();
      await institutionBox.scrollIntoViewIfNeeded();
      const institutionBounds = await institutionBox.boundingBox();
      expect(institutionBounds).not.toBeNull();
      await page.mouse.move(
        institutionBounds!.x + institutionBounds!.width / 2,
        institutionBounds!.y + institutionBounds!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        institutionBounds!.x + institutionBounds!.width / 2 + 24,
        institutionBounds!.y + institutionBounds!.height / 2 + 4,
        { steps: 5 },
      );
      await page.mouse.up();
      const imageAsset = await uploadFromInput(
        page,
        'add-image-encabezado',
        { name: 'logo.png', mimeType: 'image/png', buffer: PNG },
      );
      await expect(page.getByText(/image · image-/).first()).toBeVisible({
        timeout: 20_000,
      });

      const cropResponse = await request.post(
        `${API}/authoring/assets/crop`,
        {
          headers,
          data: {
            url: imageAsset.url,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
          },
        },
      );
      expect(cropResponse.ok()).toBeTruthy();
      expect((await cropResponse.json()).url).toMatch(/\.png$/);

      const backgroundAsset = await uploadFromInput(
        page,
        'add-background-encabezado',
        { name: 'fondo.svg', mimeType: 'image/svg+xml', buffer: SVG },
      );
      expect(backgroundAsset.mimeType).toBe('image/png');
      expect(backgroundAsset.url).toMatch(/\.png$/);
      await expect(
        page.getByRole('button', { name: 'Quitar fondo' }).first(),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Guardar borrador' }).click();
      await expect(
        page.getByText('Versión borrador creada. Publícala para aplicarla.'),
      ).toBeVisible({ timeout: 20_000 });

      const currentResponse = await request.get(
        `${API}/authoring/templates/${template.id}`,
        { headers },
      );
      expect(currentResponse.ok()).toBeTruthy();
      const current = await currentResponse.json();
      const latest = current.versions[0];
      expect(latest.pageFrame?.header?.boxes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'image', content: imageAsset.url }),
        ]),
      );
      expect(latest.pageFrame?.header?.backgroundSvg).toContain(
        backgroundAsset.url,
      );
      const institution = latest.pageFrame?.header?.boxes?.find(
        (box: any) => box.id === 'institution',
      );
      expect(institution?.x).toBeGreaterThan(235.5);
      expect(latest.headerHtml).toContain(imageAsset.url);
      expect(latest.headerHtml).toContain(backgroundAsset.url);

      await page.getByRole('button', { name: 'Guardar y publicar' }).click();
      await expect(
        page.getByText('Contenido guardado y publicado.'),
      ).toBeVisible({ timeout: 20_000 });

      const preview = await request.get(
        `${API}/authoring/templates/${template.id}/preview`,
        { headers, params: { versionId: latest.id } },
      );
      expect(preview.ok()).toBeTruthy();
      expect((await preview.body()).length).toBeGreaterThan(1_000);
    } finally {
      await request.post(
        `${API}/authoring/templates/${template.id}/deactivate`,
        { headers, data: {} },
      );
    }
  });

  test('sube imágenes y fondo al editor simple de un acta', async ({
    page,
    request,
  }) => {
    const marker = Date.now();
    const login = await request.post(`${API}/auth/login`, {
      data: {
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      },
    });
    const { access_token: token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };

    const oficioResponse = await request.get(
      `${API}/authoring/templates/61`,
      { headers },
    );
    expect(oficioResponse.ok()).toBeTruthy();
    const oficio = await oficioResponse.json();
    const oficioVersion = oficio.versions.find(
      (version: any) => version.status === 'PUBLISHED',
    );
    expect(oficioVersion).toBeTruthy();

    const createResponse = await request.post(`${API}/authoring/templates`, {
      headers,
      data: {
        name: `Acta gráfica E2E ${marker}`,
        description: 'Plantilla temporal para el editor gráfico del acta.',
        bodyHtml: oficioVersion.bodyHtml,
        styles: oficioVersion.styles,
        headerHtml: oficioVersion.headerHtml,
        footerHtml: oficioVersion.footerHtml,
        marginTop: oficioVersion.marginTop,
        marginBottom: oficioVersion.marginBottom,
        marginLeft: oficioVersion.marginLeft,
        marginRight: oficioVersion.marginRight,
        pageFrame: oficioVersion.pageFrame,
        signatures: oficioVersion.signatures,
        fields: oficioVersion.fields,
        pageSize: oficioVersion.pageSize,
        orientation: oficioVersion.orientation,
        numberPrefix: 'GRA',
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const template = await createResponse.json();
    const draft = template.versions[0];
    const publish = await request.post(
      `${API}/authoring/templates/${template.id}/versions/${draft.id}/publish`,
      { headers, data: {} },
    );
    expect(publish.ok()).toBeTruthy();

    try {
      await loginViaApi(page, SEED_USERS.admin.email, SEED_USERS.admin.password);
      await page.goto(
        `/dashboard/elaboracion/plantillas/${template.id}/diseno`,
      );
      await expect(
        page.getByRole('button', { name: 'Simple', exact: true }),
      ).toBeVisible({ timeout: 20_000 });

      const imageAsset = await uploadFromInput(page, 'simple-add-image', {
        name: 'sello.png',
        mimeType: 'image/png',
        buffer: PNG,
      });
      await expect(
        page.getByRole('button', { name: 'Cambiar imagen' }),
      ).toBeVisible({ timeout: 20_000 });

      const backgroundAsset = await uploadFromInput(
        page,
        'simple-add-background',
        { name: 'fondo- acta.svg', mimeType: 'image/svg+xml', buffer: SVG },
      );
      expect(backgroundAsset.mimeType).toBe('image/png');
      expect(backgroundAsset.url).toMatch(/\.png$/);
      await expect(
        page.getByRole('button', { name: 'Quitar fondo' }).first(),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Guardar borrador' }).click();
      await expect(
        page.getByText('Versión borrador creada. Publícala para aplicarla.'),
      ).toBeVisible({ timeout: 20_000 });

      const currentResponse = await request.get(
        `${API}/authoring/templates/${template.id}`,
        { headers },
      );
      expect(currentResponse.ok()).toBeTruthy();
      const current = await currentResponse.json();
      const latest = current.versions[0];
      expect(latest.pageFrame?.body?.boxes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'image', content: imageAsset.url }),
        ]),
      );
      expect(latest.pageFrame?.body?.backgroundSvg).toContain(
        backgroundAsset.url,
      );

      const preview = await request.get(
        `${API}/authoring/templates/${template.id}/preview`,
        { headers, params: { versionId: latest.id } },
      );
      expect(preview.ok()).toBeTruthy();
      expect((await preview.body()).length).toBeGreaterThan(1_000);
    } finally {
      await request.post(
        `${API}/authoring/templates/${template.id}/deactivate`,
        { headers, data: {} },
      );
    }
  });
});
