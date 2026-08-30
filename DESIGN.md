# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkle, elegante Red-Carpet-/Hollywood-Optik mit tiefem Anthrazit, Champagner-Gold-Akzent und warmem Creme; glamourös, aber zurückhaltend und klar lesbar.

## Colors

- `--color-bg`: **#161211**
- `--color-surface`: **#1f1a18**
- `--color-surface_raised`: **#2a2320**
- `--color-fg`: **#f5efe6**
- `--color-muted`: **#a99e92**
- `--color-accent`: **#d4af37**
- `--color-accent_hover`: **#e2c65c**
- `--color-accent_active`: **#b8962c**
- `--color-border`: **#3a322b**
- `--color-danger`: **#e06c5c**
- `--color-success`: **#7fc98f**
- `--color-overlay`: **rgba(22,18,17,0.72)**

## Typography

- `font_family`: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
- `heading_font_family`: Georgia, 'Times New Roman', Times, serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: 12px, 14px, 16px, 18px, 24px, 32px, 40px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

min-height 44px, padding 12px 24px, radius md, font-weight 600, transition 120ms. Varianten: primary (bg=accent, color=#161211, border=1px solid accent; hover=accent_hover; active=accent_active + transform translateY(1px); disabled=opacity 0.45, pointer-events none), secondary (bg=transparent, color=fg, border=1px solid border; hover=border-accent, color=accent; active=bg=surface_raised; disabled=opacity 0.45), danger (bg=transparent, color=danger, border=1px solid danger; hover=bg=danger, color=#161211).

### Card

Garderoben-/Outfit-Karte: bg=surface, border=1px solid border, radius=lg, padding 16px, box-shadow 0 8px 24px rgba(0,0,0,0.25); hover=border-accent + translateY(-2px); Bildbereich mit aspect-ratio 3/4, radius md, object-fit cover.

### Input

min-height 44px, padding 10px 14px, bg=surface_raised, border=1px solid border, radius md, color=fg, placeholder=muted; focus=border-accent + box-shadow 0 0 0 3px rgba(212,175,55,0.18); invalid=border-danger.

### FilterChip

min-height 36px, padding 8px 16px, radius pill, border=1px solid border, bg=surface, color=muted, font-size 14px; active=bg=accent, color=#161211, border=accent; hover=border-accent.

### NavBar

sticky top, bg=rgba(22,18,17,0.92) + backdrop-filter blur(8px), border-bottom 1px solid border, height 64px; Brand als Serifen-Headline in accent; Links padding 8px 12px, color=muted, hover/active=fg + accent underline.

### Modal

bg=surface, border=1px solid border, radius=lg, padding 24px, max-width 520px, z-index 50; Overlay=overlay; Header als Serife, Schließen-Button min 44px touch target.

### Toast

unten rechts fixiert, bg=surface_raised, border-left 3px solid, radius md, padding 12px 16px, box-shadow 0 12px 32px rgba(0,0,0,0.35); success=border-success, error=border-danger, info=border-accent; Auto-Dismiss 4s.

### EmptyState

zentriert, padding 48px 24px, Serifen-Headline in fg, Beschreibung in muted, optionaler Button; dezente goldene Trennlinie 1px unter der Headline.

### ImageTile

Quadratische Vorschau, radius md, bg=surface_raised, border=1px solid border, object-fit cover; Hover zeigt Overlay mit Icon und Name; Ladezustand als pulsierender surface_raised-Block.

## Layout Principles

- Container max-width 1200px, horizontal padding 24px (mobile 16px), zentriert
- Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px
- Garderoben-Grid: display grid, grid-template-columns repeat(auto-fill, minmax(180px, 1fr)), gap 24px (mobile 16px)
- Formular-Spalten: einspaltig auf mobile, zweispaltig ab 640px, Abstand 24px
- Sektionsabstand vertikal 48px desktop / 32px mobile; Sticky-Navigation bleibt immer sichtbar
- Bilder responsiv in Karten mit aspect-ratio 3/4 oder 1/1, niemals gestreckt
- Fehler-/Ladezustände erscheinen immer im sichtbaren Bereich nahe der auslösenden Aktion
