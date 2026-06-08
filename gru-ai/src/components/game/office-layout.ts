// ---------------------------------------------------------------------------
// Office Layout — uses auto-generated data from parse-tmx.ts
// 30 cols x 20 rows, 4 layers: floor, furniture_base, furniture_top, deco
// ---------------------------------------------------------------------------

import { TileType, type OfficeLayout } from './pixel-types'
import {
  FLOOR,
  FURNITURE_BASE,
  FURNITURE_TOP,
  DECO,
  SEAT_POSITIONS,
  WALL_GIDS,
  COLLISION,
  SEAT_APPROACH_POINTS,
} from './generated/office-tmx-data'

export { WALL_GIDS }

function gidsToTiles(gids: number[]): TileType[] {
  return gids.map((gid) => (WALL_GIDS.has(gid) ? TileType.WALL : TileType.FLOOR_1))
}

const tiles = gidsToTiles(FLOOR)

export const OFFICE_LAYOUT: OfficeLayout = {
  version: 1,
  cols: 30,
  rows: 20,
  tiles,
  furniture: [],
  gidLayers: [FLOOR, FURNITURE_BASE, FURNITURE_TOP, DECO],
  seatPositions: [...SEAT_POSITIONS],
  collisionLayer: COLLISION,
  seatApproachPoints: [...SEAT_APPROACH_POINTS],
}
