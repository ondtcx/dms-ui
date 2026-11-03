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
      page.getByText('Diseñar plantillas de elaboración documental', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Publicar versiones de plantillas de elaboración', {
        exact: true,
      }),
    ).toBeVisible();
  });
});
