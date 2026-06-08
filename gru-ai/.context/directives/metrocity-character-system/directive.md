# MetroCity Character System

## CEO Brief

Replace the current 12 pre-baked character sprites (char_0..11.png) with a dynamic composable character system using MetroCity sprite packs. The current characters have severe duplication — 6+ of 12 look nearly identical (same dark-haired guy in slightly different shirt colors).

## Problem

- 12 pre-baked sprites, but only ~5 are visually distinct at game zoom
- char_0, char_6, char_8, char_11 are barely distinguishable (dark hair, blue shirt variants)
- char_7, char_10 similarly duplicated
- New users get the same bland character pool — no variety

## Solution

Use MetroCity asset packs (composable layered system):
- **Base models**: 2 skin tones, full walk cycle animations
- **7 hair styles**: black, blonde, orange, red, white/gray, brown + variants
- **6 outfits**: white shirt, purple top, gray pants, orange vest, blue hoodie, red hoodie

Composite body + hair + outfit layers at load time to create unique characters. Each agent gets a distinct combination.

## Source Assets

- `/Users/yangyang/Downloads/MetroCity/` — CharacterModel/, Hair/ (7 styles + Hairs.png), Outfits/ (6 types)
- `/Users/yangyang/Downloads/MetroCity-1/` — Same structure (appears to be same pack)

## Requirements

1. Compositing system that layers base body + hair + outfit into unified sprite frames
2. Pre-composed default set for built-in agents (Sarah, Morgan, Marcus, etc.) with visually distinct combos
3. Auto-assignment for new users who init fresh agents — agents get distinct appearances automatically
4. Keep same LoadedCharacterData interface (down/up/right SpriteData frames) so renderer needs no changes
5. Current frame layout: 16x32 frames, 7 per direction (3 walk + 2 type + 2 read) — MetroCity layout needs mapping

## Constraints

- MetroCity sheets have a different frame layout than current char_*.png — must understand and map correctly
- Must maintain the same sprite interface so renderer/engine code is unaffected
- Character assignments should be deterministic per agent name (same agent always gets same appearance)
