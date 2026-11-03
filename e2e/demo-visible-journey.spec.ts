import { randomBytes, randomUUID } from 'crypto';
import { errors, expect, test, type Page } from '@playwright/test';

function loopbackOrigin(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a loopback HTTP origin`); }
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be a loopback HTTP origin without credentials or a path`);
  }
  return url.origin;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

// El archivo ficticio se genera en memoria y no requiere archivos externos.
function fictionalPdf(): Buffer {
  const stream = 'BT /F1 14 Tf 30 80 Td (Fictional demo document) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/auth/login`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
}

test('visible fictional user and document journey', async ({ browser }) => {
  let stage = 'prerequisites';
  let failure: string | undefined;
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let userContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    const frontend = loopbackOrigin(process.env.DEMO_BASE_URL, 'DEMO_BASE_URL');
    const api = loopbackOrigin(process.env.DEMO_API_ORIGIN, 'DEMO_API_ORIGIN');
    const adminEmail = required('DEMO_ADMIN_EMAIL');
    const adminPassword = required('DEMO_ADMIN_PASSWORD');
    const role = required('DEMO_ROLE_LABEL');
    if (process.env.DEMO_ISOLATION_CONFIRMED !== 'yes') {
      throw new Error('Independent disposable environment verification is required');
    }

    const id = randomUUID();
    const name = `Demo ${id}`;
    const email = `demo-${id}@example.test`;
    const password = `Demo-${randomBytes(18).toString('hex')}!`;
    const filename = `demo-${id}.pdf`;
    stage = 'administrator session setup';
    context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return [frontend, api].includes(url.origin) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    stage = 'administrator login';
    await login(page, frontend, adminEmail, adminPassword);
    stage = 'user creation';
    await page.goto(`${frontend}/dashboard/users`);
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#new-name').fill(name);
    await dialog.locator('#new-email').fill(email);
    await dialog.locator('#new-password').fill(password);
    await expect(dialog.locator('#new-role')).toBeEnabled();
    await dialog.locator('#new-role').selectOption({ label: role });
    await dialog.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: email })).toBeVisible();

    // Una sesión nueva demuestra el acceso del usuario, no un traspaso automático.
    stage = 'user session setup';
    userContext = await browser.newContext({ serviceWorkers: 'block' });
    await userContext.route('**/*', route => {
      const url = new URL(route.request().url());
      return [frontend, api].includes(url.origin) ? route.continue() : route.abort();
    });
    const userPage = await userContext.newPage();
    stage = 'user login';
    await login(userPage, frontend, email, password);
    stage = 'document upload';
    await userPage.goto(`${frontend}/dashboard/documents`);
    await userPage.getByRole('button', { name: /^nuevo$/i }).click();
    await userPage.getByRole('menuitem', { name: /subir archivo/i }).click();
    const upload = userPage.getByRole('dialog');
    await upload.locator('input[type=file]').setInputFiles({ name: filename, mimeType: 'application/pdf', buffer: fictionalPdf() });
    const responsePromise = userPage.waitForResponse(response => response.url().endsWith('/api/documents/upload') && response.request().method() === 'POST');
    await upload.getByRole('button', { name: 'Subir Documento', exact: true }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const document = await response.json() as { id: number };
    expect(Number.isSafeInteger(document.id) && document.id > 0).toBeTruthy();
    await expect(upload).not.toBeVisible();
    stage = 'document details and history';
    await userPage.goto(`${frontend}/dashboard/documents/${document.id}`);
    await expect(userPage.getByRole('heading', { name: filename })).toBeVisible();
    await expect(userPage.getByText(name, { exact: true }).first()).toBeVisible();
    await expect(userPage.getByText('Versión actual')).toBeVisible();
    // El menú de acciones no tiene nombre accesible; se identifica por su ubicación.
    await userPage.locator('button:has(svg.lucide-ellipsis-vertical)').click();
    await userPage.getByRole('menuitem', { name: 'Historial de versiones' }).click();
    await expect(userPage.getByRole('dialog').getByText('Versión 1', { exact: true })).toBeVisible();
    await userPage.keyboard.press('Escape');
    await expect(userPage.getByRole('dialog')).not.toBeVisible();
    await userPage.locator('button:has(svg.lucide-ellipsis-vertical)').click();
    await userPage.getByRole('menuitem', { name: 'Registro de actividad' }).click();
    stage = 'creation activity and reload';
    await expect(userPage.getByRole('heading', { name: 'Registro de actividad' })).toBeVisible();
    await expect(userPage.getByText('Creación', { exact: true })).toBeVisible();
    await userPage.reload();
    await expect(userPage.getByRole('heading', { name: 'Registro de actividad' })).toBeVisible();
    await expect(userPage.getByText('Creación', { exact: true })).toBeVisible();
  } catch (error) {
    // Evita imprimir valores de formularios o credenciales en errores de Playwright.
    const category = stage === 'prerequisites' ? 'prerequisite failure' :
      error instanceof errors.TimeoutError ? 'timeout' : 'operation or assertion failure';
    failure = `Demo failed at ${stage}: ${category}.`;
  } finally {
    for (const session of [userContext, context]) {
      try { await session?.close(); } catch {
        failure = `${failure ? `${failure} ` : ''}Browser context closure failed.`;
      }
    }
  }
  if (failure) throw new Error(failure);
});
