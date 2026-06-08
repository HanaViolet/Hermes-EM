# Gather-Style Character UI

## CEO Brief

Rebuild the character UI overlay — name labels, status icons, and icon mapping — to use web-style fonts and icons instead of pixel-art bitmap rendering.

**Current state:** Character names and status indicators use a game-feeling pixel font and custom bitmap icons. These are hard to read and don't look clean.

**Target state:** Match Gather.town's approach — clean web fonts (sans-serif), standard web icons, dark rounded-pill background behind names, colored status dots. The character sprites themselves stay unchanged; only the UI overlay changes.

**Reference:** Gather.town screenshot showing:
- Dark rounded-rectangle name tags below/above characters
- Clean sans-serif font (not pixel art)
- Green status dot indicating online
- Grouped name display for co-located characters ("Daud, Aaron, Philip")
- Clean, readable, modern web UI overlaid on pixel art

**Scope:**
- Character name labels (font, background, positioning)
- Status indicators (online/busy/away dots)
- Role/icon badges if applicable
- NOT changing the sprite rendering or animation system
