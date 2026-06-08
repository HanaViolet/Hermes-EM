# Directive: Mobile UX Improvements

## CEO Brief

Improve the mobile UX for the game view. Current issues:

1. **Can't zoom** - No pinch-to-zoom support on mobile. Canvas has `touch-none` CSS class and only supports Ctrl/wheel zoom.
2. **Can't scroll** - Canvas `touch-none` prevents touch scrolling. Users can't pan around the map on mobile.
3. **HUD menus panel should be integrated** - The mobile panel is currently a bottom-sheet overlay (max-h-55vh). It should be part of the game UI layout — same height, scrollable, not a floating overlay.
4. **Other mobile UX gaps** - Investigate and fix any additional mobile usability issues (e.g., touch targets too small, missing gestures, layout overflow).

## Key Files

- `src/components/game/CanvasOffice.tsx` - Canvas, touch events, zoom
- `src/components/game/GamePage.tsx` - Layout, mobile breakpoint, panel integration
- `src/components/game/SidePanel.tsx` - Mobile bottom-sheet variant
- `src/components/game/GameHeader.tsx` - Responsive header
- `src/components/game/constants.ts` - Zoom bounds
- `index.html` - Viewport meta tag
- `src/styles/globals.css` - Mobile CSS

## Success Criteria

- Pinch-to-zoom works on mobile devices
- Touch-drag panning works on mobile
- HUD panel is inline with the game (not a floating overlay), same height, scrollable
- No regressions on desktop
