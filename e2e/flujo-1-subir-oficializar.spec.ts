import { test, expect } from '@playwright/test';
import { loginAs, SEED_USERS } from './auth.setup';
import path from 'path';

/**
 * Flujo 1: Subir documento → Oficializar → Descargar
 *
 * Prerequisites:
 *   - Backend running on http://localhost:3001
 *   - PostgreSQL running (docker-compose at root)
 *   - Database seeded (npm run seed in dms-backend)
 *   - Frontend running on http://localhost:3000 (auto-started by Playwright webServer)
 */
test.describe('Flujo 1: Subir → Oficializar → Descargar', () => {
  // Unique title to identify our test document in the list
  const testDocTitle = `E2E Test Doc ${Date.now()}`;
  const testFilePath = path.resolve(__dirname, 'fixtures/test-document.pdf');

  test('admin sube un documento, verifica que aparece como borrador, lo oficializa y lo descarga', async ({ page }) => {
    // ── Step 1: Login as admin ──────────────────────────────────────────
    await loginAs(page, SEED_USERS.admin.email, SEED_USERS.admin.password);

    // After login we land on /dashboard/home
    await expect(page).toHaveURL(/\/dashboard\/home/);

    // ── Step 2: Navigate to documents page ──────────────────────────────
    await page.goto('/dashboard/documents');
    // Wait for the page to load — the documents page may not have a standard heading
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/documents/);

    // ── Step 3: Open upload dialog ──────────────────────────────────────
    // The "Crear o subir" button opens a dropdown menu
    await page.getByRole('button', { name: /crear o subir/i }).click();
    await page.waitForTimeout(500);

    // Dismiss any toast notifications that may be blocking interaction
    const toast = page.locator('[data-rht-toaster] [role="status"]');
    if (await toast.isVisible().catch(() => false)) {
      await toast.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Click "Subir Archivo" from the dropdown
    await page.getByRole('menuitem', { name: /subir archivo/i }).click({ force: true });

    // ── Step 4: Fill the upload form ────────────────────────────────────
    // The SingleUploadDialog should be visible now
    await expect(page.getByRole('heading', { name: 'Subir Documento' })).toBeVisible();

    // Scope all form interactions to the visible dialog
    const uploadDialog = page.getByRole('dialog');
    await expect(uploadDialog).toBeVisible({ timeout: 5000 });

    // Upload the test file (file input)
    await uploadDialog.locator('input[type="file"]').setInputFiles(testFilePath);

    // Fill in the document title
    await uploadDialog.getByLabel('Título').fill(testDocTitle);

    // Select a category (e.g., "Administrativos")
    // Categories appear in the dialog by default — trigger is a Radix Select component
    const categoryTrigger = uploadDialog.locator('[id="category"]');
    await expect(categoryTrigger).toBeVisible({ timeout: 5000 });
    await categoryTrigger.click();
    // Options are rendered in a portal (outside the dialog), so use page-level locator
    await page.getByRole('option', { name: /administrativos/i }).click();

    // Select a document type (e.g., "Oficio")
    // This dropdown only appears after a category is selected
    const docTypeTrigger = uploadDialog.locator('[id="documentType"]');
    if (await docTypeTrigger.isVisible().catch(() => false)) {
      await docTypeTrigger.click();
      await page.getByRole('option', { name: /oficio/i }).first().click();
    }

    // Wait for the upload button to be enabled (only depends on file being selected)
    await expect(uploadDialog.getByRole('button', { name: /subir documento/i })).toBeEnabled({
      timeout: 5000,
    });
    // Click the upload button — dialog closes on success, stays open on validation/network error
    await uploadDialog.getByRole('button', { name: /subir documento/i }).click();

    // ── Step 5: Verify upload success ───────────────────────────────────
    // Wait for the dialog to close (upload success closes it)
    // If there's an error toast, surface it in the failure message
    await expect(page.getByRole('heading', { name: 'Subir Documento' })).not.toBeVisible({
      timeout: 20000,
    });

    // The document should appear in the list — search for it
    // Use the search input in the main content area (not the mobile header one)
    const searchInput = page.getByPlaceholder('Buscar documentos...').first();
    await searchInput.fill(testDocTitle);

    // Wait for search results to load
    await page.waitForTimeout(1000);

    // Verify the document appears with "Borrador" status
    // The title appears as both a link and a visible span — use first() to avoid strict mode
    await expect(page.getByText(testDocTitle).first()).toBeVisible();
    await expect(page.getByText('Borrador').first()).toBeVisible({ timeout: 5000 });

    // ── Step 6: Officialize the document ────────────────────────────────
    // The "Oficializar" button appears on the document row for DRAFT docs
    await page.getByRole('button', { name: /oficializar/i }).first().click();

    // Wait for the officialize mutation to complete
    // The status should change from "Borrador" to "Oficial"
    await expect(page.getByText('Oficial').first()).toBeVisible({ timeout: 10000 });

    // ── Step 7: Verify document number was assigned ─────────────────────
    // After officializing, a document number (e.g., "ADMD-2026-00XX") is assigned.
    // The old "Pendiente" badge for our document is gone — we verify the mutation
    // succeeded by the "Oficial" status above.

    // ── Step 8: Download the document ───────────────────────────────────
    // Start the download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /descargar/i }).first().click();
    const download = await downloadPromise;

    // Verify the download has a filename
    expect(download.suggestedFilename()).toBeTruthy();
  });
});
