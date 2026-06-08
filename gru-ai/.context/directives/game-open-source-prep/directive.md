# Directive: Game Open Source Preparation — Asset License Compliance

## CEO Brief

Prepare the game for open-sourcing by ensuring all assets comply with their licenses for public distribution.

## Context

The game uses several third-party asset packs with varying licenses. Before the repo can go public, we need to:

1. **Remove non-redistributable assets from git** — LimeZu Modern Office (paid) files cannot be distributed in a public repo
2. **Remove non-commercial assets entirely** — LimeZu "Modern tiles_Free" is non-commercial only, incompatible with open source
3. **Verify walls.png origin** — unknown provenance, needs investigation
4. **Add developer setup flow** — so contributors can acquire paid assets and get running
5. **Ensure graceful fallback** — game should render something reasonable when tileset PNGs are missing (not crash)
6. **Add proper attribution** — LimeZu credits required by license, JIK-A-4/MetroCity CC0 attribution appreciated

## Asset Audit (completed)

| Asset | Source | License | Action |
|-------|--------|---------|--------|
| `characters/char_0..11.png` | JIK-A-4 MetroCity (CC0) via pixel-agents | CC0 | Keep — fully open |
| `Modern_Office_Revamped_v1.2/` | LimeZu paid ($1.20) | Custom — no redistribution | Gitignore + setup script |
| `office/furniture.png`, `room-builder.png` | Copies from LimeZu paid pack | Same as above | Gitignore + setup script |
| `Modern tiles_Free/` | LimeZu free version | Non-commercial only | Remove entirely |
| `walls.png` | Unknown | Unknown | Investigate + resolve |

## Scope

This directive covers ONLY the asset license compliance work — the first step of the larger "productionize and publish" initiative. Git history rewriting is out of scope (CEO will handle separately). Focus on:
- .gitignore changes
- Setup script for developers
- Graceful fallback rendering when assets are missing
- Attribution/credits
- Removing the free tileset
