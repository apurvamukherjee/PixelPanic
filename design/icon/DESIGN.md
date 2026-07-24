---
name: Pixelpanic
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
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#ffafd3'
  on-tertiary: '#620040'
  tertiary-container: '#e364a7'
  on-tertiary-container: '#560038'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  player-tag:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  toolbar-gap: 12px
  canvas-margin: 32px
---

## Brand & Style
The design system is engineered for a high-octane, social gaming environment. It balances the high energy of competitive play with a sophisticated, "pro-tool" aesthetic. The brand personality is electric, precise, and social.

The style is **Modern-Electric**, a fusion of deep minimalism and vibrant glassmorphism. It utilizes an obsidian-grade dark mode to make high-saturation accent colors "pop," ensuring that the drawing canvas remains the focal point while the surrounding UI feels like a premium, futuristic command center. The emotional response is one of excitement and clarity, moving away from "toy-like" gaming interfaces toward a sharp, digital-first experience.

## Colors
The palette is rooted in a "Deep Space" hierarchy. The primary background uses a near-black charcoal to minimize eye strain during long sessions. 

- **Electric Purple (Primary):** Used for primary actions, active drawing states, and "Drawing Now" status.
- **Neon Cyan (Secondary):** Used for the "Guessing" phase, player highlights, and secondary tools.
- **Hot Pink (Tertiary):** Reserved for high-energy moments, winner announcements, and "Waiting" alerts.
- **Feedback Loop:** Success Green and Error Red are highly saturated to provide instant cognitive feedback during the fast-paced guessing phase.

## Typography
The typography strategy prioritizes immediate legibility and character. **Sora** provides a geometric, tech-forward feel for headings and player names, reinforcing the "modern digital" vibe. **Inter** handles the heavy lifting of chat logs and instructions with its neutral, highly readable letterforms. **JetBrains Mono** is used sparingly for technical labels, timers, and point tallies to evoke a sense of precision and "pixel-perfect" data.

## Layout & Spacing
This design system utilizes a **Fluid Grid with Fixed Overlays**. 

- **Desktop:** A 12-column structure where the Drawing Canvas occupies the central 8 columns, with Chat/Players in the remaining 4. 
- **Mobile:** A vertical stack. The canvas remains at the top (aspect ratio locked 4:3), with a slide-up "Chat & Guesses" sheet.
- **Rhythm:** An 8px linear scale governs all padding and margins. Toolbars are floated using absolute positioning to maximize drawing real estate.

## Elevation & Depth
Depth is achieved through **Glassmorphism and Tonal Layering**. 

1. **Base Layer:** `#0F172A` (Solid) - The main application background.
2. **Surface Layer:** `#1E293B` (Solid) - Panels, sidebars, and the canvas container.
3. **Overlay Layer:** Semi-transparent versions of the neutral color with a `12px` backdrop blur. Used for the drawing toolbar and modal dialogs to maintain context of the game behind them.
4. **Highlights:** A `1px` inner stroke (white at 10% opacity) is applied to all cards and buttons to simulate a "beveled glass" edge, catching the virtual light.

## Shapes
The shape language is **Rounded and Friendly**. 
A standard radius of `0.5rem (8px)` is used for functional elements like input fields and small buttons. Larger containers, such as the drawing canvas and player avatars, use `1rem (16px)` to create a softer, more approachable feel that contrasts with the "sharp" high-energy colors.

## Components

### Buttons
- **Primary:** High-saturation (Purple/Cyan) with white text. On hover, they emit a soft outer glow of the same color.
- **Icon Buttons:** Circular or slightly rounded squares with glassmorphic backgrounds.

### Player Avatars & Status
- **Avatar:** Circular frame with a `3px` thick border. Border color changes based on status: 
    - *Purple:* Drawing
    - *Cyan:* Guessing/Active
    - *Gray:* Waiting/Idle
- **Score Badge:** A small JetBrains Mono label anchored to the bottom-right of the avatar.

### Drawing Toolbar
- **Container:** Floated glassmorphic bar.
- **Tool Selection:** Active tools use a "pressed" neomorphic look—darker background with an inner shadow and a primary color glow.
- **Brush Size:** A slider with a variable-width track that grows thicker toward the right.

### Chat & Guessing Input
- **Input Field:** Deep charcoal background with a Neon Cyan focus ring.
- **Guess Bubbles:** Correct guesses are highlighted in Success Green with a subtle "pop" animation.

### Status Indicators
- **Timer:** Large, centered display using JetBrains Mono. When under 10 seconds, the color shifts to Hot Pink with a pulse animation.