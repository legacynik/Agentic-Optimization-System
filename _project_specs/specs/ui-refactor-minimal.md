---
phase: 9
name: "UI Refactor - Minimal Modern Dashboard"
status: pending
created: 2026-01-23
last_updated: 2026-01-23
last_tested: null
tested_by: null
pending_items: 6
blockers: []
---

# Phase 9: UI Refactor - Minimal Modern Dashboard

> Redesign dashboard with minimal, modern aesthetic using shadcn/ui v4 patterns.

## Overview

Refactor the dashboard from v0-migrated template to a clean, minimal design following shadcn/ui v4 best practices. Focus on visual hierarchy, breathing room, and reduced cognitive load.

## Design Principles

```
CURRENT                          TARGET
┌─────────────────────┐         ┌─────────────────────┐
│ Dense KPIs          │         │                     │
│ Complex Filters     │         │  Clean KPIs         │
│ Heatmap            │    →    │                     │
│ Insights           │         │  Focused Content    │
│ Lists Lists Lists  │         │                     │
└─────────────────────┘         └─────────────────────┘
```

### Key Changes
1. **More whitespace** - generous padding, breathing room
2. **Simplified cards** - remove decorative elements
3. **Muted colors** - use `muted` and `muted-foreground`
4. **Flat design** - minimal shadows, clean borders
5. **Progressive disclosure** - hide complexity until needed

## Requirements

### Must Have
- [ ] REQ-9.1: Simplify KPI cards - remove icons, use larger typography
- [ ] REQ-9.2: Move filters to collapsible panel or sheet
- [ ] REQ-9.3: Clean up dashboard grid - max 2 columns on desktop
- [ ] REQ-9.4: Update color scheme to shadcn v4 defaults (more muted)
- [ ] REQ-9.5: Add empty state with clear CTA
- [ ] REQ-9.6: Responsive mobile-first layout

### Nice to Have
- [ ] OPT-9.1: Skeleton loading states
- [ ] OPT-9.2: Micro-animations on interactions

## Implementation Reference

| Component | File Path | Action |
|-----------|-----------|--------|
| Dashboard | `components/dashboard-content.tsx` | Refactor |
| KPI Card | `components/dashboard-content.tsx:21-54` | Extract + Simplify |
| Filter Bar | `components/filter-bar.tsx` | Move to Sheet |
| Layout | `app/layout.tsx` | Minor tweaks |
| Globals CSS | `app/globals.css` | Color adjustments |

## Design Reference (shadcn v4)

### KPI Card - Minimal Style
```tsx
<Card className="border-0 shadow-none bg-muted/30">
  <CardContent className="pt-6">
    <div className="text-3xl font-bold tracking-tight">124</div>
    <p className="text-sm text-muted-foreground">Total Tests</p>
  </CardContent>
</Card>
```

### Grid Layout - 2 Column Max
```tsx
<div className="grid gap-6 md:grid-cols-2">
  {/* Max 2 items per row */}
</div>
```

### Filters in Sheet
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Filters
    </Button>
  </SheetTrigger>
  <SheetContent>
    {/* All filters here */}
  </SheetContent>
</Sheet>
```

## Acceptance Criteria

### Criteria Checklist
- [ ] AC-9.1: Dashboard loads in < 2 seconds
- [ ] AC-9.2: No horizontal scroll on mobile (375px)
- [ ] AC-9.3: KPIs readable at glance (large text, no clutter)
- [ ] AC-9.4: Filters accessible but not always visible
- [ ] AC-9.5: Empty state guides user to next action
- [ ] AC-9.6: Dark mode looks good (not washed out)

## Manual Test Script

### Prerequisites
- [x] Dev server running (`pnpm dev`)
- [x] Browser with DevTools
- [ ] Test data in database (or empty state)

### Test Steps

#### Test 9.1: Visual Inspection - Desktop
```
1. Open localhost:3000 in Chrome (1440px width)
2. Take screenshot of dashboard
3. Check: generous whitespace between elements?
4. Check: max 2 columns in grids?
5. Check: KPIs large and readable?

Expected: Clean, minimal layout with breathing room
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 9.2: Visual Inspection - Mobile
```
1. Open DevTools → Toggle device (iPhone 12)
2. Scroll entire page
3. Check: no horizontal scroll?
4. Check: readable without zooming?
5. Check: touch targets >= 44px?

Expected: Fully responsive, no awkward wrapping
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 9.3: Filters Sheet
```
1. Click "Filters" button
2. Sheet should slide in from right
3. Select persona filter
4. Close sheet
5. Verify filter applied to data

Expected: Smooth sheet animation, filter works
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 9.4: Empty State
```
1. Clear local test data (or use new DB)
2. Refresh dashboard
3. Check: clear empty state message?
4. Check: CTA button visible?
5. Click CTA → should navigate to test launcher

Expected: Friendly empty state with actionable CTA
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 9.5: Dark Mode
```
1. Toggle to dark mode
2. Check: no washed out text?
3. Check: proper contrast ratios?
4. Check: cards visible but subtle?

Expected: Dark mode looks intentional, not broken
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

#### Test 9.6: Performance
```
1. Open DevTools → Network tab
2. Hard refresh (Cmd+Shift+R)
3. Check: First Contentful Paint < 1s?
4. Check: No layout shifts during load?

Expected: Fast, stable load
Actual: [fill after testing]
Status: ⏳ NOT TESTED
```

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| shadcn/ui components | Required | ✅ Installed |
| Tailwind CSS | Required | ✅ Installed |
| Data queries | Required | ✅ Working |

## Notes

- Use shadcn MCP to get latest component code
- Don't break existing functionality while redesigning
- Keep component logic, just change presentation
- Consider extracting KPICard to separate file

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-01-23 | Created spec | claude |

---

*Token count: ~2,100*
