# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React TypeScript project configured for Power Apps Code Apps.

- `src/main.tsx` mounts the React application.
- `src/App.tsx` is the current app entry component.
- `src/App.css` contains app-level styles.
- `src/index.css` contains global resets and base styles.
- `src/assets/` is reserved for local images, icons, and other static assets.
- `public/` can hold static files served directly by Vite.
- `power.config.json` and `vite.config.ts` contain Power Apps and Vite integration settings.

Keep feature code under `src/`. As the app grows, prefer `src/components/`, `src/pages/`, `src/hooks/`, and `src/lib/` rather than placing all logic in `App.tsx`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript project checks and builds production assets into `dist/`.
- `npm run lint` runs ESLint across the repository.
- `npm run preview` serves the production build locally for verification.

Run `npm install` after cloning or whenever `package-lock.json` changes.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing style: 2-space indentation, single quotes in TS/TSX files, and minimal semicolon use.

Name React components with `PascalCase`, such as `AccountSummary.tsx`. Name hooks with `use` prefixes, for example `useAccounts.ts`. Use `camelCase` for variables, functions, and CSS classes. Reserve `index.css` for global rules.

ESLint is configured through `eslint.config.js`; run `npm run lint` before submitting changes.

## Testing Guidelines

No test framework is configured yet. When adding tests, prefer Vitest with React Testing Library. Place tests beside the code they verify using names like `ComponentName.test.tsx`, or use `src/__tests__/` if the suite becomes broad.

Until tests are added, validate changes with `npm run lint`, `npm run build`, and manual checks in the local dev server.

## Commit & Pull Request Guidelines

This repository has no existing commit history yet. Use concise, imperative commit messages, for example `Add account list component` or `Configure Power Apps settings`.

Pull requests should include a short description, testing notes, and screenshots for visible UI changes. Link related issues when available. Keep PRs focused; separate unrelated formatting, dependency, and feature changes.

## Security & Configuration Tips

Do not commit secrets, environment-specific credentials, or tenant-specific values. Keep local configuration in ignored environment files when needed, and document required variables in the README instead of storing real values in source control.


## AOP Project Rules

This repository is for the **Annual Operating Plan (AOP)** application under **Digital Connect**.

Before implementing any feature, read the relevant documentation from:

* `docs/01-BRD.md`
* `docs/03-Dataverse-Data-Model.md`
* `docs/04-Role-Permission-Matrix.md`
* `docs/05-Approval-Workflow.md`
* `docs/screens_specification/*`

If documentation conflicts occur, follow this priority:

1. Screen Specification
2. Approval Workflow
3. Role Permission Matrix
4. Dataverse Data Model
5. BRD

Do not invent business rules. Ask for clarification when requirements are unclear.

## Development Order

Implement screens in this order:

1. Common Layout
2. Create Activity
3. Activities List
4. Dashboard
5. Edit Activity
6. Approvals
7. Procurement Plan
8. Engagement Plan
9. Financial Spending

Do not start a new screen until the current screen is completed and approved.

## Power Apps Code Apps Rules

Always use generated Dataverse code when available:

* `generated/models`
* `generated/services`

Do not create duplicate models, DTOs, or Dataverse service layers.

Use generated services first. Only create custom helpers for mapping, formatting, filtering, or UI-specific transformations.

if any service not available then use 

pac code add-data-source -a dataverse -t <table-logical-name>

above command to add data source after approval

## Suggested Source Structure

As the app grows, use:

```text
src/
├── components/
│   ├── ui/
│   └── layout/
├── pages/
├── hooks/
├── routes/
├── store/
├── utils/
├── constants/
├── styles/
└── generated/
```

## UI Component Rules

Build reusable UI components before screen implementation.

All screens must use shared components from `src/components/ui`.

Required shared components:

* Button
* Input
* Textarea
* Select
* DatePicker
* Radio
* Checkbox
* Modal
* Badge
* Card
* StatCard
* Tabs
* SearchInput
* FilterDropdown
* DataGrid
* EmptyState
* LoadingState
* ConfirmationDialog

Do not use raw browser controls directly in screens when a shared component exists.

## Styling and Theme Rules

The app must support:

* Light mode
* Dark mode

Use:

* CSS variables
* Centralized design tokens
* Shared theme utilities

Do not hardcode colors inside screens or business components.

All fields and components must be customized with a modern enterprise UI style.

## Date, Dropdown, and Currency Rules

All date fields must use the shared custom `DatePicker`.

Date format:

```text
DD/MM/YYYY
```

Dropdowns must use the shared custom `Select` component and support search.

Radio buttons and checkboxes must use shared custom components.

Currency values must:

* Use comma separators
* Display the Dirham SVG/icon before the value
* Use a shared formatting utility

Examples:

```text
1,000
100,000
1,250,000.50
```

## Common Layout Rules

All authenticated screens must use the common layout:

* Sidebar
* Header
* Main content area

Application name:

```text
Digital Connect
```

Sub-application name:

```text
Annual Operating Plan
```

Common header/sidebar controls may include:

* Role dropdown
* Cycle dropdown
* Theme mode switcher
* Notification panel
* Language dropdown

Sidebar links:

* Dashboard
* Create Activity
* Sector/Division Overview
* Activity Leads
* Activities List
* Approvals
* Procurement Plan
* Engagement Plan
* Financial Spending

Sidebar visibility must follow the Screen Specification and Role Permission Matrix.

## State Management Rules

Use Redux for global application state:

* Current user
* Selected role
* Selected cycle
* Theme mode
* Language
* Notifications
* Global lookup/cache data when appropriate

Use local component state for:

* Form values
* Modal open/close state
* Temporary UI interactions

Do not store every form field in Redux.

## Dataverse Query Rules

Use server-side operations wherever possible:

* Filtering
* Search
* Sorting
* Pagination

Use `NextLink` when available.

Retrieve only required columns.

Prefer:

* `$select`
* `$filter`

Avoid large unfiltered retrieves.

## Security and Role Rules

Role-based behavior must follow:

* Role Permission Matrix
* Screen Specification
* Approval Workflow

Authorization depends on:

* Role
* Team membership
* Divisional hierarchy
* Activity owner

Never hardcode permissions directly inside components. Centralize permission checks in utilities or hooks.

## Approval Workflow Rules

Approval workflow is defined in:

```text
docs/05-Approval-Workflow.md
```

Do not introduce new statuses.

Do not change status transitions.

Do not change owner assignment behavior.

Do not implement workflow actions on screens that are not specified to support them.

## Logging Rules

Create AOP project logs for important actions:

* Activity creation
* Activity update
* Activity submission
* Approval
* Clarification
* Ownership change
* Procurement changes
* Engagement changes

Use:

```text
dga_aop_project_logs
```

## Performance Rules

Minimize Dataverse API calls.

Use:

* `useMemo`
* `useCallback`
* `React.memo`
* Maps for lookup joins
* Lazy loading

Avoid:

* Repeated API calls
* Nested loops on large datasets
* Loading all records for grid screens

## UX Rules

Every data screen must include:

* Loading state
* Empty state
* Error state
* Refresh behavior where applicable

Grid screens must support:

* Search
* Filters
* Pagination
* Lazy loading
* Column wise filteration
* Export where specified

## Completion Rules

A screen is not complete until:

* UI is implemented
* Business rules are implemented
* Validations are implemented
* Role visibility is implemented
* Loading state is implemented
* Empty state is implemented
* Light mode works
* Dark mode works
* `npm run lint` passes
* `npm run build` passes
* Screen is approved by project owner

## Design System

The application shall use a modern enterprise-grade design system.

Design Goals:

* Professional Government Application
* Modern Appearance
* Clean Layout
* High Readability
* Consistent Components
* Excellent Dark Mode Support

---

## Color Palette

### Primary Color

Indigo

```text
#4F46E5
```

### Primary Hover

```text
#4338CA
```

### Primary Light

```text
#EEF2FF
```

---

### Success

```text
#16A34A
```

---

### Warning

```text
#F59E0B
```

---

### Error

```text
#DC2626
```

---

### Information

```text
#0284C7
```

---

## Light Theme

Background

```text
#F8FAFC
```

Surface

```text
#FFFFFF
```

Border

```text
#E2E8F0
```

Text Primary

```text
#0F172A
```

Text Secondary

```text
#64748B
```

---

## Dark Theme

Background

```text
#0F172A
```

Surface

```text
#1E293B
```

Border

```text
#334155
```

Text Primary

```text
#F8FAFC
```

Text Secondary

```text
#CBD5E1
```

---

## Component Styling

Cards:

* Large border radius
* Soft shadows
* Hover elevation

Buttons:

* Rounded corners
* Smooth transitions
* Loading state support

Inputs:

* Rounded corners
* Floating labels preferred
* Focus ring using Primary Color

Data Grids:

* Sticky headers
* Hover row highlighting
* Alternating row backgrounds optional

Status Capsules:

Draft

```text
Gray
```

Submitted

```text
Blue
```

Approved

```text
Green
```

Clarification Needed

```text
Orange
```

Active

```text
Emerald
```

Cancelled

```text
Red
```

---

## Typography

Font Family:

```text
Encode Sans
```

Fallback:

```text
sans-serif
```

---

## Icons

Preferred:

* Fluent UI Icons
* Lucide React

Avoid mixing multiple icon libraries.

Design Inspiration:

- Microsoft Fluent Design
- Linear
- Notion
- Stripe Dashboard
- Vercel Dashboard

Avoid:

- Bootstrap-looking UI
- Sharp corners
- Heavy gradients
- Outdated enterprise styling