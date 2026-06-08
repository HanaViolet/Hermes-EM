#!/usr/bin/env bash
# setup-assets.sh — Install premium LimeZu Modern Office tileset
# The game works without these (fallback rendering), but looks better with them.

set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/../public/assets" && pwd)"

OFFICE_DIR="$ASSETS_DIR/Modern_Office_Revamped_v1.2"
FURNITURE="$ASSETS_DIR/office/furniture.png"
ROOM_BUILDER="$ASSETS_DIR/office/room-builder.png"

# Check if already installed
all_present=true
[[ -d "$OFFICE_DIR" ]] || all_present=false
[[ -f "$FURNITURE" ]] || all_present=false
[[ -f "$ROOM_BUILDER" ]] || all_present=false

if [[ "$all_present" == "true" ]]; then
  echo "Premium tileset assets already installed."
  echo "  - $OFFICE_DIR"
  echo "  - $FURNITURE"
  echo "  - $ROOM_BUILDER"
  exit 0
fi

echo "=== LimeZu Modern Office Tileset Setup ==="
echo ""
echo "The game works without premium assets (using fallback rendering),"
echo "but the full visual experience requires the LimeZu Modern Office tileset."
echo ""
echo "1. Purchase 'Modern Office - Revamped' (\$1.20) from:"
echo "   https://limezu.itch.io/modernoffice"
echo ""
echo "2. Download and extract the archive"
echo ""
echo "3. Copy the extracted folder into the assets directory:"
echo "   cp -r /path/to/Modern_Office_Revamped_v1.2 $ASSETS_DIR/"
echo ""
echo "4. Copy the derived files for the game engine:"
echo "   mkdir -p $ASSETS_DIR/office"
echo "   cp '$ASSETS_DIR/Modern_Office_Revamped_v1.2/1_Room_Builder_Office/Room_Builder_Office_16x16.png' '$ASSETS_DIR/office/room-builder.png'"
echo "   cp '$ASSETS_DIR/Modern_Office_Revamped_v1.2/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow.png' '$ASSETS_DIR/office/furniture.png'"
echo ""
echo "5. Re-run this script to verify:"
echo "   ./scripts/setup-assets.sh"
