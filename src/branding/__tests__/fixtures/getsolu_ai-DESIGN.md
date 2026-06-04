# Design System Inspired by Solu

## 1. Visual Theme & Atmosphere

Solu's design system embodies a modern, confident approach to recruitment technology with a distinctive bold energy. The visual language combines vibrant primary yellows with deep charcoals and pure blacks, creating high-contrast compositions that demand attention while maintaining professional credibility. The aesthetic balances playfulness with authority—evoking innovation and trustworthiness simultaneously. Generous use of whitespace, rounded pill-shaped buttons, and soft card containers convey approachability, while strong typography and strategic color blocking signal efficiency and speed. The overall atmosphere is one of dynamic optimization: a tech-forward platform that simplifies complex hiring processes through intelligent design and clear communication.

**Key Characteristics**
- Bold, high-contrast color blocking with yellow and charcoal
- Rounded, organic button shapes (pill-shaped CTAs)
- Clean typography with intentional hierarchy
- Generous whitespace and breathing room
- Soft card-based layouts with subtle borders
- Speed and efficiency messaging through visual design
- Modern, accessible, and professional tone

## 2. Color Palette & Roles

### Primary
- **Brand Yellow** (`#FFFF00`): Primary call-to-action buttons, accent highlights, notification banner backgrounds, visual anchors
- **Deep Charcoal** (`#000000`): Primary text, headings, dark UI elements, strong contrast elements

### Interactive
- **Button Yellow** (`#FFFF00`): Primary CTA buttons with dark borders, hover states maintain color with shadow depth
- **Button Outline Dark** (`#000000`): Button borders and strokes, 2px applied weight
- **Link Text** (`#000000`): Standard hyperlinks and navigation text

### Neutral Scale
- **Pure White** (`#FFFFFF`): Page backgrounds, card backgrounds, content containers
- **Off-White / Light Warm** (`#F5F5DC`): Secondary card backgrounds, subtle content sections (approximately `#F5F5DC`)
- **Light Gray / Pale Cream** (`#F0F0E6`): Tertiary card backgrounds, less prominent content areas (approximately `#F0F0E6`)

### Surface & Borders
- **Border Light** (`#E5E5E5`): 1px borders on cards and containers, subtle dividers
- **Overlay Neutral** (`#808080`): Subtle text overlays, muted supporting text (approximately 45% opacity charcoal)

### Semantic / Status
- **Success Green** (`#00B851`): Candidate qualification badges, positive indicators
- **Warning Orange** (`#FF8C42`): Attention states, secondary candidates
- **Info Blue** (`#3B82F6`): Secondary information states, candidate scores

## 3. Typography Rules

### Font Family
**Primary:** Poppins, sans-serif
**Fallback Stack:** Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
**Secondary:** Poppins (all display and UI use primary family)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / H1 | Poppins | 88px | 600 | 86px | 0px | Hero headlines, main value proposition |
| Heading / H2 | Poppins | 48px | 600 | 48px | 0px | Section headings, major content blocks |
| Subheading / H3 | Poppins | 18px | 600 | 28px | 0px | Card titles, subsection headers |
| Body Text | Poppins | 18px | 500 | 28px | 0px | Paragraph content, descriptions |
| Body Small | Poppins | 16px | 500 | 24px | 0px | Secondary body text, supporting content |
| Link / Button Text | Poppins | 16px | 600 | 24px | 0px | CTA buttons, navigation links |
| Label / Caption | Poppins | 12px | 600 | 16px | 0px | Small labels, badges, metadata |
| Span / Accent | Poppins | 16px | 500 | 16px | 0px | Inline emphasis, supporting spans |

### Principles
- **Weight Consistency:** Body text at 500 weight ensures readability; headings use 600 for distinction
- **Size Hierarchy:** Large 88px display, intermediate 48px sections, 18px–16px for content
- **Line Height:** Generous spacing (1.5–1.6× font size) enhances scannability and modern feel
- **Italic Emphasis:** Italicized secondary phrases (e.g., "recrutar por você") accent key messaging
- **Poppins Throughout:** Unified typeface reinforces modern, friendly brand voice

## 4. Component Stylings

### Buttons

#### Primary CTA Button
- **Background:** `#FFFF00`
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `12px 28px` (inferred from typical CTA proportions)
- **Border Radius:** `34px` (pill-shaped)
- **Border:** `2px solid #000000`
- **Box Shadow:** `0px 2px 0px 0px rgba(0, 0, 0, 0.2)` (sm shadow state)
- **Height:** `48px` (approximate)
- **Hover State:** Box shadow increases to `0px 3px 0px 0px rgba(0, 0, 0, 0.25)`, slight scale 1.02
- **Active State:** Box shadow reduces to `0px 1px 0px 0px rgba(0, 0, 0, 0.15)`, scale 0.98

#### Secondary Button
- **Background:** `transparent`
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `12px 24px`
- **Border Radius:** `34px`
- **Border:** `2px solid #000000`
- **Box Shadow:** `none`
- **Height:** `48px`
- **Hover State:** Background becomes `#F5F5DC`, maintains border

#### Close / Icon Button
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `0px`
- **Border Radius:** `50%` (circular)
- **Border:** `2px solid #000000`
- **Box Shadow:** `0px 2px 0px 0px rgba(0, 0, 0, 0.2)`
- **Width:** `28px`
- **Height:** `28px`
- **Hover State:** Box shadow increases to `0px 3px 0px 0px rgba(0, 0, 0, 0.25)`

### Cards & Containers

#### Primary Card (Light Cream)
- **Background:** `#F5F5DC`
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `40px`
- **Border Radius:** `34px`
- **Border:** `1px solid #E5E5E5`
- **Box Shadow:** `none`
- **Line Height:** `24px`
- **Heading:** H3 at 18px, 600 weight

#### Secondary Card (Pale White)
- **Background:** `#F0F0E6`
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `40px`
- **Border Radius:** `34px`
- **Border:** `1px solid #E5E5E5`
- **Box Shadow:** `none`
- **Line Height:** `24px`

#### Tertiary Card (Lightest)
- **Background:** `#FFFFFF` with light warm overlay
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `40px`
- **Border Radius:** `34px`
- **Border:** `1px solid #E5E5E5`
- **Box Shadow:** `none`
- **Line Height:** `24px`

### Inputs & Forms

#### Text Input
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Border:** `2px solid #E5E5E5`
- **Border Radius:** `8px`
- **Padding:** `12px 16px`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Line Height:** `24px`
- **Focus State:** Border becomes `#000000`, box shadow `0px 0px 0px 3px rgba(255, 255, 0, 0.1)`
- **Disabled State:** Background `#F5F5DC`, border `#E5E5E5`, color `#999999`

#### Select / Dropdown
- **Background:** `#FFFFFF`
- **Text Color:** `#000000`
- **Border:** `2px solid #E5E5E5`
- **Border Radius:** `8px`
- **Padding:** `12px 16px`
- **Font Size:** `16px`
- **Hover State:** Border becomes `#D3D3D3`

### Navigation

#### Header Navigation
- **Background:** `#FFFFFF` (transparent on scroll)
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Link Padding:** `8px 16px`
- **Hover State:** Text color becomes `#808080`, underline `1px solid #FFFF00`
- **Active State:** Text color `#000000`, underline `2px solid #FFFF00`

#### Navigation Link
- **Text Color:** `#000000`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `0px`
- **Border Radius:** `0px`
- **Border:** `none`
- **Box Shadow:** `none`
- **Hover State:** Color shifts to `#808080`, 2px underline in `#FFFF00`

### Badges / Status Indicators

#### Qualification Badge (Green)
- **Background:** `#00B851`
- **Text Color:** `#FFFFFF`
- **Font Size:** `12px`
- **Font Weight:** `600`
- **Padding:** `4px 12px`
- **Border Radius:** `16px`
- **Border:** `none`
- **Line Height:** `16px`

#### Warning Badge (Orange)
- **Background:** `#FF8C42`
- **Text Color:** `#FFFFFF`
- **Font Size:** `12px`
- **Font Weight:** `600`
- **Padding:** `4px 12px`
- **Border Radius:** `16px`
- **Border:** `none`

#### Info Badge (Blue)
- **Background:** `#3B82F6`
- **Text Color:** `#FFFFFF`
- **Font Size:** `12px`
- **Font Weight:** `600`
- **Padding:** `4px 12px`
- **Border Radius:** `16px`
- **Border:** `none`

### Progress Bars

#### Candidate Match Bar
- **Background Track:** `#E5E5E5`
- **Filled Track:** Status-based color (green `#00B851`, orange `#FF8C42`, blue `#3B82F6`)
- **Height:** `6px`
- **Border Radius:** `3px`
- **No Border:** `none`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Scale:**
- **Micro:** `4px` — Inline spacing, tight padding
- **Extra Small:** `8px` — Component internals, small gaps
- **Small:** `12px` — Button horizontal padding, minor spacing
- **Medium:** `16px` — Standard padding, text spacing
- **Large:** `24px` — Card padding, section spacing
- **Extra Large:** `40px` — Content container padding, major gaps
- **Double Extra Large:** `56px` — Section breaks
- **Triple Extra Large:** `96px` — Hero sections, major layout padding

**Usage Contexts:**
- Buttons: `12px` horizontal, `8px` vertical minimum
- Cards: `40px` internal padding
- Sections: `40px` to `96px` vertical spacing
- Text: `16px` to `24px` margins between blocks

### Grid & Container

- **Max Width:** `1200px` (inferred for main content)
- **Column Strategy:** 12-column grid recommended; Solu uses full-width cards and flex layouts
- **Side Margin:** `32px` to `64px` per side (depends on breakpoint)
- **Section Patterns:** Alternating full-width and contained layouts; cards stack vertically on smaller screens

### Whitespace Philosophy

Solu embraces generous whitespace to convey clarity and modernity. Large margins between sections, breathing room around headings, and uncluttered card layouts all contribute to a sense of space and efficiency. Whitespace guides the eye naturally through content and reduces cognitive load. Never crowd components; prioritize horizontal and vertical space over density.

### Border Radius Scale

- **None:** `0px` — Form inputs, bare elements
- **Small:** `8px` — Input fields, modest containers
- **Medium:** `26px` — Alternate card styling
- **Large:** `34px` — Primary cards, containers
- **Full / Pill:** `34px` or `999px` — Buttons, badges, pill-shaped CTAs

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | `box-shadow: none` | Cards, containers, backgrounds |
| Raised (sm) | `0px 2px 0px 0px rgba(0, 0, 0, 0.2)` | Primary CTA buttons, hover states |
| Raised (md) | `0px 3px 0px 0px rgba(0, 0, 0, 0.25)` | Button active/hover, elevated modals |
| Raised (lg) | `0px 6px 0px 0px rgba(0, 0, 0, 0.3)` | Floating elements, high-priority overlays |
| Raised (xl) | `0px 4px 0px 0px rgba(0, 0, 0, 0.2)` | Custom elevations, emphasis states |

**Shadow Philosophy:**

Solu employs a bold, offset shadow style—a clean `2px` to `6px` offset downward with controlled opacity, no blur. This creates a tactile, hand-drawn feel that complements the rounded button aesthetic. Shadows are dark and slightly saturated (`rgba(0, 0, 0, 0.2)–0.3)`) to ensure legibility without softness. Shadows are used sparingly: primarily on interactive elements and modals to indicate clickability and depth, never on flat cards or backgrounds.

## 7. Do's and Don'ts

### Do
- Use `#FFFF00` and `#000000` as primary color anchors for CTAs and headings
- Apply pill-shaped (`34px` border radius) buttons for all primary calls-to-action
- Maintain at least `40px` padding inside cards and containers
- Use Poppins 600 weight for all headings
- Leverage generous whitespace—never crowd sections
- Apply `2px` solid `#000000` borders to buttons; use shadow for depth, not blur
- Place `#00B851`, `#FF8C42`, and `#3B82F6` badges for candidate/status indicators
- Stack content vertically on mobile; prioritize single-column layouts below 768px
- Use the full typography hierarchy; don't skip sizes
- Test contrast ratios; ensure `#000000` text on light backgrounds meets WCAG AA

### Don't
- Mix button styles—stick to solid yellow with dark borders or secondary outline buttons
- Use blur-based shadows; keep shadows offset and sharp
- Overcrowd cards with visual elements; maintain internal whitespace
- Place text below `16px` without strong justification
- Use colors outside the defined palette for standard UI
- Apply border radius below `8px` to interactive elements
- Center-align body text; use left alignment for paragraphs
- Assume default line heights; always specify explicit values
- Place more than 2–3 CTA buttons per section
- Use drop shadows on flat card backgrounds

## 8. Responsive Behavior

### Breakpoints

| Breakpoint Name | Width | Key Changes |
|-----------------|-------|-------------|
| Mobile | 320px–479px | Single-column layout, `24px` side padding, `16px` vertical spacing, `48px` button width full, font sizes reduce by 1–2 steps |
| Tablet (Small) | 480px–767px | Two-column grid for cards, `32px` side padding, `32px` gaps, H1 reduces to 56px |
| Tablet (Large) | 768px–1023px | Three-column grid available, `40px` side padding, H1 at 72px |
| Desktop | 1024px+ | Full 12-column grid, max width `1200px`, original font sizes, `40px–64px` side padding |

### Touch Targets

- **Minimum Interactive Size:** `44px × 44px` (buttons, close icons)
- **Recommended Button Height:** `48px` for primary CTAs
- **Link Tap Area:** `44px` minimum; use padding to expand if needed
- **Icon Button:** `28px–44px` depending on importance
- **Form Input:** `44px` minimum height for mobile, `48px` desktop

### Collapsing Strategy

- **Mobile (< 480px):** Full-width single-column; cards stack vertically with `24px` gaps; buttons expand to 100% width; heading sizes reduce (H1 → 56px, H2 → 32px)
- **Tablet (480px–767px):** Two-column grid for content; cards 50% width with `16px` gap; heading sizes transition (H1 → 64px); maintain `32px` side padding
- **Desktop (768px+):** Three-column layouts, full container width capped at 1200px; buttons remain fixed width (`160px–200px` for primary CTAs); full typography scale active

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Brand Yellow (`#FFFF00`) with dark text (`#000000`) and `2px solid #000000` border
- **Background:** Pure White (`#FFFFFF`) or Off-White (`#F5F5DC`)
- **Heading Text:** Deep Charcoal (`#000000`), 600 weight
- **Body Text:** Deep Charcoal (`#000000`), 400–500 weight
- **Link Text:** Deep Charcoal (`#000000`), underline on hover
- **Card Background:** Off-White (`#F5F5DC`), Pale (`#F0F0E6`), or White (`#FFFFFF`)
- **Borders:** Light Gray (`#E5E5E5`), 1px
- **Success:** Green (`#00B851`)
- **Warning:** Orange (`#FF8C42`)
- **Info:** Blue (`#3B82F6`)

### Iteration Guide

1. **Color Blocks:** Always use `#FFFF00` for primary CTAs with `#000000` text and borders; never invert or desaturate.
2. **Button Shape:** All primary buttons are pill-shaped (`border-radius: 34px`); secondary buttons also use 34px radius.
3. **Typography:** Poppins only; h1 is always `88px 600 weight` with `86px` line height; body is `18px 500 weight 28px` line height.
4. **Spacing:** Base is `4px`; standard padding is `40px` for cards, `12px` for buttons (horizontal), `16px` for forms.
5. **Shadows:** Use offset shadows only (`2px–6px` downward, `rgba(0,0,0,0.2–0.3)`); no blur; primarily on interactive elements.
6. **Cards:** Always `34px` border radius, `1px solid #E5E5E5` border, light background (`#F5F5DC`, `#F0F0E6`, or `#FFFFFF`).
7. **Responsive:** Mobile is single-column, tablet two-column, desktop three-column; collapse fonts and spacing proportionally.
8. **Contrast:** Ensure `#000000` on light backgrounds and `#FFFFFF` text on dark/color backgrounds; test WCAG AA.
9. **Whitespace:** Prioritize generous margins; never squeeze components together; respect section breaks of `56px–96px`.
10. **Consistency:** Replicate the exact px values from typography table; infer missing states (hover, active, focus) from button shadow and scale patterns.