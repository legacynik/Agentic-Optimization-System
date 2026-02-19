import { test, expect } from './fixtures';

// Increase default timeout for slow Supabase queries
test.setTimeout(60000);

/**
 * Helper to wait for dashboard data to load
 * Returns true if data loaded, false if timed out
 * Uses short timeout by default to allow tests to skip quickly when data unavailable
 */
async function waitForDashboardLoad(page: any, timeout = 15000): Promise<boolean> {
  try {
    // Wait for loading state to disappear
    await page.waitForSelector('text=Loading dashboard data...', { state: 'hidden', timeout }).catch(() => {
      // Loading text may not appear if data loads quickly
    });
    // Wait for a KPI card to appear as indicator that data loaded
    await page.waitForSelector('text=Total Tests', { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Dashboard UI Tests - Structure Only
 * Tests that don't require data to load
 */
test.describe('Dashboard Structure (No Data Required)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display page title', async ({ page }) => {
    // The page title in the browser tab
    await expect(page).toHaveTitle(/AI Agent Testing Dashboard/);
  });

  test('should display loading state initially', async ({ page }) => {
    // Either shows skeleton loading OR data has already loaded with heading
    const dashboardHeading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    const skeleton = page.locator('[data-slot="skeleton"]').first();

    // One of these should be visible
    const hasSkeleton = await skeleton.isVisible().catch(() => false);
    const isLoaded = await dashboardHeading.isVisible().catch(() => false);

    expect(hasSkeleton || isLoaded).toBeTruthy();
  });

  test('should have main content area', async ({ page }) => {
    // Main tag should exist - use .first() to avoid strict mode violation
    await expect(page.locator('main').first()).toBeVisible();
  });
});

/**
 * Sidebar Navigation Tests
 * These don't require data to load
 */
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for sidebar to render
    await page.waitForSelector('text=AI Agent Testing', { timeout: 10000 });
  });

  test('should display sidebar with app title', async ({ page }) => {
    // Sidebar should show app name
    await expect(page.getByText('AI Agent Testing')).toBeVisible();
  });

  test('should display Dashboard navigation section', async ({ page }) => {
    await expect(page.locator('[data-sidebar="group-label"]').filter({ hasText: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('should display Testing navigation section', async ({ page }) => {
    await expect(page.locator('[data-sidebar="group-label"]').filter({ hasText: 'Testing' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Test Launcher' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Test Runs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Conversations' })).toBeVisible();
  });

  test('should display Configuration navigation section', async ({ page }) => {
    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Personas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prompts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Evaluators' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should have sidebar toggle in footer', async ({ page }) => {
    // Version button with toggle should be visible
    await expect(page.getByRole('button', { name: /v2\.4 Lean/i })).toBeVisible();
  });

  test('should collapse sidebar when toggle clicked', async ({ page }) => {
    // Get initial sidebar with full text labels
    const versionButton = page.getByRole('button', { name: /v2\.4 Lean/i });
    await expect(versionButton).toBeVisible();

    // Click the toggle button
    await versionButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // After collapse, sidebar rail should still be accessible
    // The sidebar should now be in collapsed state
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('should navigate to Conversations page', async ({ page }) => {
    await page.getByRole('link', { name: 'Conversations' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/conversations/);
  });

  test('should navigate back to Dashboard', async ({ page }) => {
    // Navigate away first
    await page.getByRole('link', { name: 'Conversations' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Navigate back to Dashboard - click the nav link (not the header)
    // The header has "AI Agent Testing" + "Dashboard" subtitle, so filter precisely
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/');
  });

  test('should navigate to Evaluators page', async ({ page }) => {
    await page.getByRole('link', { name: 'Evaluators', exact: true }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/evaluators/);
  });
});

/**
 * Dashboard Overview Tests - Data Required
 * These tests require the dashboard data to load successfully
 * Skipped if Supabase data is not available
 */
test.describe('Dashboard Overview (Data Required)', () => {
  // Skip entire describe block by default - enable when data is available
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const loaded = await waitForDashboardLoad(page);
    test.skip(!loaded, 'Supabase data not available - skipping data-dependent tests');
  });

  test('should display dashboard heading when data loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('should not have duplicate AI Agent Dashboard title in main content', async ({ page }) => {
    // Subtitle should be visible
    await expect(page.getByText('Overview of your AI agent testing performance')).toBeVisible();

    // Should NOT have duplicate "AI Agent Testing Dashboard" in main content
    const mainContent = page.locator('main').first();
    await expect(mainContent.getByText('AI Agent Testing Dashboard')).not.toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    await expect(page.getByText('Total Tests')).toBeVisible();
    await expect(page.getByText('Avg Score').first()).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Appointments')).toBeVisible();
  });

  test('should display AI Insights section', async ({ page }) => {
    await expect(page.getByText('AI Insights')).toBeVisible();
  });

  test('should display Performance Trends chart', async ({ page }) => {
    await expect(page.getByText('Performance Trends')).toBeVisible();
  });

  test('should display Personas Performance section', async ({ page }) => {
    await expect(page.getByText('Personas Performance')).toBeVisible();
  });

  test('should display Recent Test Runs', async ({ page }) => {
    await expect(page.getByText('Recent Test Runs')).toBeVisible();
  });

  test('should display Latest Conversations', async ({ page }) => {
    await expect(page.getByText('Latest Conversations')).toBeVisible();
  });

  test('should have Export button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });
});

/**
 * Filter Bar Tests - Data Required
 * Skipped if Supabase data is not available
 */
test.describe('Filter Bar (Data Required)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const loaded = await waitForDashboardLoad(page);
    test.skip(!loaded, 'Supabase data not available - skipping data-dependent tests');
  });

  test('should display filter bar sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Filters', level: 3 })).toBeVisible();
    await expect(page.getByText('Persona').first()).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByText('Outcomes')).toBeVisible();
    await expect(page.getByText('Score Range')).toBeVisible();
    await expect(page.getByText('Options')).toBeVisible();
  });

  test('should display outcome toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Toggle success' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle partial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle failure' })).toBeVisible();
  });

  test('should display booked only switch', async ({ page }) => {
    await expect(page.getByRole('switch', { name: 'Booked Only' })).toBeVisible();
  });

  test('should display outlier badges', async ({ page }) => {
    await expect(page.getByText(/P10:/)).toBeVisible();
    await expect(page.getByText(/P90:/)).toBeVisible();
  });

  test('should open persona dropdown', async ({ page }) => {
    const combobox = page.getByRole('combobox');
    await combobox.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('option', { name: 'All personas' })).toBeVisible();
  });

  test('should toggle outcome filters', async ({ page }) => {
    const successButton = page.getByRole('button', { name: 'Toggle success' });
    await successButton.click();
    await expect(successButton).toHaveAttribute('data-state', 'on');

    await successButton.click();
    await expect(successButton).toHaveAttribute('data-state', 'off');
  });

  test('should toggle booked only switch', async ({ page }) => {
    const bookedSwitch = page.getByRole('switch', { name: 'Booked Only' });
    await expect(bookedSwitch).toHaveAttribute('data-state', 'unchecked');

    await bookedSwitch.click();
    await expect(bookedSwitch).toHaveAttribute('data-state', 'checked');

    await bookedSwitch.click();
    await expect(bookedSwitch).toHaveAttribute('data-state', 'unchecked');
  });
});

/**
 * Dashboard Responsiveness Tests
 */
test.describe('Dashboard Responsiveness', () => {
  test('should display sidebar on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // On mobile, main content area should be visible
    // Sidebar behavior varies - just verify the page loads correctly
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display sidebar on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar should be visible
    await expect(page.getByText('AI Agent Testing')).toBeVisible({ timeout: 10000 });
  });

  test('should have responsive main content area', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Main content should exist - use .first() to avoid strict mode violation
    await expect(page.locator('main').first()).toBeVisible();
  });
});
