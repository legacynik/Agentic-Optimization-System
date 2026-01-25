---
phase: X
name: "Phase Name"
status: pending # pending | in_progress | partial | done | blocked
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
last_tested: null
tested_by: null
pending_items: 0
blockers: []
---

# Phase X: Phase Name

> One-line description of what this phase accomplishes.

## Overview

Brief (2-3 sentences) explanation of the phase scope.

## Requirements

### Must Have
- [ ] REQ-X.1: First requirement
- [ ] REQ-X.2: Second requirement
- [ ] REQ-X.3: Third requirement

### Nice to Have (defer if complex)
- [ ] OPT-X.1: Optional requirement

## Implementation Reference

| Component | File Path | Status |
|-----------|-----------|--------|
| Component 1 | `path/to/file.ts` | ✅ |
| Component 2 | `path/to/file2.ts` | ⏳ |

## Acceptance Criteria

```gherkin
GIVEN [precondition]
WHEN [action]
THEN [expected result]
```

### Criteria Checklist
- [ ] AC-X.1: First acceptance criterion
- [ ] AC-X.2: Second acceptance criterion
- [ ] AC-X.3: Third acceptance criterion

## Manual Test Script

### Prerequisites
- [ ] Prerequisite 1
- [ ] Prerequisite 2

### Test Steps

#### Test X.1: [Test Name]
```
1. Step one
2. Step two
3. Step three

Expected: [what should happen]
Actual: [fill after testing]
Status: ⏳ NOT TESTED | ✅ PASS | ❌ FAIL
```

#### Test X.2: [Test Name]
```
1. Step one
2. Step two

Expected: [what should happen]
Actual: [fill after testing]
Status: ⏳ NOT TESTED | ✅ PASS | ❌ FAIL
```

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Phase Y | Blocks this | ✅ Complete |
| External API | Required | ✅ Available |

## Notes

- Note 1
- Note 2

## Changelog

| Date | Change | By |
|------|--------|-----|
| YYYY-MM-DD | Created spec | nic |

---

*Token count target: <3,000*
