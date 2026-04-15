---
name: tradeclub-branding
description: Maintain and apply TradeClub's brand identity across code, UI, copy, and communications. Use when naming features, writing user-facing text, designing UI components, choosing colors/typography, or making any decision that affects product personality and visual consistency.
---

# TradeClub Branding

## Brand Identity

TradeClub is a **nightlife protocol** where trading feels like entering a high-energy club.
- Tagline: **"Own The Night"**
- Vibe: Dark, neon, cyberpunk, competitive, exclusive
- Metaphors: DJ booth, dance floor, battles, VIP lounge

## Tone of Voice

- **Confident** but not arrogant
- **Energetic** but not chaotic
- **Insider** — assumes the user is part of the scene
- Use action verbs: *fight*, *bleed*, *own*, *battle*, *trade*, *win*
- Avoid corporate blandness; this is not a bank

### Good Copy Examples
- "Where markets bleed and every trade is a fight"
- "The Dance Floor" (live battles)
- "The VIP Lounge" (leaderboard)
- "The DJ Booth" (hero/dashboard)

### Bad Copy Examples
- "Welcome to our trading platform"
- "Please proceed to the marketplace"
- "Your account summary"

## Visual Language

### Color Palette
- **Background**: `#050505` (near-black)
- **Primary accent**: Magenta / hot pink neon
- **Secondary accent**: Cyan / electric blue
- **Text**: Soft whites and cool grays; avoid pure white `#ffffff` for large blocks
- **Glow effects**: Pink/magenta box-shadows for CTAs and highlights

### Typography
- **Primary**: Geist variable font
- **Monospace**: Geist Mono
- **Display fallback**: Rajdhani (for numbers, data, sci-fi feel)
- Headlines: bold, uppercase, wide tracking
- Data/numbers: tabular-nums, Rajdhani

### UI Patterns
- **Glass panels**: translucent dark backgrounds with subtle borders (`GlassPanel`)
- **Laser backgrounds**: animated gradient beams (`LaserBackground`)
- **Radial vignette**: fades edges to black, centers focus
- **Neon buttons**: glowing borders, hover intensification (`NeonButton`)
- **Charts**: dark-themed, minimal grid, accent highlights

## Naming Conventions

When naming features, components, or routes, prefer club/battle metaphors over generic finance terms:

| Generic | Branded |
|---------|---------|
| Match / Game | Battle |
| Tournament | League / Season |
| Dashboard | DJ Booth |
| Leaderboard | VIP Lounge |
| Live events | Dance Floor |
| Portfolio | Stats Deck |
| Trade history | Terminal |

## Applying Brand in Code

- Page titles: include "TradeClub | Nightlife Protocol"
- Component names can use metaphor (`HeroSection`, `BattleSection`, `StatsDeck`)
- CSS classes: avoid generic `bg-gray-900`; use `bg-[#050505]` or semantic tokens
- Error states: keep tone sharp, not apologetic — "Connection dropped. Rejoin the floor."

## When to Use This Skill

- Writing new page copy, button labels, or error messages
- Creating new UI components
- Choosing color schemes for new features
- Naming routes, features, or product areas
- Reviewing PRs for brand consistency
