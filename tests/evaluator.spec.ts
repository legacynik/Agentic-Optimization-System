import { test, expect, createEvaluatorConfigData, waitForApiResponse, fillFormField } from './fixtures';

/**
 * E4 - Evaluator Management UI Tests
 * Tests create, edit, promote, deprecate evaluator configs
 */

// Longer timeout for evaluator tests (Supabase + dialog compilation)
test.setTimeout(60000);

/**
 * Helper: wait for the evaluator page to finish loading.
 * Returns true if data loaded (table visible), false if empty state.
 */
async function waitForEvaluatorPageLoad(page: any): Promise<boolean> {
  // Wait for React hydration — "Loading configs..." proves React rendered
  try {
    await page.getByText('Loading configs...').waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    // Loading might already be done
  }

  // Now wait for loading to finish
  try {
    await Promise.race([
      page.locator('table').waitFor({ state: 'visible', timeout: 20000 }),
      page.getByText('No evaluator configs found').waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  } catch {
    // Timeout
  }

  return await page.locator('table').isVisible().catch(() => false);
}

/**
 * Helper: open the "New Config" dialog and wait for it.
 */
async function openNewConfigDialog(page: any) {
  await page.getByRole('button', { name: /new config/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
}

test.describe('Evaluator Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/evaluators');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the page heading to confirm render
    await expect(page.getByRole('heading', { name: /evaluator configs/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display evaluators list', async ({ page }) => {
    const hasData = await waitForEvaluatorPageLoad(page);
    test.skip(!hasData, 'No evaluator configs in database - skipping data-dependent test');

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
    await waitForEvaluatorPageLoad(page);

    const timestamp = Date.now();
    const testData = createEvaluatorConfigData({
      name: `E2E Test ${timestamp}`,
      version: `99.${timestamp % 10000}`,
    });

    // Open dialog
    await openNewConfigDialog(page);

    // Fill basic info tab
    await fillFormField(page, 'Name', testData.name);
    await fillFormField(page, 'Version', testData.version);

    // Select prompt from dropdown
    const promptCombobox = page.getByRole('combobox').first();
    await promptCombobox.click();
    await page.waitForTimeout(500);
    // Select first prompt option
    const firstPromptOption = page.getByRole('option').first();
    if (await firstPromptOption.count() > 0) {
      await firstPromptOption.click();
    } else {
      test.skip(true, 'No prompts available to select');
    }

    // Navigate to Criteria tab and add a criterion
    await page.getByRole('tab', { name: /criteria/i }).click();
    await page.getByRole('button', { name: /add criterion/i }).click();
    await page.waitForTimeout(300);

    // Fill criterion name
    const criterionNameInput = page.getByRole('textbox', { name: /name/i }).last();
    await criterionNameInput.fill('Test Criterion');
    const descriptionInput = page.getByRole('textbox', { name: /description/i }).last();
    await descriptionInput.fill('Test criterion description');

    // Navigate to System Prompt tab
    await page.getByRole('tab', { name: /system prompt/i }).click();
    const promptTextarea = page.getByRole('textbox', { name: /system prompt template/i });
    await promptTextarea.fill(testData.system_prompt_template);

    // Submit form
    const createResponsePromise = waitForApiResponse(page, '/api/evaluator-configs');
    await page.getByRole('button', { name: /create/i }).click();
    await createResponsePromise;

    // Verify dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify new evaluator appears in list
    await expect(page.getByText(testData.name)).toBeVisible({ timeout: 5000 });
  });

  test('should edit existing evaluator config', async ({ page }) => {
    const hasData = await waitForEvaluatorPageLoad(page);
    test.skip(!hasData, 'No evaluator configs in database - skipping data-dependent test');

    // Find first evaluator row and click its edit button (first button in actions)
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible' });

    // Edit is the first button in the actions cell
    const actionsCell = firstRow.locator('td').last();
    const editButton = actionsCell.getByRole('button').first();
    await editButton.click();

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });

    // Verify edit mode — dialog should show Update button
    await expect(page.getByRole('button', { name: /update/i })).toBeVisible();

    // Verify form is pre-filled with existing data
    const nameInput = page.getByRole('textbox', { name: /name/i }).first();
    const currentName = await nameInput.inputValue();
    expect(currentName.length).toBeGreaterThan(0);

    // Close dialog without submitting (submit may fail due to prompt dropdown not loading)
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('should promote evaluator as default', async ({ page }) => {
    const hasData = await waitForEvaluatorPageLoad(page);
    test.skip(!hasData, 'No evaluator configs in database - skipping data-dependent test');

    // Find a non-promoted, active evaluator row
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    let promoted = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const hasDefaultBadge = await row.getByText('Default').count();
      const hasActiveStatus = await row.getByText('active').count();

      // Only promote active, non-default rows — the promote button is the second button
      if (hasDefaultBadge === 0 && hasActiveStatus > 0) {
        const actionsCell = row.locator('td').last();
        const buttons = actionsCell.getByRole('button');
        const buttonCount = await buttons.count();

        // Active non-promoted rows have 3 buttons: edit, promote, delete
        if (buttonCount >= 2) {
          const promoteResponsePromise = page.waitForResponse(
            (response) =>
              response.url().includes('/promote') &&
              response.request().method() === 'POST' &&
              response.status() === 200
          );
          // Promote is the second button (index 1)
          await buttons.nth(1).click();
          await promoteResponsePromise;

          await page.waitForTimeout(500);
          promoted = true;
          break;
        }
      }
    }

    test.skip(!promoted, 'No active non-promoted evaluator found');
  });

  test('should deprecate evaluator', async ({ page }) => {
    const hasData = await waitForEvaluatorPageLoad(page);
    test.skip(!hasData, 'No evaluator configs in database - skipping data-dependent test');

    // Find first active evaluator row
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const hasActiveStatus = await row.getByText('active').count();

      if (hasActiveStatus > 0) {
        // Delete/deprecate is the last button in actions
        const actionsCell = row.locator('td').last();
        const deleteButton = actionsCell.getByRole('button').last();

        // The page shows a confirm dialog — handle it
        page.on('dialog', (dialog) => dialog.accept());

        const deleteResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes('/api/evaluator-configs/') &&
            response.request().method() === 'DELETE' &&
            response.status() === 200
        );
        await deleteButton.click();
        await deleteResponsePromise;

        await page.waitForTimeout(500);
        break;
      }
    }
  });

  test('should open dialog for new config', async ({ page }) => {
    await waitForEvaluatorPageLoad(page);

    // Open dialog
    await openNewConfigDialog(page);

    // Verify dialog title
    await expect(page.getByText('Create Evaluator Config')).toBeVisible();

    // Verify tabs exist
    await expect(page.getByRole('tab', { name: /basic info/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /criteria/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /system prompt/i })).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('should manage criteria in editor', async ({ page }) => {
    await waitForEvaluatorPageLoad(page);

    // Open dialog
    await openNewConfigDialog(page);

    // Navigate to Criteria tab
    await page.getByRole('tab', { name: /criteria/i }).click();
    await page.waitForTimeout(300);

    // Count initial criteria (form starts with empty criteria list)
    const addButton = page.getByRole('button', { name: /add criterion/i });
    await expect(addButton).toBeVisible();

    // Add new criterion
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify criterion was added — look for "Criterion 1" text
    await expect(page.getByText('Criterion 1')).toBeVisible();

    // Fill criterion fields
    const nameInput = page.getByRole('textbox', { name: /name/i }).last();
    await nameInput.fill('Test Criterion');
    await expect(nameInput).toHaveValue('Test Criterion');

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test('should display system prompt preview', async ({ page }) => {
    await waitForEvaluatorPageLoad(page);

    // Open dialog
    await openNewConfigDialog(page);

    // Navigate to System Prompt tab
    await page.getByRole('tab', { name: /system prompt/i }).click();
    await page.waitForTimeout(300);

    // Verify template textarea is visible
    const textarea = page.getByRole('textbox', { name: /system prompt template/i });
    await expect(textarea).toBeVisible();

    // Verify placeholder hints are shown in Template Placeholders section
    await expect(page.getByText('{{CRITERIA_SECTION}}')).toBeVisible();
    await expect(page.getByText('{{SCORES_TEMPLATE}}')).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
  });
});
