# E2E Tests with Playwright

## Setup Complete ✅

- **Playwright**: v1.58.0
- **Chromium**: v145.0.7632.6
- **Config**: `playwright.config.ts`
- **Test Files**: `tests/evaluator.spec.ts`, `tests/evaluations.spec.ts`

## Running Tests

```bash
# Run all tests
pnpm test

# Run in UI mode (interactive)
pnpm test:ui

# Run in debug mode
pnpm test:debug

# Run with visible browser
pnpm test:headed

# Show test report
pnpm test:report

# Run specific test file
npx playwright test evaluator.spec.ts
```

## Test Status

### E4 - Evaluator Management (7 tests)

| Test | Status | Notes |
|------|--------|-------|
| should display evaluators list | ✅ PASS | |
| should create new evaluator config | ⏸️ NEEDS FIX | Prompt field selector issue |
| should edit existing evaluator config | ⏸️ NEEDS FIX | Edit button selector issue |
| should promote evaluator as default | ⏸️ NEEDS FIX | API response timeout |
| should deprecate evaluator | ✅ PASS | |
| should manage criteria in editor | ⏸️ NEEDS FIX | Missing data-criterion-card attribute |
| should display system prompt preview | ⏸️ NEEDS FIX | Multiple Cancel/Close buttons |

**Current: 2/7 passing (28.6%)**

### E5 - Evaluations Management (8 tests)

All tests are currently `.skip`ped because the `/evaluations` route may not exist yet. These tests are ready to be enabled once the EvaluationsList component is integrated into a page.

## Known Issues & Next Steps

### 1. Selector Issues
Some tests use selectors that don't match the actual UI implementation:
- **Prompt field**: Need to navigate to correct tab before selecting
- **Edit button**: Need correct selector for edit action
- **Criteria cards**: Need to add `data-criterion-card` attribute to UI

### 2. API Integration
- Promote endpoint timeout suggests possible API or UI issue
- Need to verify all API endpoints are working correctly

### 3. Multiple Close Buttons
Dialog has both a Cancel button (in form) and Close button (X icon). Tests need to be more specific about which to click.

### 4. E5 Integration
- EvaluationsList component exists but needs a dedicated route
- Suggest creating `/evaluations` page or integrating into `/test-launcher`
- Once route exists, unskip E5 tests

## Recommendations

### Short Term
1. Add `data-testid` or `data-*` attributes to key UI elements for more reliable selectors
2. Fix the 5 failing E4 tests by adjusting selectors to match UI
3. Create `/evaluations` page and enable E5 tests

### Medium Term
1. Add visual regression testing
2. Add API mocking for more predictable tests
3. Add accessibility testing with axe-core
4. Increase test coverage to 80%+

### Long Term
1. Set up CI/CD pipeline to run tests on every commit
2. Add performance testing with Lighthouse
3. Add cross-browser testing (Firefox, Safari)

## Test Architecture

```
tests/
├── fixtures.ts              # Shared test utilities and factories
├── evaluator.spec.ts        # E4 - Evaluator Management tests
├── evaluations.spec.ts      # E5 - Evaluations Management tests (skipped)
└── README.md                # This file
```

## Contributing

When writing new tests:
1. Use fixtures from `fixtures.ts` for common patterns
2. Add meaningful test descriptions
3. Use data attributes for selectors when possible
4. Group related tests in `describe` blocks
5. Clean up state in `beforeEach`/`afterEach` hooks
