---
name: locafleet-ui
description: >
  LocaFleet design system and UI patterns.
  Use when creating ANY UI component, page, or visual element.
  Contains color palette, status badges, layout patterns, and component specs.
---

# LocaFleet UI Design System

@docs/prd/3-user-interface-design-goals.md

## Navigation: SIDEBAR ONLY
- No horizontal nav in top bar
- Sidebar: 240px expanded, 64px collapsed
- Top bar: search (Cmd+K) + notifications + user avatar ONLY

## Page Patterns

### Pattern A - List Page
- Page header with title + action button
- Filter bar (status, search, date range)
- DataTable with sortable columns
- Pagination at bottom
- Bottom action bar for bulk actions

### Pattern B - Detail Page
- Breadcrumb navigation
- Title with status badge
- Info cards in grid layout
- Tabs for sections (Info, Documents, History)
- Sidebar with quick actions

### Pattern C - Wizard/Form
- Horizontal stepper showing progress
- Form sections with clear labels
- Previous/Next buttons
- Save draft functionality
- Validation feedback inline

### Pattern D - Dashboard
- KPI cards in grid (4 columns)
- Alert cards for urgent items
- Charts (Recharts) for trends
- Quick action buttons

## Color Palette

### Primary Colors
- Primary: `blue-600` (#2563EB), hover: `blue-700`
- Background: `slate-50`, Cards: `white`
- Text primary: `slate-900`
- Text secondary: `slate-500`
- Borders: `slate-200`

### Status Colors
| Status | Background | Text | Border | Usage |
|--------|------------|------|--------|-------|
| Disponible | `green-50` | `green-700` | `green-200` | Vehicle available |
| Loue | `violet-50` | `violet-700` | `violet-200` | Vehicle rented, contract active |
| Maintenance | `amber-50` | `amber-700` | `amber-200` | Vehicle in maintenance |
| Hors service | `slate-100` | `slate-600` | `slate-300` | Vehicle out of service |
| Retard | `red-50` | `red-700` | `red-200` | Contract overdue |
| Brouillon | `slate-100` | `slate-600` | `slate-300` | Draft status |

## Currency Format
ALWAYS: `1'250.00 CHF` - apostrophe separator, CHF suffix

```typescript
// Use this helper from @/lib/utils
function formatCHF(amount: number): string {
  return amount.toLocaleString("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/\s/g, "'") + " CHF";
}
```

## Date Format
ALWAYS: `15.01.2026` (DD.MM.YYYY)

```typescript
// Use this helper from @/lib/utils
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-CH");
}
```

## Status Badge Pattern
```tsx
<Badge className="bg-{color}-50 text-{color}-700 border border-{color}-200">
  {label}
</Badge>
```

## Component Library

### Required shadcn/ui components
- Button, Input, Label, Textarea
- Select, Checkbox, RadioGroup
- Dialog, Sheet, Popover
- Table, DataTable (custom)
- Card, Badge, Avatar
- Tabs, Accordion
- Calendar, DatePicker
- Toast (sonner)
- Command (for search)
- Sidebar (custom)

### Custom Shared Components
Located in `src/components/shared/`:

- `AppSidebar` - Main navigation sidebar
- `CommandSearch` - Cmd+K search modal
- `DataTable` - Generic table with sorting, filtering, pagination
- `StatusBadge` - Colored badge based on status
- `PageHeader` - Page title with breadcrumb and actions
- `BottomActionBar` - Sticky bar for bulk actions
- `EmptyState` - Placeholder for empty lists
- `LoadingState` - Skeleton loaders

## Responsive Breakpoints
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

## Icons
Use Lucide React icons ONLY: `import { Icon } from "lucide-react"`

## Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML (button, nav, main, section)
- Provide aria-labels for icon-only buttons
- Ensure sufficient color contrast (WCAG AA)
