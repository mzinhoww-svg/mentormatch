# Design System Inspired by Salário Transparente

## 1. Visual Theme & Atmosphere

Salário Transparente embodies a modern, professional, and trustworthy design aesthetic built for transparency and clarity. The system prioritizes clean lines, bold typography, and a vibrant primary blue that conveys confidence and action. With its generous whitespace, neutral foundation, and carefully orchestrated color hierarchy, this design system creates an accessible, approachable experience that encourages users to engage with sensitive salary data. The visual language balances enterprise professionalism with friendly modernity, using strong geometric forms and purposeful motion to guide users toward key conversion moments while maintaining the calm, secure atmosphere essential for privacy-focused features.

**Key Characteristics**
- Bold, sans-serif typography anchored by a distinctive display font (Parkinsans)
- Vibrant cobalt blue as the primary action color, creating immediate visual hierarchy
- Generous whitespace and light neutral surfaces that reduce cognitive load
- Subtle shadow system for depth without visual noise
- High contrast text on light backgrounds for accessibility
- Clean, minimalist card-based layouts with soft borders
- Responsive components that adapt fluidly across devices
- Emphasis on data visualization and comparison workflows

## 2. Color Palette & Roles

### Primary
- **Primary Action** (`#0000FF`): Primary call-to-action buttons, key navigation links, and interactive highlights; used extensively for "Cadastrar" and "Compartilhar Salário" CTAs
- **Primary Darker** (`#1D4ED8`): Hover and active states for primary buttons, providing visual feedback without color shift

### Accent Colors
- **Green Success** (`#008000`): Positive outcomes, salary increases, and confirmatory states
- **Bright Green** (`#2E7D32`): Alternative accent for growth-focused content

### Interactive
- **Blue Outline** (`#0000FF` at 60% opacity): Secondary buttons with border treatment, creating visual hierarchy without full saturation
- **Grey Interactive** (`#6C757D`): Disabled states and muted interactive elements

### Neutral Scale
- **Dark Charcoal** (`#14181F`): Primary text, headings, and high-contrast content; used 305 times as the default text color
- **Mid Grey** (`#5C6B8A`): Secondary text, descriptions, and reduced-emphasis content; used 121 times
- **Light Grey** (`#E7E9EF`): Default borders, dividers, and subtle background tints; used 520 times
- **Off-White** (`#F8FAFC`): Secondary background surfaces and subtle distinction from pure white
- **Pure White** (`#FFFFFF`): Primary background, card surfaces, and maximum contrast areas
- **Pale Background** (`#F9FAFB`): Tertiary background tint for sections requiring visual separation

### Surface & Borders
- **Border Default** (`#E7E9EF`): Standard card borders, input fields, and container divisions
- **Border Subtle** (`#CCCCCC`): Muted borders for disabled or secondary elements

### Semantic / Status
- **Error Critical** (`#DC2626`): Primary error states and destructive actions
- **Error Alert** (`#EF4444`): Warning-level alerts and secondary error feedback
- **Error Dark** (`#B91C1C`): High-emphasis error states requiring immediate attention
- **Info Light** (`#EFF6FF`): Information background highlights
- **Danger Light** (`#FEF2F2`): Danger/error background highlights

## 3. Typography Rules

### Font Family
**Primary Display Font:** Parkinsans  
Fallback stack: `Parkinsans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Secondary & Body Font:** Inter  
Fallback stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | Parkinsans | `72px` | `600` | `72px` | `0px` | Maximum impact for page headlines; example: "Você está sendo pago o que realmente merece?" |
| Heading 1 | Parkinsans | `72px` | `600` | `72px` | `0px` | Section titles and major content divisions |
| Heading 2 | Parkinsans | `30px` | `600` | `36px` | `0px` | Subsection titles and card headers |
| Heading 3 | Inter | `18px` | `600` | `28px` | `0px` | Card titles, component headers, and list item headers |
| Body | Inter | `20px` | `400` | `28px` | `0px` | Primary body text, descriptions, and narrative content |
| Body Small | Inter | `16px` | `400` | `24px` | `0px` | Secondary descriptions, form labels, and support text |
| Label / Span | Inter | `14px` | `500` | `20px` | `0px` | Input labels, badges, button text, captions |
| Link | Inter | `16px` | `400` | `24px` | `0px` | Navigation links, inline links, and hypertext |

### Principles
- **Contrast-Driven Hierarchy:** Font weight and size changes create immediate visual priority without color dependency
- **Generous Line Heights:** 1.2–1.4x multipliers reduce cognitive load and improve scannability
- **Parkinsans for Headlines:** Bold, confident display font reserved for primary messaging and hero sections; creates brand recognition
- **Inter for Body & UI:** Clean, highly legible sans-serif for all body text, UI labels, and interactive elements; optimized for screen reading
- **Semantic Sizing:** Each size tier maps to a specific UI role, preventing arbitrary font-size assignments
- **Accessibility First:** Minimum `14px` for clickable text; `20px` body text improves readability for all users

## 4. Component Stylings

### Buttons

**Primary Button (Filled)**
- Background: `#0000FF`
- Text Color: `#FFFFFF`
- Font Size: `14px`
- Font Weight: `600`
- Font Family: `Inter`
- Padding: `8px 16px`
- Border Radius: `10px`
- Border: `none`
- Height: `40px`
- Line Height: `20px`
- Box Shadow: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px`
- **Hover State:** Background: `#1D4ED8`, Shadow: `rgba(0, 0, 0, 0.2) 0px 4px 8px 0px`
- **Active State:** Background: `#0000CC`, no shadow change
- **Disabled State:** Background: `#CCCCCC`, Text Color: `#6C757D`, Cursor: `not-allowed`

**Secondary Button (Outlined)**
- Background: `transparent`
- Text Color: `#0000FF`
- Font Size: `14px`
- Font Weight: `600`
- Font Family: `Inter`
- Padding: `8px 16px`
- Border Radius: `10px`
- Border: `1px solid rgba(0, 0, 255, 0.6)`
- Height: `40px`
- Line Height: `20px`
- Box Shadow: `none`
- **Hover State:** Background: `rgba(0, 0, 255, 0.05)`, Border Color: `#0000FF`
- **Active State:** Background: `rgba(0, 0, 255, 0.1)`, Border Color: `#1D4ED8`
- **Disabled State:** Border Color: `#CCCCCC`, Text Color: `#6C757D`

**Ghost Button (Text Only)**
- Background: `transparent`
- Text Color: `#14181F`
- Font Size: `14px`
- Font Weight: `500`
- Font Family: `Inter`
- Padding: `8px 16px`
- Border Radius: `10px`
- Border: `none`
- Height: `40px`
- Line Height: `20px`
- Box Shadow: `none`
- **Hover State:** Background: `rgba(0, 0, 0, 0.05)`, Text Color: `#0000FF`
- **Active State:** Background: `rgba(0, 0, 0, 0.1)`, Text Color: `#1D4ED8`

### Cards & Containers

**Standard Card**
- Background: `#FFFFFF`
- Text Color: `#14181F`
- Font Size: `16px`
- Font Weight: `400`
- Font Family: `Inter`
- Padding: `20px 24px`
- Border Radius: `12px`
- Border: `1px solid #E7E9EF`
- Box Shadow: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`
- Line Height: `24px`
- **Hover State (Interactive):** Border Color: `#5C6B8A`, Box Shadow: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px`

**Elevated Card (CTA)**
- Background: `#0000FF`
- Text Color: `#FFFFFF`
- Font Size: `16px`
- Font Weight: `500`
- Font Family: `Inter`
- Padding: `32px 28px`
- Border Radius: `16px`
- Border: `none`
- Box Shadow: `rgba(0, 0, 0, 0.2) 0px 4px 8px 0px`
- Line Height: `24px`
- **Hover State:** Background: `#1D4ED8`, Box Shadow: `rgba(0, 0, 0, 0.25) 0px 8px 12px 0px`

**Salary Data Card**
- Background: `#FFFFFF`
- Text Color: `#14181F`
- Border Radius: `12px`
- Border: `1px solid #E7E9EF`
- Padding: `16px 16px`
- Box Shadow: `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`
- Salary Amount Font: `Inter`, `18px`, `600`, `#008000` (green for positive salary context)
- Supporting Text Font: `Inter`, `14px`, `400`, `#5C6B8A`

### Inputs & Forms

**Text Input (Default)**
- Background: `#FFFFFF`
- Text Color: `#14181F`
- Font Size: `16px`
- Font Weight: `400`
- Font Family: `Inter`
- Padding: `12px 16px`
- Border Radius: `8px`
- Border: `1px solid #C1C1C1`
- Height: `40px`
- Line Height: `24px`
- Box Shadow: `none`
- **Focus State:** Border Color: `#0000FF`, Box Shadow: `0 0 0 3px rgba(0, 0, 255, 0.1)`
- **Error State:** Border Color: `#DC2626`, Background: `#FEF2F2`
- **Disabled State:** Background: `#F8FAFC`, Border Color: `#E7E9EF`, Color: `#5C6B8A`, Cursor: `not-allowed`

**Input Label**
- Font Family: `Inter`
- Font Size: `14px`
- Font Weight: `500`
- Color: `#14181F`
- Margin Bottom: `8px`
- Display: `block`

**Input Helper Text**
- Font Family: `Inter`
- Font Size: `12px`
- Font Weight: `400`
- Color: `#5C6B8A`
- Margin Top: `4px`

### Navigation

**Header Navigation**
- Background: `transparent` (or `#FFFFFF` on scroll)
- Text Color: `#14181F`
- Font Size: `16px`
- Font Weight: `400`
- Font Family: `Inter`
- Padding: `0px` (flex-based layout)
- Height: `40px` (base link height)
- Line Height: `24px`
- Border: `none`
- **Active Link:** Font Weight: `600`, Color: `#0000FF`
- **Hover Link:** Color: `#0000FF`, Border Bottom: `2px solid #0000FF`
- **Badge (New):** Background: `#0000FF`, Color: `#FFFFFF`, Font Size: `12px`, Font Weight: `600`, Padding: `4px 8px`, Border Radius: `4px`

**Mobile Navigation (Inferred)**
- Breakpoint: `< 768px`
- Toggle Button: `40px × 40px`, Background: `transparent`, Icon Color: `#14181F`
- Menu Overlay: Background: `rgba(255, 255, 255, 0.98)`, Full-screen height
- Menu Items: Font Size: `18px`, Padding: `16px 20px`, Border Bottom: `1px solid #E7E9EF`

## 5. Layout Principles

### Spacing System
**Base Unit:** `4px`

**Scale:**
- `4px`: Micro spacing (icon padding, tight grouping)
- `8px`: Compact spacing (label-to-input gaps, button icon margins)
- `12px`: Small spacing (section gutters, form field gaps)
- `16px`: Default padding (component interiors, standard margins)
- `20px`: Medium spacing (card padding, subsection gaps)
- `24px`: Standard gap (flex/grid spacing, between grouped elements)
- `28px`: Large spacing (major section separations)
- `32px`: Extra large (section margins, vertical rhythm emphasis)
- `40px`: XL spacing (hero section padding, maximum content breathing room)
- `48px`: XXL spacing (major layout blocks, hero-to-content transition)
- `52px`: Grid gap (multi-column card layouts)
- `64px`: Maximum (full-page section spacing, hero section bottom margin)

**Usage Context:**
- Micro (`4px–8px`): Icon-text pairing, compact lists, tight form layouts
- Small (`12px–16px`): Form fields, small cards, navigation items
- Standard (`20px–24px`): Card padding, body text spacing, component groups
- Large (`28px–32px`): Section margins, major content blocks
- Extra Large (`40px–64px`): Hero sections, full-page layout rhythm

### Grid & Container
**Max Width:** `1200px` (primary content container)  
**Padding Horizontal:** `20px` on mobile, `40px` on tablet, `48px` on desktop

**Column Strategy:**
- Mobile: Single column, full width minus padding
- Tablet: 2 columns for data cards, 8px grid
- Desktop: 3–4 columns for salary cards, 24px gap between columns

**Section Patterns:**
- Hero Section: Full viewport height, centered single column, heading centered, dual CTAs below
- Data Grid: 3 columns on desktop, 2 on tablet, 1 on mobile; 24px gap; cards at equal heights
- Navigation: Horizontal flex layout, space-between alignment, max-width 1200px

### Whitespace Philosophy
Salário Transparente employs generous whitespace as a trust signal and cognitive aid. Large margins around key sections (hero, CTAs) create breathing room and direct focus. Card-based designs include 20px padding to separate content from edges. Vertical rhythm is maintained through consistent spacing multiples (4px base). Negative space isolates critical information (salary amounts, CTAs) and reduces visual overwhelm, essential for a platform handling sensitive data comparisons.

### Border Radius Scale
- `2px`: Micro-radius for badges and small pills (e.g., "Novo" badge)
- `8px`: Input fields and small form elements
- `10px`: Primary buttons and secondary buttons
- `12px`: Standard card containers and medium components
- `16px`: Large cards and elevated CTAs
- `27.5px`: Pill-shaped buttons (full-height rounded buttons)
- `9999px`: Fully rounded elements (circular avatars, toggle switches)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (No Shadow) | No box-shadow | Inputs, ghost buttons, disabled states, minimal hierarchy |
| Subtle (sm) | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` | Default cards, standard containers, base-level elevation |
| Medium (md) | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px` | Primary buttons, button hover states, elevated cards, tooltips |
| Strong (lg) | `rgba(0, 0, 0, 0.2) 0px 4px 8px 0px` | Modals, floating CTAs, premium card containers, maximum prominence |

**Shadow Philosophy:**
Salário Transparente uses a subtle, layered shadow system inspired by material design principles. Shadows are reserved for interactive or elevated content, never applied to text or disabled elements. The shadow palette uses very low opacity (`0.05–0.2`) to maintain the light, airy aesthetic while providing depth cues. Shadows increase slightly on hover/active states to confirm interaction feedback. This restraint prevents visual noise while maintaining clear component hierarchy, essential for a data-comparison interface where clarity is paramount.

## 7. Do's and Don'ts

### Do
- **Do use Parkinsans for all display text** (headings h1–h2) to reinforce brand identity and create visual hierarchy
- **Do apply `#0000FF` blue exclusively for primary CTAs** (e.g., "Cadastrar", "Compartilhar Salário") to drive conversions
- **Do maintain `#14181F` text on light backgrounds** for maximum contrast and accessibility (WCAG AA+ compliance)
- **Do use the 4px spacing scale religiously** — all margins and padding must be multiples of `4px` for visual consistency
- **Do apply subtle shadows (`sm` level) to cards** to create depth without visual clutter
- **Do reserve `#E7E9EF` for borders and dividers** to maintain the light, airy aesthetic
- **Do implement generous padding (`20px–24px`) inside cards** to reduce cognitive density
- **Do use `rgba(0, 0, 255, 0.6)` borders on secondary buttons** to create visual hierarchy without filled backgrounds
- **Do stack mobile layouts single-column** and progressively increase columns on larger breakpoints
- **Do include hover states on all interactive elements** with `#1D4ED8` or `rgba(0, 0, 0, 0.05)` background shifts

### Don't
- **Don't use colors outside the defined palette** — all greys, blues, greens, and reds must match exact hex values
- **Don't apply shadows to text, icons, or disabled elements** — reserve shadows for interactive containers only
- **Don't use Inter font for display headings** — Parkinsans is mandatory for h1 and h2 only
- **Don't center-align body text paragraphs** — keep body text left-aligned for scannability
- **Don't use arbitrary border radius values** — stick to the defined scale (`2px`, `8px`, `10px`, `12px`, `16px`, `27.5px`, `9999px`)
- **Don't add padding inside buttons beyond `8px 16px`** — keep button heights at `40px` for touch targets
- **Don't mix font weights arbitrarily** — use only `400`, `500`, and `600` for hierarchy
- **Don't apply color to text links without underline on hover** — use `#0000FF` with border-bottom `2px solid` on focus/hover
- **Don't use more than 2 seconds of animation duration** for any transition — keep interactions snappy
- **Don't reduce spacing below `8px` between major elements** — whitespace is a core design principle
- **Don't use `#0000FF` for non-interactive text** — reserve pure blue for actionable CTAs and links only

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | `320px–639px` | Single-column layout; h1 `48px`; padding `16px`; buttons full-width; nav stacked; h2 `24px` |
| Tablet | `640px–1023px` | 2-column card grid; h1 `56px`; padding `24px`; dual CTAs inline; nav horizontal; h2 `28px` |
| Desktop | `1024px–1919px` | 3-column card grid; h1 `72px`; padding `40px–48px`; max-width `1200px`; all desktop features |
| Wide | `1920px+` | 4-column card grid; centered max-width `1200px`; lateral padding `64px` |

### Touch Targets
- **Minimum Height:** `40px` for all buttons, links, and form inputs (WCAG 2.5.5)
- **Minimum Width:** `40px` for icon buttons
- **Minimum Tap Spacing:** `8px` gap between adjacent interactive elements
- **Link Underline:** `2px` border-bottom on hover/focus; color `#0000FF`
- **Cursor:** `pointer` on all clickable elements; `not-allowed` on disabled

### Collapsing Strategy
- **Mobile (< 640px):**
  - Collapse multi-column grids to single column
  - Reduce h1 from `72px` to `48px`; maintain line-height `48px`
  - Stack hero CTAs vertically (flex-direction: column)
  - Change navigation to hamburger menu; overlay fullscreen
  - Reduce padding from `40px` to `16px`
  - Increase touch targets by reducing button padding slightly while maintaining `40px` height
  - Collapse 3-column salary card grids to 1 column

- **Tablet (640px–1023px):**
  - Collapse 3-column grids to 2 columns
  - Increase h1 to `56px`; maintain readability on medium screens
  - Position hero CTAs horizontally with `12px` gap
  - Show horizontal navigation; hamburger only if 6+ items
  - Increase padding to `24px`
  - Maintain `24px` gap between grid items

- **Desktop (1024px+):**
  - All full layouts; 3–4 column grids
  - Full h1 `72px`; all typography at maximum sizes
  - Horizontal layout for all multi-element sections
  - Padding `40px–48px`
  - `24px–52px` grid gaps depending on content density

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Blue (`#0000FF`)
- **Primary CTA Hover:** Darker Blue (`#1D4ED8`)
- **Error / Danger:** Red (`#DC2626`)
- **Success / Positive:** Green (`#008000`)
- **Background (Primary):** White (`#FFFFFF`)
- **Background (Secondary):** Off-White (`#F8FAFC`)
- **Heading Text:** Dark Charcoal (`#14181F`)
- **Body Text:** Dark Charcoal (`#14181F`)
- **Secondary Text:** Mid Grey (`#5C6B8A`)
- **Borders / Dividers:** Light Grey (`#E7E9EF`)
- **Disabled State:** Grey (`#6C757D`)

### Iteration Guide

1. **Typography Foundation:** Use Parkinsans (`600` weight) exclusively for h1 and h2; use Inter (`400`–`600` weight) for all body, UI text, buttons, and labels.

2. **Color Hierarchy:** Apply `#0000FF` only to primary CTAs and interactive links. Use `#14181F` as default text. Reserve `#5C6B8A` for secondary/muted content. All neutral backgrounds must be `#FFFFFF` or `#F8FAFC`.

3. **Spacing Multiples:** Every margin and padding value must be a multiple of `4px` (`8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `52px`, `64px`). No arbitrary spacing.

4. **Button Pattern:** Standard button = `40px` height, `8px 16px` padding, `#0000FF` background, `#FFFFFF` text, `10px` radius, `md` shadow on hover. Secondary buttons add `1px solid rgba(0, 0, 255, 0.6)` border, transparent background.

5. **Card Base:** All cards = `#FFFFFF` background, `1px solid #E7E9EF` border, `12px` radius, `sm` shadow, `20px` padding minimum. Elevated CTAs use `#0000FF` background, `#FFFFFF` text, `16px` radius, `lg` shadow.

6. **Input Styling:** Inputs = `40px` height, `12px 16px` padding, `#FFFFFF` background, `1px solid #C1C1C1` border, `8px` radius. On focus: `#0000FF` border, `3px rgba(0, 0, 255, 0.1)` box-shadow.

7. **Responsive Grid:** Mobile = 1 column; Tablet = 2 columns with `24px` gap; Desktop = 3 columns with `24px` gap; Wide = 4 columns. All grids centered with `max-width: 1200px`.

8. **Navigation Link States:** Default = `#14181F`, `400` weight. Hover = `#0000FF`, `2px solid #0000FF` border-bottom. Active = `#0000FF`, `600` weight. Badges = `#0000FF` background, `#FFFFFF` text, `4px` radius.

9. **Elevation System:** No shadow = flat; `sm` shadow = default cards; `md` shadow = button hover, elevated cards; `lg` shadow = modals, floating CTAs. Never shadow text or disabled elements.

10. **Accessibility Checklist:** Text must be `#14181F` on `#FFFFFF` (21:1 contrast). Buttons ≥ `40px` height/width. Link underlines on hover. Error text = `#DC2626`. Always include focus states with `box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.1)` on interactive elements.