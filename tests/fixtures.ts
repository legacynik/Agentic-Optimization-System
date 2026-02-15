import { test as base } from '@playwright/test';

/**
 * Common test fixtures for E2E tests
 * Provides reusable page objects and utilities
 */

export const test = base.extend({
  // Add custom fixtures here as needed
});

export { expect } from '@playwright/test';

/**
 * Test data factory for creating evaluator configs
 */
export const createEvaluatorConfigData = (overrides = {}) => ({
  name: 'Test Evaluator',
  version: '1.0.0',
  description: 'E2E test evaluator config',
  status: 'active',
  criteria: [
    {
      name: 'Clarity',
      weight: 0.3,
      description: 'How clear is the response',
      scoring_guide: '10 = very clear, 0 = confusing',
    },
    {
      name: 'Accuracy',
      weight: 0.4,
      description: 'Is the information correct',
      scoring_guide: '10 = completely accurate, 0 = false information',
    },
    {
      name: 'Helpfulness',
      weight: 0.3,
      description: 'Does it solve the problem',
      scoring_guide: '10 = fully solves, 0 = unhelpful',
    },
  ],
  success_config: {
    min_score: 7,
    min_success_rate: 0.8,
  },
  system_prompt_template: `You are an AI evaluator. Evaluate conversations based on these criteria:

{{CRITERIA_SECTION}}

Provide scores in this format:
{{SCORES_TEMPLATE}}`,
  ...overrides,
});

/**
 * Utility to wait for API response
 */
export const waitForApiResponse = async (page: any, urlPattern: string | RegExp) => {
  return page.waitForResponse(
    (response: any) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) &&
      response.status() === 200
  );
};

/**
 * Utility to fill form fields
 */
export const fillFormField = async (page: any, label: string, value: string) => {
  const input = page.getByLabel(label, { exact: false });
  await input.clear();
  await input.fill(value);
};

/**
 * Utility to select from dropdown
 */
export const selectFromDropdown = async (page: any, label: string, value: string) => {
  await page.getByLabel(label, { exact: false }).click();
  await page.getByRole('option', { name: value }).click();
};
