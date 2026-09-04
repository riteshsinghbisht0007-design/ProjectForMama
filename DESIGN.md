---
name: Enterprise Law Enforcement Summon System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c5c6cd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8f9097'
  outline-variant: '#44474d'
  surface-tint: '#b9c7e4'
  primary: '#b9c7e4'
  on-primary: '#233148'
  primary-container: '#0a192f'
  on-primary-container: '#74829d'
  inverse-primary: '#515f78'
  secondary: '#adc8f5'
  on-secondary: '#133155'
  secondary-container: '#2f4a70'
  on-secondary-container: '#9fbae6'
  tertiary: '#ffb77d'
  on-tertiary: '#4d2600'
  tertiary-container: '#2b1300'
  on-tertiary-container: '#c56b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#adc8f5'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#2d486d'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  margin-screen: 16px
  touch-target-min: 48px
---

## Brand & Style

This design system embodies a High-Contrast / Bold aesthetic merged with Corporate / Modern sensibilities, specifically tailored for mission-critical law enforcement and police staff summon management. The UI is engineered to evoke absolute trust, authority, and unwavering reliability under high-stress operational environments. 

The visual paradigm prioritizes instantaneous data legibility, zero cognitive friction, and unmistakable alert prioritization. Every surface and interactive element is designed to minimize error rates during rapid-response dispatch and summon tracking.

## Colors

The color palette is built for high-contrast visibility in varying ambient light conditions, anchored by a deep navy primary and crisp slate structural backgrounds. 

- **Primary (`#0A192F`):** Deep tactical navy utilized for primary headers, navigation frames, and foundational brand surfaces.
- **Secondary (`#1E3A5F`):** Muted operational blue for active states, secondary containers, and interactive hover feedback.
- **Tertiary (`#D97706`):** Secure high-visibility amber for warnings, pending summons, and non-critical operational flags.
- **Neutral (`#0F172A`):** Deep slate base paired with high-contrast light text (`#F8FAFC`) to ensure WCAG AAA compliance across all data grids and input fields.
- **Alert States:** Dedicated crimson (`#DC2626`) for urgent, high-priority warrants and immediate action summons.

## Typography

The typography system relies on **Inter** for exceptional legibility at small sizes and rapid scanning of dense data tables. Monospaced variants are utilized for badge numbers, timestamps, and summon identifiers to prevent optical alignment shifts.

- **Scale & Hierarchy:** Font sizes are strictly budgeted to maintain clear parent-child relationships between case files, incident summaries, and metadata.
- **Mobile Adjustments:** Headlines exceeding 24px automatically scale down on viewports under 640px to prevent awkward wrapping of critical case IDs.

## Layout & Spacing

This design system employs a **Fluid Grid** model engineered for high-density operational dashboards on desktop while scaling cleanly to mobile-first field units (tablets and rugged handhelds).

- **Spacing Rhythm:** Built on an 8px base grid unit, ensuring predictable and scannable vertical rhythm across complex forms and data logs.
- **Touch Targets:** All interactive elements maintain a minimum height and width of 48px to accommodate gloved interaction or fast-paced field usage.
- **Breakpoints:** Mobile (< 640px) stacks single-column case cards with bottom action sheets; Tablet (640px–1024px) introduces split-pane master-detail views; Desktop (> 1024px) displays full multi-column summon management grids with persistent telemetry sidebars.

## Elevation & Depth

Visual hierarchy is established primarily through **Low-contrast outlines** combined with strict tonal layering rather than heavy ambient shadows. 

- **Surface Tiers:** Surfaces utilize distinct slate background variations (`#0F172A` for base, `#1E293B` for cards, `#334155` for active modals) to denote Z-space layering.
- **Borders:** Crisp, high-contrast borders (`#475569`) frame all input fields, cards, and data containers, ensuring absolute clarity in direct sunlight or low-light vehicle cabins.
- **Focus States:** Active elements feature high-intensity cyan or amber luminous outlines to instantly draw the officer's eye to focused components.

## Shapes

A controlled **Soft** shape language (`0.25rem` base rounding, `0.5rem` for cards) provides a modern, professional structure without sacrificing the utilitarian seriousness required for law enforcement software.

- **Buttons & Inputs:** Consistent 4px border-radius (`rounded`) for tight, controlled alignment.
- **Cards & Modals:** 8px border-radius (`rounded-lg`) to cleanly delineate distinct functional modules without appearing overly casual or consumer-grade.
- **Badges & Status Tags:** Pill-shaped (`rounded-full`) specifically reserved for urgency levels, status markers, and numerical counters to draw immediate visual parsing.

## Components

- **Buttons:** High-contrast primary buttons utilize the deep navy or solid amber/red fill with bold label typography. Destructive actions (e.g., revoke summon) feature solid red backgrounds with white text. Secondary buttons utilize ghost outlines with stark white or slate text.
- **Chips & Status Badges:** Pill-shaped indicators featuring high-contrast text against secure background tints (Amber for pending/warning, Red for urgent/warrant, Slate for closed/archived).
- **Lists & Data Tables:** Compact, high-density row items featuring alternate row tinting for rapid scanning. Each row includes distinct visual anchors for summon ID, subject name, urgency flag, and timestamp.
- **Checkboxes & Radio Buttons:** Oversized hit areas (minimum 24px visual box) with stark white checkmarks on dark slate backgrounds to eliminate ambiguity during multi-select operations.
- **Input Fields:** Outlined text fields with persistent floating or top-aligned labels in high-contrast slate. Error states trigger immediate red border highlights with inline helper text.
- **Cards:** Structural containers housing individual summon records, featuring a prominent 2px accent border on the left edge color-coded to the item's urgency level.
- **Specialized Components:** 
  - *Urgency Banner:* Full-width persistent top ticker for APB or high-priority dispatch updates.
  - *Quick-Action Toolbar:* Floating bottom action bar for mobile field officers enabling instant summon generation or status toggling.