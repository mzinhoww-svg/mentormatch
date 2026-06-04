# Design System Inspired by Sicredi

## 1. Visual Theme & Atmosphere

The Sicredi design system embodies a clean, minimalist aesthetic rooted in accessibility and clarity. This is an error state design language that prioritizes direct communication, using substantial typography and generous whitespace to convey important information with authority and restraint. The visual personality is institutional yet human—favoring straightforward layouts over decorative elements, emphasizing readability and functional hierarchy. The system reflects a financial services orientation where trust, reliability, and transparency are paramount, achieved through deliberate use of high contrast, legible typefaces, and a restrained neutral palette.

**Key Characteristics**
- Minimal ornamentation with emphasis on functional clarity
- High-contrast dark text on light backgrounds for accessibility
- Generous whitespace supporting visual hierarchy
- Institutional typography conveying reliability
- Error-state focused design with direct communication
- Accessible default styling without gratuitous visual effects

## 2. Color Palette & Roles

### Primary
- **Primary Text** (`#000000`): Primary heading, body copy, and actionable text throughout the interface

### Neutral Scale
- **Black** (`#000000`): Core text color for all typographic elements, error messages, and prominent UI
- **White** (`#FFFFFF`): Default background, card surfaces, and text contrast

### Surface & Borders
- **Light Background** (`#F5F5F5`): Secondary background surfaces, error page background
- **Border Neutral** (`#E0E0E0`): Subtle dividers and container borders

### Semantic / Status
- **Error State** (`#D32F2F`): Error messages, warning indicators, and access denial notices
- **Text Secondary** (`#666666`): Secondary body text and helper content

## 3. Typography Rules

### Font Family
**Primary:** Times New Roman, Georgia, serif  
**Secondary:** -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif (fallback for body)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display/H1 | Times New Roman | 32px | 700 | 1.2 | 0px | Primary page heading, high impact |
| Heading H2 | Times New Roman | 28px | 700 | 1.3 | 0px | Section heading, secondary prominence |
| Heading H3 | Times New Roman | 24px | 700 | 1.3 | 0px | Subsection heading |
| Heading H4 | Times New Roman | 20px | 600 | 1.4 | 0px | Minor heading, label emphasis |
| Body | Times New Roman | 16px | 400 | 1.6 | 0px | Primary content text |
| Body Small | Times New Roman | 14px | 400 | 1.5 | 0px | Secondary content, descriptions |
| Caption | Times New Roman | 12px | 400 | 1.4 | 0px | Helper text, reference numbers |
| Link | Times New Roman | 16px | 400 | 1.6 | 0px | Underlined, primary text color |
| Button | Times New Roman | 16px | 600 | 1.5 | 0px | CTA text, medium weight |

### Principles
- **Serif Foundation:** Times New Roman establishes institutional credibility and formal authority appropriate for financial services
- **Weight Hierarchy:** Bold (700) for primary headings, medium (600) for CTAs, regular (400) for body content creates clear visual distinction
- **Line Height:** Generous spacing (1.4–1.6) ensures readability in error contexts and accessibility
- **Letter Spacing:** Neutral default spacing maintains legibility without introducing visual noise
- **Accessibility First:** High contrast ratio and serif typeface support users with low vision or dyslexia

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background:** `#000000`
- **Text Color:** `#FFFFFF`
- **Padding:** `12px 24px`
- **Border Radius:** `4px`
- **Border:** `1px solid #000000`
- **Font Size:** `16px`
- **Font Weight:** `600`
- **Hover State:** Background `#1A1A1A`, text `#FFFFFF`
- **Active State:** Background `#000000`, text `#FFFFFF`, `box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2)`
- **Disabled State:** Background `#CCCCCC`, text `#999999`, border `1px solid #CCCCCC`

#### Secondary Button
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Padding:** `12px 24px`
- **Border Radius:** `4px`
- **Border:** `1px solid #000000`
- **Font Size:** `16px`
- **Font Weight:** `600`
- **Hover State:** Background `#F5F5F5`, text `#000000`, border `1px solid #000000`
- **Active State:** Background `#EEEEEE`, text `#000000`
- **Disabled State:** Background `#FFFFFF`, text `#999999`, border `1px solid #CCCCCC`

#### Ghost Button
- **Background:** `transparent`
- **Text Color:** `#000000`
- **Padding:** `12px 24px`
- **Border Radius:** `4px`
- **Border:** `1px solid transparent`
- **Font Size:** `16px`
- **Font Weight:** `600`
- **Hover State:** Background `transparent`, text `#1A1A1A`, `text-decoration: underline`
- **Active State:** Background `transparent`, text `#000000`, `text-decoration: underline`
- **Disabled State:** Background `transparent`, text `#999999`

### Cards & Containers

#### Error Card
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E0E0E0`
- **Border Radius:** `8px`
- **Padding:** `32px`
- **Box Shadow:** `0 1px 3px rgba(0, 0, 0, 0.1)`
- **Text Color:** `#000000`

#### Content Container
- **Background:** `#F5F5F5`
- **Padding:** `24px`
- **Border Radius:** `4px`
- **Border:** `none`
- **Min Height:** `100vh` (error page context)

### Inputs & Forms

#### Text Input
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Border:** `1px solid #CCCCCC`
- **Border Radius:** `4px`
- **Padding:** `10px 12px`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Focus State:** Border `2px solid #000000`, `outline: none`
- **Error State:** Border `1px solid #D32F2F`, background `#FFFBFB`

#### Label
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Text Color:** `#000000`
- **Margin Bottom:** `6px`
- **Display:** `block`

#### Helper Text
- **Font Size:** `12px`
- **Font Weight:** `400`
- **Text Color:** `#666666`
- **Margin Top:** `4px`

### Navigation

#### Breadcrumb
- **Font Size:** `14px`
- **Font Weight:** `400`
- **Text Color:** `#000000`
- **Separator:** ` / ` in `#666666`
- **Current Item:** Bold (`600`), `#000000`
- **Link Color:** `#000000` with `text-decoration: underline`
- **Hover:** `#1A1A1A`, `text-decoration: underline`

#### Link
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Text Decoration:** `underline`
- **Hover State:** Color `#1A1A1A`
- **Active State:** Color `#000000`
- **Visited:** Color `#333333`

### Error Message Component
- **Background:** `#FFFBFB`
- **Border Left:** `4px solid #D32F2F`
- **Padding:** `16px 16px`
- **Border Radius:** `4px`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Text Color:** `#D32F2F`
- **Icon Color:** `#D32F2F`
- **Icon Size:** `24px`

## 5. Layout Principles

### Spacing System

**Base Unit:** `8px`

**Scale:**
- `4px` – Extra-tight spacing (rare)
- `8px` – Tight spacing between related elements
- `12px` – Compact spacing, form elements
- `16px` – Standard spacing, standard padding
- `24px` – Comfortable spacing, section separation
- `32px` – Generous spacing, major sections
- `48px` – Large spacing, layout breathing room
- `64px` – Extra-large spacing, distinct section separation

**Usage Context:**
- Button padding: `12px 24px`
- Card padding: `24px` to `32px`
- Section margin: `32px` to `64px`
- Input padding: `10px 12px`
- Text line-height-based spacing: varies by font size

### Grid & Container

- **Max Width:** `100%` (full width for error page context), `1200px` (standard container max)
- **Column Strategy:** 12-column grid with `16px` gutter
- **Container Padding:** `24px` on mobile, `32px` on tablet+
- **Section Pattern:** Full-width sections with centered inner containers
- **Error Page:** Centered content column, max `600px` width, centered vertically

### Whitespace Philosophy

The design prioritizes open, breathing whitespace to communicate importance and reduce cognitive load. Error messages and critical information are surrounded by generous margins, creating visual pause points. Content is never crowded; related elements share tighter `8px`–`12px` spacing, while distinct sections are separated by at least `32px`. This approach reflects institutional restraint and accessibility focus.

### Border Radius Scale

- `0px` – Sharp corners, structural elements
- `4px` – Input fields, buttons, small containers
- `8px` – Cards, larger containers, panels
- `12px` – Modals, popovers, prominent containers
- `50%` – Fully rounded, circular badges and avatars

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow, `box-shadow: none` | Text, flat sections, backgrounds |
| Level 1 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` | Cards, subtle containers, default cards |
| Level 2 | `box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15)` | Floating panels, hovered cards |
| Level 3 | `box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2)` | Modals, dropdowns, elevated content |
| Level 4 | `box-shadow: 0 12px 16px rgba(0, 0, 0, 0.25)` | Popovers, tooltips, top-level overlays |

**Shadow Philosophy:** The design uses subtle, minimal shadows to maintain accessibility and clarity. Shadows are small and soft, creating gentle depth separation without visual distraction. In error contexts, the restraint reflects institutional professionalism and focus on the message over decoration.

## 7. Do's and Don'ts

### Do

- **Use Times New Roman for headings** to establish institutional authority and trustworthiness
- **Maintain high contrast** between text and backgrounds (minimum `7:1` ratio for accessibility)
- **Employ generous whitespace** around error messages and critical information
- **Stack vertical content** clearly with consistent spacing and alignment
- **Use `#000000` for primary text** for maximum readability and institutional presence
- **Create distinct visual hierarchy** through typography weight and size, not color alone
- **Provide clear reference numbers and links** for access denied or error states
- **Test all interactive elements** for keyboard accessibility and screen reader compatibility
- **Use semantic HTML** (`<h1>`, `<button>`, `<nav>`) for structure and accessibility
- **Ensure all links are underlined** to meet accessibility guidelines for link identification

### Don't

- **Avoid decorative colors** that distract from core messaging
- **Don't use sans-serif for H1** unless necessary for brand consistency (serif preferred)
- **Don't reduce line-height** below `1.4` in body text
- **Avoid small font sizes** below `12px` for primary content
- **Don't place text** directly on images without contrast overlay
- **Avoid multiple font families** beyond primary and secondary
- **Don't use color alone** to communicate status (always include icons or text labels)
- **Avoid disabled states** that become unreadable (maintain sufficient contrast even when disabled)
- **Don't overcrowd forms** with too many fields per row
- **Avoid hover effects** that don't provide clear visual feedback or underline for links

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Device | Key Changes |
|------------|-------|--------|-------------|
| Mobile | 320px–479px | Phone (small) | Full-width layout, `16px` padding, stacked buttons, single column |
| Mobile | 480px–767px | Phone (large) | Full-width layout, `20px` padding, stacked inputs, single column |
| Tablet | 768px–1023px | Tablet | `24px` padding, 2-column grid where applicable, centered containers |
| Desktop | 1024px–1439px | Desktop | `32px` padding, 3-column grid, max-width `1200px`, standard layout |
| Desktop XL | 1440px+ | Desktop (large) | `48px` padding, max-width `1400px`, enhanced spacing |

### Touch Targets

- **Minimum Touch Target Size:** `48px × 48px` for all interactive elements (buttons, links, inputs)
- **Spacing Between Targets:** Minimum `8px` gap to avoid accidental overlap
- **Link Padding:** `8px` internal padding to expand clickable area
- **Button Padding Mobile:** `14px 20px` (increased from `12px 24px`) for easier touch interaction

### Collapsing Strategy

- **Error Card Padding:** `24px` on mobile, `32px` on tablet+
- **Container Width:** `100%` on mobile (full-width), `90%` on tablet, `1200px` max on desktop
- **Typography Scale:** H1 reduces from `32px` (desktop) to `28px` (tablet) to `24px` (mobile)
- **Spacing Reduction:** Section margins reduce by `8px` per breakpoint step downward
- **Buttons:** Full-width stack on mobile (`width: 100%`), side-by-side on tablet with `12px` gap
- **Input Fields:** `100%` width on mobile, flex grid on tablet/desktop

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Black (`#000000`)
- **Background:** White (`#FFFFFF`)
- **Secondary Background:** Light Gray (`#F5F5F5`)
- **Heading Text:** Black (`#000000`)
- **Body Text:** Black (`#000000`)
- **Error Message:** Red (`#D32F2F`)
- **Secondary Text:** Medium Gray (`#666666`)
- **Border:** Light Gray (`#E0E0E0`)
- **Disabled Text:** Light Gray (`#999999`)

### Iteration Guide

1. **Start with Typography:** All headings use Times New Roman, 700 weight. H1 is `32px` with `1.2` line-height. Body text is `16px`, weight `400`, line-height `1.6`.

2. **Apply Black Text First:** Use `#000000` for all primary content, headings, and interactive elements. Maintain high contrast—no light text on light backgrounds.

3. **Neutral Palette Only:** Primary color palette is black, white, and grays. Error state uses `#D32F2F`. No tertiary colors unless explicitly requested.

4. **Spacing in Multiples of 8px:** All padding, margins, and gaps must be `8px`, `12px`, `16px`, `24px`, `32px`, or `48px`. Never use arbitrary spacing values.

5. **Cards Have Subtle Shadows:** Use `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` for depth. Never use heavy shadows—keep elevation minimal and institutional.

6. **Border Radius: 4px or 8px:** Buttons and inputs use `4px`, cards use `8px`. No large rounded corners unless specified for modals (`12px`).

7. **Always Underline Links:** Links must have `text-decoration: underline` by default. Remove on hover is acceptable; never hide link underlines.

8. **Input Styling:** Borders are `1px solid #CCCCCC`, focus state is `2px solid #000000`, error is `#D32F2F` background with `#FFFBFB`.

9. **Error State Prominence:** Error messages use `#D32F2F` text, `#FFFBFB` background, `4px left border` in red. Include a clear reference number and support link.

10. **Touch Targets 48x48 Minimum:** All buttons, links, and interactive elements must be at least `48px × 48px` on touch devices, with `8px` minimum gap between targets.