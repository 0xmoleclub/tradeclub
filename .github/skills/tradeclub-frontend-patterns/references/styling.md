# Styling Guide

## Tech Stack

- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **Fonts**: Geist (variable), Geist Mono, Rajdhani fallback
- **Global CSS**: `frontend/src/app/globals.css`

## Visual Identity

Dark nightclub / neon cyberpunk aesthetic.

### Base Background
```tsx
<div className="min-h-screen bg-[#050505] text-white ...">
```

### Common Effects
- Laser background: `<LaserBackground />` component
- Radial vignette overlay:
  ```tsx
  <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />
  ```
- Glass panels: `<GlassPanel>` component

### Accent Colors
- Magenta / pink neon: used for primary CTAs, highlights, glows
- Cyan / blue: secondary accents
- Avoid pure white for large text; use soft grays

### Typography
- Headlines: bold, uppercase, tracking wide
- Numbers/data: tabular nums, Rajdhani font family

### Component Patterns
- Buttons: `<NeonButton>` or custom with glow shadows
- Cards: dark translucent backgrounds with subtle borders
- Charts: lightweight-charts with custom dark theme

## Tailwind v4 Notes

- Config is likely CSS-based (v4 default). Check `globals.css` for `@theme` or `@import "tailwindcss"`.
- No `tailwind.config.js` expected in v4.
