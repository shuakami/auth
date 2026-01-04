# Design System & Aesthetic Guidelines

## Overview

This document defines the design principles, visual aesthetics, and animation standards for the Auth Dashboard. Follow these guidelines to maintain consistency and a premium feel across all UI components.

## Design Philosophy

### Core Principles

1. **Minimalism** - Remove unnecessary elements. Every pixel should serve a purpose.
2. **Clarity** - Information hierarchy should be immediately obvious.
3. **Elegance** - Subtle refinements over flashy effects.
4. **Consistency** - Same patterns, same behaviors, everywhere.

### What We Avoid

- Bright colored status indicators (no green dots, red badges)
- Heavy shadows or gradients
- Cluttered layouts with too many actions visible
- Scale animations that look like "breathing" or "pulsing"
- Slow, drawn-out transitions
- Native browser elements (use custom components instead)

## Color Usage

### Status Indication

- **Active/Enabled**: Normal text color (no special color)
- **Disabled/Inactive**: Muted text (`text-muted`)
- **Danger actions**: Red text only on hover or for delete buttons (`text-red-500`)
- **Never use**: Green dots, colored badges for status

### Backgrounds

- Primary surface: `bg-surface-l1`
- Cards/containers: `bg-background` with `border border-muted`
- Hover states: `bg-overlay-hover`
- Modal backdrop: `bg-black/40` with `backdrop-blur-[2px]`

## Typography

### Hierarchy

- Page title: `text-2xl font-medium`
- Section title: `text-base font-medium`
- Body text: `text-sm`
- Labels: `text-xs text-muted uppercase tracking-wide`
- Muted/secondary: `text-muted`

### Code/Monospace

- Client IDs, secrets: `font-mono text-sm`
- No background color on inline code in modals

## Components

### Buttons

CRITICAL: All buttons MUST include `cursor-pointer` class. This is often missing and causes poor UX.

Use the Button component from `@/components/ui/Button` for consistency.

```
Primary: bg-foreground text-background rounded-full h-9 px-4
Secondary: border border-muted bg-transparent rounded-full h-9 px-4
Danger: text-red-500 hover:bg-red-500/10 (text only, no bg)
Icon button: p-2 text-muted hover:text-primary
```

Buttons that navigate to sub-pages should include a ChevronRight icon.

### Cards

```
Container: rounded-2xl border bg-surface-l1
List item: border-l-2 border-transparent px-4 py-4
Table container: rounded-xl border overflow-clip
```

### Form Inputs

```
Input: h-10 px-3 rounded-lg border border-muted bg-transparent
Focus: border-primary (no ring, no shadow)
```

### Custom Select (Dropdown)

Never use native `<select>`. Use custom Select component with:

```
Trigger: h-10 px-3 rounded-lg border border-muted
Dropdown: mt-1.5 p-1 rounded-xl border shadow-lg
Options: px-3 py-2 rounded-lg (internal rounded corners!)
Selected: bg-foreground/5 with Check icon
Hover: bg-overlay-hover
```

Key points:
- Dropdown container needs `p-1` padding
- Each option needs `rounded-lg` for internal rounded corners
- Proper spacing between trigger and dropdown (`mt-1.5`)
- ChevronDown rotates 180° when open

### Toast Notifications

Compact, elegant notifications:

```
Container: pl-4 pr-2.5 py-2.5 rounded-xl shadow-lg
Size: min-w-[240px] max-w-[320px]
Position: fixed bottom-6 right-6
Z-index: z-[10000] (above modals)
```

Keep toasts small and unobtrusive.

### Tooltip

Simple hover tooltips for icon explanations:

```
Container: px-2 py-1 text-xs rounded-md
Colors: bg-foreground text-background
```

Use for status icons (email verified, 2FA, biometric).

### Tables

- Header: `text-muted-foreground font-medium h-10`
- Row hover: `hover:bg-overlay-hover`
- Selected row: `bg-foreground/[0.03]` (very subtle)
- Actions: Hidden by default, show on row hover

## Animation Standards

### Premium Easing

Use `cubic-bezier(0.16, 1, 0.3, 1)` for premium feel (Apple-like).

### Timing

- **Fast interactions**: 150ms (dropdowns, tooltips)
- **Modal open/close**: 200ms
- **Content transitions**: 200ms
- **Never exceed**: 300ms for any UI animation

### Modal Animations

```css
/* Backdrop */
opacity: 0 → 1
transition: opacity 0.2s ease

/* Content */
opacity: 0 → 1
transform: scale(0.96) → scale(1)
transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)
```

Use `setTimeout(fn, 10)` for reliable first-open animation (not requestAnimationFrame).

### Dropdown Animations

```css
/* Open */
opacity: 0 → 1
transform: translateY(-8px) scale(0.96) → translateY(0) scale(1)
transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1)
```

### Toast Animations

```css
/* Enter */
opacity: 0 → 1
transform: translateY(12px) scale(0.95) → translateY(0) scale(1)

/* Leave */
opacity: 1 → 0
transform: translateY(0) → translateY(8px) scale(0.95)
filter: blur(0) → blur(4px)

transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)
```

### Content Transitions (e.g., Session switching)

```css
/* Fade out */
opacity: 1 → 0
filter: blur(0) → blur(4px)
transition: 0.2s ease

/* Fade in (after data change) */
opacity: 0 → 1
filter: blur(4px) → blur(0)
transition: 0.2s ease
```

### What NOT to Do

- No scale animations that grow/shrink content ("breathing" effect)
- No bounce or elastic easing
- No staggered delays longer than 100ms
- No animations on scroll (except header hide)
- No loading spinners longer than necessary
- No native browser elements without custom styling

## Modal Design

### Structure

```
Modal
├── Header (title + close button)
│   └── p-6 pb-0
├── Content
│   └── p-6
└── Footer (actions)
    └── Inside content, pt-3
```

### Sizes

- `sm`: max-w-sm (confirmation dialogs)
- `md`: max-w-md (forms, details)
- `lg`: max-w-lg (complex content)

### Action Buttons

- View mode: "Edit" (left) + "Delete" (right, text-red-500)
- Edit mode: "Cancel" (left) + "Save" (right, primary)
- Confirmation: "Cancel" (left) + "Confirm" (right)

### Content Layout

- Key-value pairs: `flex justify-between` with `text-muted` labels
- Form fields: Stack with `space-y-4`
- No colored backgrounds for credentials display

### Creative Layout Patterns

When a modal has a clear "hero" value (like a plan name, price, or key metric), use emphasis layout:

```
Hero Layout Example (Subscription Modal):
┌─────────────────────────┐
│  Free                   │  ← text-4xl font-bold (hero value)
│  forever                │  ← text-sm text-muted (subtitle)
├─────────────────────────┤  ← h-px bg-foreground/10 (divider)
│  Status    │  Since     │  ← grid grid-cols-2 (secondary info)
│  Active    │  Oct 2024  │
├─────────────────────────┤
│  [Close]   [Upgrade]    │  ← two buttons, not full-width CTA
└─────────────────────────┘
```

Key principles for creative layouts:
- **Hero value**: Use `text-3xl` or `text-4xl font-bold` for the most important piece of info
- **Subtitle**: Small muted text directly below hero (`text-sm text-muted mt-0.5`)
- **Dividers**: Use `h-px bg-foreground/10` to separate sections
- **Grid for secondary info**: `grid grid-cols-2 gap-4` with label above value

Don't use hero layout for:
- Forms (use standard stacked layout)
- Detail views with many fields (use key-value pairs)
- Confirmation dialogs (use centered text)

## Responsive Behavior

### Mobile Header

- Hide on scroll down (after 50px)
- Show on scroll up
- Transition: `transform 0.3s ease`

### Tables on Mobile

- Horizontal scroll with `overflow-x-auto`
- Minimum column widths preserved

## Icon Usage

### Sizes

- In buttons: `h-4 w-4`
- Standalone actions: `h-4 w-4` or `h-5 w-5`
- Feature icons: `h-5 w-5` or `h-6 w-6`
- Small (toast close): `h-3.5 w-3.5`

### Colors

- Default: `text-muted` or `text-subtle`
- Hover: `text-primary`
- Active: `text-primary`

### Navigation Indicators

Use `ChevronRight` icon for buttons that navigate to sub-pages or multi-step flows.

## File Locations

- Modal component: `client/src/components/ui/Modal.tsx`
- Select component: `client/src/components/ui/Select.tsx`
- Toast component: `client/src/components/ui/Toast.tsx`
- Tooltip component: `client/src/components/ui/Tooltip.tsx`
- Dashboard page: `client/src/app/dashboard-test/page.tsx`
- Session map: `client/src/app/dashboard-test/SessionMap.tsx`
