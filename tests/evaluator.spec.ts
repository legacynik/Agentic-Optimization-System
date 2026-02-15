import { test, expect, createEvaluatorConfigData, waitForApiResponse, fillFormField } from './fixtures';

/**
 * E4 - Evaluator Management UI Tests
 * Tests create, edit, promote, deprecate evaluator configs
 */

test.describe('Evaluator Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to evaluators page
    await page.goto('/evaluators');
    // Wait for page to load (check for heading or key element)
    await page.waitForLoadState('networkidle');
  });

  test('should display evaluators list', async ({ page }) => {
    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /version/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /prompt/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /criteria/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

    // Check for "New Config" button
    await expect(page.getByRole('button', { name: /new config/i })).toBeVisible();
  });

  test('should create new evaluator config', async ({ page }) => {
    const testData = createEvaluatorConfigData({
      name: `E2E Test Evaluator ${Date.now()}`,
    });

    // Click create button
    await page.getByRole('button', { name: /new config/i }).click();

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill basic info tab
    await fillFormField(page, 'Name', testData.name);
    await fillFormField(page, 'Version', testData.version);
    await fillFormField(page, 'Description', testData.description);

    // Select prompt from dropdown
    await page.getByLabel(/prompt/i).click();
    // Wait for dropdown options to load
    await page.waitForTimeout(500);
    // Select first prompt
    const firstPromptOption = page.getByRole('option').first();
    await firstPromptOption.click();

    // Navigate to Criteria tab
    await page.getByRole('tab', { name: /criteria/i }).click();

    // Add criteria (form should have default criteria)
    // Verify criteria editor is visible
    await expect(page.getByText(/criteria/i)).toBeVisible();

    // Navigate to System Prompt tab
    await page.getByRole('tab', { name: /system prompt/i }).click();

    // Fill system prompt template
    const promptTextarea = page.locator('textarea').filter({ hasText: /You are|CRITERIA/ }).first();
    await promptTextarea.fill(testData.system_prompt_template);

    // Submit form
    const createResponsePromise = waitForApiResponse(page, '/api/evaluator-configs');
    await page.getByRole('button', { name: /create/i }).click();
    await createResponsePromise;

    // Verify success message or dialog closes
    await page.waitForTimeout(1000);
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify new evaluator appears in list
    await expect(page.getByText(testData.name)).toBeVisible();
  });

  test('should edit existing evaluator config', async ({ page }) => {
    // Find first evaluator row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible' });

    // Click edit button (pencil icon)
    const editButton = firstRow.getByRole('button').filter({ has: page.locator('[data-icon="edit"]') }).first();
    if (await editButton.count() === 0) {
      // Try alternative selector
      const editButtons = firstRow.getByRole('button');
      await editButtons.nth(1).click(); // Usually edit is second button
    } else {
      await editButton.click();
    }

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Modify name
    const nameInput = page.getByLabel(/name/i).first();
    const currentName = await nameInput.inputValue();
    const newName = `${currentName} - Updated`;
    await fillFormField(page, 'Name', newName);

    // Submit form
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/evaluator-configs/') &&
        response.request().method() === 'PUT' &&
        response.status() === 200
    );
    await page.getByRole('button', { name: /save|update/i }).click();
    await updateResponsePromise;

    // Verify dialog closes
    await page.waitForTimeout(1000);
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify updated name appears
    await expect(page.getByText(newName)).toBeVisible();
  });

  test('should promote evaluator as default', async ({ page }) => {
    // Find first non-promoted evaluator row
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const hasDefaultBadge = await row.getByText(/default/i).count();

      if (hasDefaultBadge === 0) {
        // Click star/promote button
        const promoteButton = row.getByRole('button').first();

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

  test('should deprecate evaluator', async ({ page }) => {
    // Find first active evaluator row
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const hasActiveBadge = await row.locator('[class*="badge"]').filter({ hasText: /active/i }).count();

      if (hasActiveBadge > 0) {
        // Click delete/deprecate button (trash icon, usually last button)
        const deleteButton = row.getByRole('button').last();

        const deleteResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes('/api/evaluator-configs/') &&
            response.request().method() === 'DELETE' &&
            response.status() === 200
        );
        await deleteButton.click();
        await deleteResponsePromise;

        // Verify status changes to deprecated
        await page.waitForTimeout(500);
        await expect(row.locator('[class*="badge"]').filter({ hasText: /deprecated/i })).toBeVisible();
        break;
      }
    }
  });

  test('should manage criteria in editor', async ({ page }) => {
    // Click create button to open form
    await page.getByRole('button', { name: /new config/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Navigate to Criteria tab
    await page.getByRole('tab', { name: /criteria/i }).click();

    // Add new criterion
    const addButton = page.getByRole('button', { name: /add criterion/i });
    const initialCriteriaCount = await page.locator('[data-criterion-card]').count();

    await addButton.click();
    await page.waitForTimeout(300);

    // Verify new criterion was added
    const newCriteriaCount = await page.locator('[data-criterion-card]').count();
    expect(newCriteriaCount).toBe(initialCriteriaCount + 1);

    // Fill criterion fields
    const lastCriterion = page.locator('[data-criterion-card]').last();
    await lastCriterion.getByLabel(/name/i).fill('Test Criterion');
    await lastCriterion.getByLabel(/weight/i).fill('0.25');
    await lastCriterion.getByLabel(/description/i).fill('Test description');
    await lastCriterion.getByLabel(/scoring guide/i).fill('10 = excellent, 0 = poor');

    // Remove criterion
    const removeButton = lastCriterion.getByRole('button', { name: /remove|delete/i });
    await removeButton.click();
    await page.waitForTimeout(300);

    // Verify criterion was removed
    const finalCriteriaCount = await page.locator('[data-criterion-card]').count();
    expect(finalCriteriaCount).toBe(initialCriteriaCount);

    // Close dialog
    await page.getByRole('button', { name: /cancel|close/i }).click();
  });

  test('should display system prompt preview', async ({ page }) => {
    // Click create button to open form
    await page.getByRole('button', { name: /new config/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Navigate to System Prompt tab
    await page.getByRole('tab', { name: /system prompt/i }).click();

    // Verify template textarea is visible
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Verify placeholder hints are shown
    await expect(page.getByText(/{{CRITERIA_SECTION}}/i)).toBeVisible();
    await expect(page.getByText(/{{SCORES_TEMPLATE}}/i)).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel|close/i }).click();
  });
});
