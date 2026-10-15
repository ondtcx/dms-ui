import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import fs from 'fs';

test('active catalog role creation persists without implicit profesor; inactive role rejects atomically', async ({ page }) => {
  const runId = process.env.CATALOG_E2E_RUN_ID!;
  const root = process.env.CATALOG_E2E_ROOT!;
  const url = new URL(process.env.DATABASE_URL!);
  const pidFile = path.join(root, 'pgdata/postmaster.pid');
  if (!root.endsWith('catalog-role-' + runId) || url.hostname !== '127.0.0.1' ||
      url.port !== '55433' || url.pathname !== '/catalog_e2e' || !existsSync(pidFile)) {
    throw new Error('Disposable database boundary rejected');
  }
  process.kill(Number(readFileSync(pidFile, 'utf8').split('\n')[0]), 0);
  const originalRead = fs.readFileSync;
  fs.readFileSync = new Proxy(originalRead, { apply(target, receiver, args) {
    if (/(^|[\\/])\.env(?:\.|$)/.test(String(args[0]))) {
      throw Object.assign(new Error('Environment file access disabled'), { code: 'ENOENT' });
    }
    return Reflect.apply(target, receiver, args);
  } });
  const backendRequire = createRequire(path.resolve(__dirname, '../../dms-backend/package.json'));
  const { PrismaClient } = backendRequire('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const createdEmail = 'created-' + runId + '@example.test';
  const rejectedEmail = 'rejected-' + runId + '@example.test';
  await page.context().route('**/*', route => {
    const target = new URL(route.request().url());
    return ['http://127.0.0.1:3100', 'http://127.0.0.1:3101'].includes(target.origin)
      ? route.continue() : route.abort();
  });
  try {
    await page.goto('/auth/login');
    await page.locator('#email').fill(process.env.CATALOG_E2E_ADMIN_EMAIL!);
    await page.locator('#password').fill(process.env.CATALOG_E2E_PASSWORD!);
    const login = page.waitForResponse(response => response.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    expect((await login).status()).toBe(200);
    await expect(page).toHaveURL(/dashboard/);
    await page.goto('/dashboard/users');
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const roleSelect = dialog.locator('#new-role');
    await expect(roleSelect).toBeEnabled();
    const active = await prisma.role.findUniqueOrThrow({ where: { key: 'e2e_inspector_true_' + runId } });
    const inactive = await prisma.role.findUniqueOrThrow({ where: { key: 'e2e_inspector_false_' + runId } });
    expect(active.legacyRole).toBeNull();
    await expect(roleSelect.locator('option', { hasText: /^Inspector General$/ })).toHaveCount(1);
    await expect(roleSelect.locator('option', { hasText: 'Inactive Inspector General' })).toHaveCount(0);
    await dialog.locator('#new-name').fill('E2E catalog inspector');
    await dialog.locator('#new-email').fill(createdEmail);
    await dialog.locator('#new-password').fill(process.env.CATALOG_E2E_PASSWORD!);
    const submit = dialog.getByRole('button', { name: 'Crear usuario', exact: true });
    await expect(roleSelect).toHaveValue('');
    await expect(submit).toBeDisabled();
    await roleSelect.selectOption(String(active.id));
    await expect(submit).toBeEnabled();
    const creation = page.waitForResponse(response => response.url().endsWith('/api/users') && response.request().method() === 'POST');
    await submit.click();
    const response = await creation;
    const payload = response.request().postDataJSON();
    expect(payload.catalogRoleId).toBe(active.id);
    expect(Object.hasOwn(payload, 'role')).toBe(false);
    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created.role).toBe('user');
    expect(created.catalogRoles.map((role: { id: number }) => role.id)).toEqual([active.id]);
    const token = (await page.context().cookies()).find(cookie => cookie.name === 'token')!.value;
    const headers = { Authorization: 'Bearer ' + token };
    const apiUser = await page.request.get('http://127.0.0.1:3101/api/users/' + created.id, { headers });
    expect(apiUser.status()).toBe(200);
    const projection = await apiUser.json();
    expect(projection.role).toBe('user');
    expect(projection.catalogRoles.map((role: { id: number }) => role.id)).toEqual([active.id]);
    const persisted = await prisma.user.findUniqueOrThrow({ where: { email: createdEmail }, include: { roleAssignments: { include: { role: true } } } });
    expect(persisted.role).toBe('user');
    expect(persisted.roleAssignments.map((assignment: { roleId: number }) => assignment.roleId)).toEqual([active.id]);
    expect(persisted.roleAssignments.some((assignment: { role: { key: string } }) => assignment.role.key === 'profesor')).toBe(false);
    const rejected = await page.request.post('http://127.0.0.1:3101/api/users', { headers, data: {
      name: 'E2E rejected inspector', email: rejectedEmail, password: process.env.CATALOG_E2E_PASSWORD!, catalogRoleId: inactive.id,
    } });
    expect(rejected.status()).toBe(403);
    expect(await prisma.user.count({ where: { email: rejectedEmail } })).toBe(0);
    console.log('Creation payload, API projection, database baseline/custom assignment, inactive rejection/no orphan: PASS');
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: createdEmail });
    await expect(row.getByText('Inspector General', { exact: true })).toBeVisible();
    await expect(row.getByText('Usuario', { exact: true })).toBeVisible();
    await row.getByRole('button').nth(1).click();
    await expect(page.getByRole('dialog').getByText('Inspector General', { exact: true })).toBeVisible();
    await expect(page.locator('#edit-role')).toContainText('Usuario');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    console.log('Reloaded list and edit-dialog labels: PASS; browser capture disabled');
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: [createdEmail, rejectedEmail] } } });
    await prisma.$disconnect();
    fs.readFileSync = originalRead;
  }
});
