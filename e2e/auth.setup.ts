import { APIRequestContext, BrowserContext, Page, request } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Shared auth helpers for E2E tests.
 *
 * Seed credentials (from dms-backend/prisma/seed.ts):
 *   Password for ALL users: Demo123!
 *
 * Key test users:
 *   - admin@colegio.edu          → ADMIN
 *   - rector@colegio.edu         → RECTOR
 *   - coord.primaria@colegio.edu → COORDINADOR
 *   - secretaria@colegio.edu     → SECRETARIO
 *   - maestro.1p@colegio.edu     → PROFESOR
 *   - prof.matematica@colegio.edu → PROFESOR
 */

export const SEED_USERS = {
  admin: { email: 'admin@colegio.edu', password: 'Demo123!', role: 'ADMIN' },
  rector: { email: 'rector@colegio.edu', password: 'Demo123!', role: 'RECTOR' },
  coordinador: { email: 'coord.primaria@colegio.edu', password: 'Demo123!', role: 'COORDINADOR' },
  secretario: { email: 'secretaria@colegio.edu', password: 'Demo123!', role: 'SECRETARIO' },
  profesor: { email: 'maestro.1p@colegio.edu', password: 'Demo123!', role: 'PROFESOR' },
} as const;

/**
 * Log in through the UI form.
 * Navigates to /auth/login, fills credentials, submits, and waits for redirect.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth/login');

  // Fill email field (label: "Correo electrónico", id="email")
  await page.getByLabel('Correo electrónico').fill(email);

  // Fill password field (label: "Contraseña", id="password")
  await page.getByLabel('Contraseña').fill(password);

  // Submit the form (button text: "Ingresar")
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Wait for redirect to dashboard (login redirects to /dashboard, which then redirects to /dashboard/home)
  await page.waitForURL('**/dashboard*', { timeout: 15000 });
}

/**
 * Log in via API to bypass the UI login form.
 * Faster and more reliable for tests that don't need to test the login flow itself.
 * Sets the JWT token cookie directly.
 */
export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Call the backend login API directly
  const response = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  const token = body.access_token;

  // Set the same cookies the frontend auth service sets
  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Strict',
    },
    {
      name: 'user',
      value: JSON.stringify(body.user),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Strict',
    },
  ]);
}

export async function getAccessToken(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; email: string; role: string } }> {
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return { token: body.access_token, user: body.user };
}

export async function createAuthenticatedApiContext(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

export async function setAuthCookies(
  context: BrowserContext,
  token: string,
  user: Record<string, unknown>,
): Promise<void> {
  await context.addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Strict' },
    { name: 'user', value: JSON.stringify(user), domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Strict' },
  ]);
}
