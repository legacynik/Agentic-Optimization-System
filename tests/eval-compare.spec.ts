import { test, expect } from './fixtures';

/**
 * T9 - Eval A/B Compare Enhancement Tests
 * Tests model/token comparison, Config tab, cross-test-run compare, and snapshot diff display.
 */

test.describe('Eval Compare - Config Tab', () => {
  test.skip('should show Config tab in comparison dialog', async ({ page }) => {
    await page.goto('/evaluations');

    // Select two evaluations for comparison
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Open comparison
    await page.getByRole('button', { name: /compare/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Verify all 4 tabs exist
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /criteria/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /per persona/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /config/i })).toBeVisible();
  });

  test.skip('should display model comparison in Config tab', async ({ page }) => {
    await page.goto('/evaluations');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: /compare/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Navigate to Config tab
    await page.getByRole('tab', { name: /config/i }).click();

    // Verify model comparison cards
    await expect(page.getByText('Evaluation A')).toBeVisible();
    await expect(page.getByText('Evaluation B')).toBeVisible();

    // Verify model/token labels are present
    await expect(page.getByText(/Model:/)).toBeVisible();
    await expect(page.getByText(/Tokens:/)).toBeVisible();

    // Verify same/different model badge
    const modelBadge = page.getByText(/Same Model|Different Models/);
    await expect(modelBadge).toBeVisible();
  });

  test.skip('should display criteria snapshot diff when available', async ({ page }) => {
    await page.goto('/evaluations');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: /compare/i }).click();
    await page.getByRole('tab', { name: /config/i }).click();

    // If snapshot diff is available, verify its display
    const snapshotDiff = page.getByText('Criteria Snapshot Diff');
    if (await snapshotDiff.count() > 0) {
      await expect(snapshotDiff).toBeVisible();
      // Check for identical/changed badge
      await expect(page.getByText(/Identical|Changed/)).toBeVisible();
    }
  });
});

test.describe('Eval Compare - Cross Test Run', () => {
  test.skip('should show cross-compare input when one evaluation is selected', async ({ page }) => {
    await page.goto('/evaluations');

    // Select one evaluation
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();

    // Verify cross-compare input appears
    await expect(page.getByPlaceholder(/paste evaluation id/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cross compare/i })).toBeVisible();
  });

  test.skip('should disable cross-compare button when no ID is entered', async ({ page }) => {
    await page.goto('/evaluations');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();

    // Button should be disabled with empty input
    const crossCompareBtn = page.getByRole('button', { name: /cross compare/i });
    await expect(crossCompareBtn).toBeDisabled();
  });

  test.skip('should open cross-compare dialog with valid external ID', async ({ page }) => {
    await page.goto('/evaluations');

    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();

    // Enter an external evaluation ID
    const input = page.getByPlaceholder(/paste evaluation id/i);
    await input.fill('some-valid-uuid');

    // Button should be enabled
    const crossCompareBtn = page.getByRole('button', { name: /cross compare/i });
    await expect(crossCompareBtn).toBeEnabled();

    // Click cross compare
    await crossCompareBtn.click();

    // Verify comparison dialog opens (may show error if UUID is invalid, but dialog should open)
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Eval Compare API - Cross Compare', () => {
  test.skip('cross-compare endpoint should reject missing params', async ({ request }) => {
    const response = await request.get('/api/evaluations/cross-compare');
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  test.skip('cross-compare endpoint should reject same ID', async ({ request }) => {
    const id = '00000000-0000-0000-0000-000000000001';
    const response = await request.get(`/api/evaluations/cross-compare?eval_a=${id}&eval_b=${id}`);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_COMPARISON');
  });

  test.skip('cross-compare endpoint should return 404 for non-existent evals', async ({ request }) => {
    const response = await request.get(
      '/api/evaluations/cross-compare?eval_a=00000000-0000-0000-0000-000000000001&eval_b=00000000-0000-0000-0000-000000000002'
    );
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
