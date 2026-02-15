import { test, expect, waitForApiResponse } from './fixtures';

/**
 * E5 - Evaluations UI Tests
 * Tests list, re-evaluate, compare, and promote evaluations
 */

test.describe('Evaluations Management', () => {
  // Note: These tests assume you have a page that displays evaluations
  // You may need to integrate EvaluationsList component into a route first

  test.beforeEach(async ({ page }) => {
    // Navigate to page with evaluations (adjust route as needed)
    // For now, we'll test on a dedicated evaluations page
    await page.goto('/evaluations');
  });

  test.skip('should display evaluations list', async ({ page }) => {
    // Check for evaluations count badge
    await expect(page.getByText(/evaluations/i)).toBeVisible();

    // Check for table or list of evaluations
    await expect(page.locator('[data-evaluations-list]')).toBeVisible();

    // Check for "Re-evaluate" button
    await expect(page.getByRole('button', { name: /re-evaluate/i })).toBeVisible();

    // Check for checkboxes for comparison
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
  });

  test.skip('should re-evaluate with different evaluator', async ({ page }) => {
    // Click re-evaluate button
    await page.getByRole('button', { name: /re-evaluate/i }).click();

    // Wait for modal to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/select evaluator/i)).toBeVisible();

    // Select evaluator from dropdown
    await page.getByLabel(/evaluator/i).click();
    await page.waitForTimeout(500);

    // Select first available evaluator
    const firstEvaluatorOption = page.getByRole('option').first();
    await firstEvaluatorOption.click();

    // Start re-evaluation
    const reevaluateResponsePromise = waitForApiResponse(page, '/api/evaluations/re-evaluate');
    await page.getByRole('button', { name: /start|confirm/i }).click();
    await reevaluateResponsePromise;

    // Wait for progress indicator
    await expect(page.getByRole('progressbar')).toBeVisible();

    // Wait for completion (with timeout)
    await page.waitForTimeout(2000);

    // Verify success message or modal closes
    const successIndicator = page.getByText(/success|completed/i);
    if (await successIndicator.count() > 0) {
      await expect(successIndicator).toBeVisible();
    }

    // Close modal if still open
    const closeButton = page.getByRole('button', { name: /close/i });
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  });

  test.skip('should compare two evaluations', async ({ page }) => {
    // Select first evaluation
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();

    // Select second evaluation
    await checkboxes.nth(1).check();

    // Click compare button
    await page.getByRole('button', { name: /compare/i }).click();

    // Wait for comparison dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/comparison/i)).toBeVisible();

    // Verify Overview tab
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();

    // Check for overall score comparison
    await expect(page.getByText(/overall score/i)).toBeVisible();
    await expect(page.getByText(/success rate/i)).toBeVisible();

    // Check for delta indicators (up/down arrows or +/- signs)
    const deltaIndicators = page.locator('[data-delta]');
    if (await deltaIndicators.count() > 0) {
      await expect(deltaIndicators.first()).toBeVisible();
    }

    // Verify Criteria tab
    await page.getByRole('tab', { name: /criteria/i }).click();
    await expect(page.getByText(/criterion|criteria/i)).toBeVisible();

    // Verify Per Persona tab
    await page.getByRole('tab', { name: /per persona/i }).click();
    await expect(page.getByText(/persona/i)).toBeVisible();

    // Check for collapsible persona cards
    const personaCards = page.locator('[data-persona-card]');
    if (await personaCards.count() > 0) {
      // Expand first persona
      await personaCards.first().click();
      await page.waitForTimeout(300);

      // Verify criteria deltas for persona
      await expect(page.getByText(/delta|difference/i)).toBeVisible();
    }

    // Close comparison dialog
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test.skip('should promote evaluation as default', async ({ page }) => {
    // Find first non-promoted evaluation row
    const rows = page.locator('[data-evaluation-row]');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const hasDefaultBadge = await row.getByText(/default/i).count();

      if (hasDefaultBadge === 0) {
        // Click star/promote button
        const promoteButton = row.getByRole('button', { name: /promote|star/i });

        const promoteResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes('/promote') &&
            response.request().method() === 'POST' &&
            response.status() === 200
        );
        await promoteButton.click();
        await promoteResponsePromise;

        // Verify "Default" badge appears
        await page.waitForTimeout(500);
        await expect(row.getByText(/default/i)).toBeVisible();
        break;
      }
    }
  });

  test.skip('should display evaluation details', async ({ page }) => {
    // Click on first evaluation to view details
    const firstEvaluation = page.locator('[data-evaluation-row]').first();
    await firstEvaluation.click();

    // Wait for details to load
    await page.waitForTimeout(500);

    // Verify evaluation metadata
    await expect(page.getByText(/evaluator/i)).toBeVisible();
    await expect(page.getByText(/score/i)).toBeVisible();
    await expect(page.getByText(/outcome/i)).toBeVisible();

    // Verify criteria scores
    await expect(page.getByText(/criteria|criterion/i)).toBeVisible();

    // Check for battle evaluations count
    const battleCount = page.getByText(/battles?/i);
    if (await battleCount.count() > 0) {
      await expect(battleCount).toBeVisible();
    }
  });

  test.skip('should filter evaluations by status', async ({ page }) => {
    // Find status filter dropdown
    const statusFilter = page.getByLabel(/status|filter/i);
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select "completed" status
      await page.getByRole('option', { name: /completed/i }).click();

      // Wait for filtered results
      await page.waitForTimeout(500);

      // Verify only completed evaluations are shown
      const statusBadges = page.locator('[data-status-badge]');
      const badgeCount = await statusBadges.count();

      for (let i = 0; i < badgeCount; i++) {
        const badge = statusBadges.nth(i);
        await expect(badge).toHaveText(/completed/i);
      }
    }
  });

  test.skip('should show progress during re-evaluation', async ({ page }) => {
    // Start re-evaluation
    await page.getByRole('button', { name: /re-evaluate/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select evaluator
    await page.getByLabel(/evaluator/i).click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();

    // Start re-evaluation
    await page.getByRole('button', { name: /start|confirm/i }).click();

    // Verify progress indicator appears
    await expect(page.getByRole('progressbar')).toBeVisible();

    // Verify progress percentage or status text
    const progressText = page.getByText(/%|pending|running/i);
    if (await progressText.count() > 0) {
      await expect(progressText).toBeVisible();
    }

    // Wait for completion or timeout
    await page.waitForTimeout(5000);

    // Verify completion message or error
    const resultMessage = page.getByText(/success|error|timeout|completed/i);
    await expect(resultMessage).toBeVisible();
  });
});

/**
 * Integration tests for evaluations workflow
 */
test.describe('Evaluations Workflow Integration', () => {
  test.skip('should complete full evaluation lifecycle', async ({ page }) => {
    // 1. Navigate to evaluations
    await page.goto('/evaluations');

    // 2. Trigger re-evaluation
    await page.getByRole('button', { name: /re-evaluate/i }).click();
    await page.getByLabel(/evaluator/i).click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /start/i }).click();

    // 3. Wait for completion
    await page.waitForTimeout(10000); // Longer timeout for real evaluation

    // 4. Verify new evaluation appears
    await page.goto('/evaluations'); // Reload to get fresh data
    const evaluationsList = page.locator('[data-evaluations-list]');
    await expect(evaluationsList).toBeVisible();

    // 5. Compare with previous evaluation
    await page.locator('input[type="checkbox"]').nth(0).check();
    await page.locator('input[type="checkbox"]').nth(1).check();
    await page.getByRole('button', { name: /compare/i }).click();

    // 6. Verify comparison shows differences
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/comparison/i)).toBeVisible();

    // 7. Close comparison
    await page.getByRole('button', { name: /close/i }).click();

    // 8. Promote best evaluation
    const firstEvaluation = page.locator('[data-evaluation-row]').first();
    await firstEvaluation.getByRole('button', { name: /promote/i }).click();
    await page.waitForTimeout(500);
    await expect(firstEvaluation.getByText(/default/i)).toBeVisible();
  });
});
