import type { SpriteData } from '../pixel-types'
import type { LoadedCharacterData } from './spriteData'

const TILE = 32
const TRANSPARENT = ''
const OUTLINE = '#171717'
const EYE = '#111111'
const EYE_BLUE = '#5f7888'
const PAPER = '#dfd3a8'

type DirectionName = 'down' | 'up' | 'right'
type FrameMode = 'walk' | 'typing' | 'reading'
type Step = -1 | 0 | 1
type HairStyle =
  | 'none'
  | 'short'
  | 'bob'
  | 'wide'
  | 'bun'
  | 'side-bun'
  | 'swept'
  | 'teal-split'
  | 'hood'
  | 'helmet'
  | 'visor'
type HeadStyle = 'human' | 'wide-ears' | 'horn-hood' | 'mask' | 'visor' | 'soft-helmet' | 'round-alien' | 'shadow'
type OutfitStyle = 'tunic' | 'robe' | 'suit' | 'vest' | 'armor' | 'dress' | 'pilot' | 'cloak' | 'minimal'
type Accessory = 'none' | 'staff' | 'chest-badge' | 'belt' | 'headband' | 'antenna'

interface PixelCharacterPreset {
  id: string
  label: string
  skin: string
  skinShade: string
  hair: string
  hair2?: string
  headStyle: HeadStyle
  hairStyle: HairStyle
  outfitStyle: OutfitStyle
  top: string
  bottom: string
  accent: string
  shoes: string
  accessory?: Accessory
}

export const PIXEL_CHARACTER_PRESETS = [
  {
    id: 'sage-analyst',
    label: 'Sage Analyst',
    skin: '#d6a47c',
    skinShade: '#9d6a50',
    hair: '#9a9588',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'suit',
    top: '#f0e6d0',
    bottom: '#514f45',
    accent: '#7c8c65',
    shoes: '#2b2b25',
  },
  {
    id: 'horned-scout',
    label: 'White Hood',
    skin: '#f0b88a',
    skinShade: '#b8795b',
    hair: '#f4f0da',
    hair2: '#aeb9cb',
    headStyle: 'human',
    hairStyle: 'bob',
    outfitStyle: 'tunic',
    top: '#9c4638',
    bottom: '#6c504d',
    accent: '#8bc089',
    shoes: '#5a3537',
  },
  {
    id: 'black-suit',
    label: 'Black Suit',
    skin: '#d9a681',
    skinShade: '#a56c54',
    hair: '#5a3424',
    headStyle: 'human',
    hairStyle: 'wide',
    outfitStyle: 'suit',
    top: '#171717',
    bottom: '#202020',
    accent: '#2f2f2f',
    shoes: '#111111',
  },
  {
    id: 'ribbon-operator',
    label: 'Ribbon Operator',
    skin: '#e5b5a4',
    skinShade: '#b27a6e',
    hair: '#7a3f2a',
    hair2: '#9f7454',
    headStyle: 'human',
    hairStyle: 'side-bun',
    outfitStyle: 'dress',
    top: '#312a6f',
    bottom: '#33245f',
    accent: '#b08a61',
    shoes: '#1c1628',
  },
  {
    id: 'gold-bob',
    label: 'Gold Bob',
    skin: '#f0c18d',
    skinShade: '#b98261',
    hair: '#c58632',
    headStyle: 'human',
    hairStyle: 'bob',
    outfitStyle: 'minimal',
    top: '#f4e6c8',
    bottom: '#e3c599',
    accent: '#2f2520',
    shoes: '#8f614a',
  },
  {
    id: 'red-mask',
    label: 'Red Jacket',
    skin: '#d18b6c',
    skinShade: '#955542',
    hair: '#6a2c25',
    hair2: '#d4c571',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'vest',
    top: '#b9443d',
    bottom: '#2b2d33',
    accent: '#c6b766',
    shoes: '#111318',
  },
  {
    id: 'olive-ponytail',
    label: 'Olive Ponytail',
    skin: '#dfaa73',
    skinShade: '#9a6247',
    hair: '#6b3c31',
    headStyle: 'human',
    hairStyle: 'swept',
    outfitStyle: 'tunic',
    top: '#a2914b',
    bottom: '#a7aba3',
    accent: '#55362c',
    shoes: '#6a6256',
  },
  {
    id: 'teal-quant',
    label: 'Teal Quant',
    skin: '#f3cb91',
    skinShade: '#ad7454',
    hair: '#153b55',
    hair2: '#3fb7a7',
    headStyle: 'human',
    hairStyle: 'teal-split',
    outfitStyle: 'vest',
    top: '#a0522b',
    bottom: '#7a7466',
    accent: '#1c5e61',
    shoes: '#222426',
  },
  {
    id: 'violet-researcher',
    label: 'Violet Researcher',
    skin: '#c18a72',
    skinShade: '#845847',
    hair: '#65546d',
    headStyle: 'human',
    hairStyle: 'bob',
    outfitStyle: 'vest',
    top: '#75617d',
    bottom: '#5f5960',
    accent: '#e0bd52',
    shoes: '#3f3944',
  },
  {
    id: 'blue-runner',
    label: 'Blue Runner',
    skin: '#c9905d',
    skinShade: '#8a5d42',
    hair: '#263b59',
    headStyle: 'human',
    hairStyle: 'swept',
    outfitStyle: 'pilot',
    top: '#d6792b',
    bottom: '#9a4f2a',
    accent: '#303033',
    shoes: '#54362d',
  },
  {
    id: 'lime-tech',
    label: 'Lime Tech',
    skin: '#d2a177',
    skinShade: '#97684c',
    hair: '#cfe98a',
    hair2: '#ffffff',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'pilot',
    top: '#222328',
    bottom: '#ff9b38',
    accent: '#8a8470',
    shoes: '#f4d0a3',
  },
  {
    id: 'white-diplomat',
    label: 'White Diplomat',
    skin: '#eeb9ab',
    skinShade: '#b47a6f',
    hair: '#6c3a24',
    headStyle: 'human',
    hairStyle: 'bob',
    outfitStyle: 'robe',
    top: '#dfe7ee',
    bottom: '#e9eef2',
    accent: '#9b8b7d',
    shoes: '#dbe2e7',
  },
  {
    id: 'sand-bun',
    label: 'Sand Bun',
    skin: '#f2bc83',
    skinShade: '#b87b52',
    hair: '#d0b17a',
    headStyle: 'human',
    hairStyle: 'bun',
    outfitStyle: 'minimal',
    top: '#f2e8d1',
    bottom: '#e7e0c8',
    accent: '#1f1f1f',
    shoes: '#79776b',
  },
  {
    id: 'navy-broker',
    label: 'Navy Broker',
    skin: '#f0b68a',
    skinShade: '#a96c50',
    hair: '#2b2218',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'suit',
    top: '#f6efe5',
    bottom: '#263f67',
    accent: '#151515',
    shoes: '#1c1c1f',
  },
  {
    id: 'clay-trader',
    label: 'Clay Trader',
    skin: '#69422f',
    skinShade: '#3f2b25',
    hair: '#68412f',
    headStyle: 'human',
    hairStyle: 'wide',
    outfitStyle: 'vest',
    top: '#665743',
    bottom: '#3f3a34',
    accent: '#b2aa83',
    shoes: '#302c25',
  },
  {
    id: 'shadow-auditor',
    label: 'Shadow Auditor',
    skin: '#8a5d46',
    skinShade: '#5d3b2f',
    hair: '#151515',
    headStyle: 'human',
    hairStyle: 'hood',
    outfitStyle: 'cloak',
    top: '#202124',
    bottom: '#17181b',
    accent: '#3c5bd4',
    shoes: '#0d0d0f',
  },
  {
    id: 'red-visor',
    label: 'Red Visor',
    skin: '#d7a884',
    skinShade: '#9d6c50',
    hair: '#b8c7d6',
    headStyle: 'human',
    hairStyle: 'visor',
    outfitStyle: 'armor',
    top: '#59695e',
    bottom: '#62705f',
    accent: '#a44636',
    shoes: '#b27d58',
  },
  {
    id: 'orange-pilot',
    label: 'Orange Pilot',
    skin: '#b98352',
    skinShade: '#704b34',
    hair: '#0f1512',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'pilot',
    top: '#fff2d4',
    bottom: '#ef7a32',
    accent: '#d65b31',
    shoes: '#121212',
  },
  {
    id: 'charcoal-vest',
    label: 'Charcoal Vest',
    skin: '#7a432d',
    skinShade: '#4d2b22',
    hair: '#1c171b',
    headStyle: 'human',
    hairStyle: 'short',
    outfitStyle: 'vest',
    top: '#161616',
    bottom: '#383a3c',
    accent: '#c54633',
    shoes: '#dedbd1',
  },
  {
    id: 'staff-strategist',
    label: 'Staff Strategist',
    skin: '#f1ddb5',
    skinShade: '#ad8866',
    hair: '#9d4f24',
    headStyle: 'human',
    hairStyle: 'swept',
    outfitStyle: 'tunic',
    top: '#d4c6a3',
    bottom: '#a78e6d',
    accent: '#7c5535',
    shoes: '#b78368',
    accessory: 'staff',
  },
  {
    id: 'obsidian-mask',
    label: 'Obsidian Analyst',
    skin: '#8d5c43',
    skinShade: '#5a372b',
    hair: '#050706',
    headStyle: 'human',
    hairStyle: 'helmet',
    outfitStyle: 'cloak',
    top: '#171819',
    bottom: '#0c0d0d',
    accent: '#bfc2c4',
    shoes: '#060606',
  },
  {
    id: 'silver-chairman',
    label: 'Silver Chairman',
    skin: '#ffc2a2',
    skinShade: '#c28672',
    hair: '#efe7d8',
    headStyle: 'human',
    hairStyle: 'wide',
    outfitStyle: 'robe',
    top: '#bdad92',
    bottom: '#6a543d',
    accent: '#e5decf',
    shoes: '#58442e',
  },
] as const satisfies readonly PixelCharacterPreset[]

export type PixelCharacterPresetId = (typeof PIXEL_CHARACTER_PRESETS)[number]['id']

export const PIXEL_CHARACTER_PRESET_IDS = PIXEL_CHARACTER_PRESETS.map((preset) => preset.id)

export function pixelCharacterName(palette: number): string {
  return PIXEL_CHARACTER_PRESETS[palette % PIXEL_CHARACTER_PRESETS.length]?.label ?? 'Pixel Agent'
}

function emptySprite(): SpriteData {
  return Array.from({ length: TILE }, () => Array.from({ length: TILE }, () => TRANSPARENT))
}

function rect(sprite: SpriteData, x: number, y: number, width: number, height: number, color: string): void {
  for (let row = y; row < y + height; row++) {
    if (row < 0 || row >= TILE) continue
    for (let col = x; col < x + width; col++) {
      if (col < 0 || col >= TILE) continue
      sprite[row][col] = color
    }
  }
}

function pixel(sprite: SpriteData, x: number, y: number, color: string): void {
  if (x < 0 || x >= TILE || y < 0 || y >= TILE) return
  sprite[y][x] = color
}

function shade(hex: string, factor: number): string {
  const value = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(0, 2), 16) * factor)))
  const g = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(2, 4), 16) * factor)))
  const b = Math.max(0, Math.min(255, Math.round(parseInt(value.slice(4, 6), 16) * factor)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function mirror(sprite: SpriteData): SpriteData {
  return sprite.map((row) => [...row].reverse())
}

function drawWalkLegs(sprite: SpriteData, preset: PixelCharacterPreset, step: Step, mode: FrameMode): void {
  if (mode === 'typing' || mode === 'reading') {
    rect(sprite, 10, 24, 5, 5, preset.bottom)
    rect(sprite, 17, 24, 5, 5, preset.bottom)
    rect(sprite, 9, 29, 6, 2, preset.shoes)
    rect(sprite, 17, 29, 6, 2, preset.shoes)
    return
  }

  const leftY = step === -1 ? 23 : 22
  const rightY = step === 1 ? 23 : 22
  rect(sprite, 10, leftY, 5, 7, preset.bottom)
  rect(sprite, 17, rightY, 5, 7, preset.bottom)
  rect(sprite, 9, leftY + 7, 6, 2, preset.shoes)
  rect(sprite, 17, rightY + 7, 6, 2, preset.shoes)
}

function drawOutfit(sprite: SpriteData, preset: PixelCharacterPreset, mode: FrameMode): void {
  const topDark = shade(preset.top, 0.72)
  const accentDark = shade(preset.accent, 0.76)

  if (preset.outfitStyle === 'cloak') {
    rect(sprite, 8, 15, 16, 11, OUTLINE)
    rect(sprite, 9, 15, 14, 11, preset.top)
    rect(sprite, 10, 17, 12, 8, shade(preset.top, 0.78))
    rect(sprite, 14, 18, 4, 5, preset.accent)
  } else if (preset.outfitStyle === 'robe') {
    rect(sprite, 9, 15, 14, 12, topDark)
    rect(sprite, 10, 15, 12, 12, preset.top)
    rect(sprite, 10, 20, 12, 2, preset.accent)
  } else if (preset.outfitStyle === 'suit') {
    rect(sprite, 9, 15, 14, 11, preset.top)
    rect(sprite, 12, 15, 8, 10, '#f4ecdd')
    rect(sprite, 9, 15, 4, 11, topDark)
    rect(sprite, 19, 15, 4, 11, topDark)
    rect(sprite, 15, 16, 2, 8, preset.accent)
  } else if (preset.outfitStyle === 'armor') {
    rect(sprite, 8, 15, 16, 11, OUTLINE)
    rect(sprite, 9, 15, 14, 10, preset.top)
    rect(sprite, 11, 16, 10, 3, preset.accent)
    rect(sprite, 9, 21, 14, 3, shade(preset.top, 0.62))
  } else if (preset.outfitStyle === 'dress') {
    rect(sprite, 9, 15, 14, 8, preset.top)
    rect(sprite, 8, 22, 16, 5, preset.bottom)
    rect(sprite, 12, 15, 8, 3, preset.accent)
  } else if (preset.outfitStyle === 'pilot') {
    rect(sprite, 9, 15, 14, 10, preset.top)
    rect(sprite, 10, 18, 12, 3, preset.accent)
    rect(sprite, 9, 22, 14, 4, preset.bottom)
  } else if (preset.outfitStyle === 'vest') {
    rect(sprite, 9, 15, 14, 10, preset.top)
    rect(sprite, 10, 16, 4, 8, shade(preset.top, 0.72))
    rect(sprite, 18, 16, 4, 8, shade(preset.top, 0.72))
    rect(sprite, 14, 16, 4, 8, preset.accent)
  } else {
    rect(sprite, 10, 15, 12, 10, preset.top)
    rect(sprite, 10, 21, 12, 3, preset.accent)
  }

  if (mode === 'reading') {
    rect(sprite, 9, 21, 14, 5, PAPER)
    rect(sprite, 15, 21, 1, 5, shade(PAPER, 0.68))
  } else if (mode === 'typing') {
    rect(sprite, 12, 24, 8, 2, '#33485c')
  }

  rect(sprite, 10, 24, 12, 1, accentDark)
  rect(sprite, 15, 16, 2, 4, shade(preset.accent, 1.08))
}

function drawArms(sprite: SpriteData, preset: PixelCharacterPreset, step: Step, mode: FrameMode, dir: DirectionName): void {
  const sleeve = shade(preset.top, 0.78)
  const hand = preset.skin

  if (mode === 'reading') {
    rect(sprite, 8, 22, 3, 3, hand)
    rect(sprite, 21, 22, 3, 3, hand)
    return
  }
  if (mode === 'typing') {
    rect(sprite, 9, 23, 5, 3, hand)
    rect(sprite, 18, 23, 5, 3, hand)
    return
  }

  const sway = dir === 'right' ? 0 : step
  rect(sprite, 6, 17 + (sway === 1 ? 1 : 0), 4, 8, sleeve)
  rect(sprite, 22, 17 + (sway === -1 ? 1 : 0), 4, 8, sleeve)
  rect(sprite, 6, 24 + (sway === 1 ? 1 : 0), 4, 3, hand)
  rect(sprite, 22, 24 + (sway === -1 ? 1 : 0), 4, 3, hand)
}

function drawFace(sprite: SpriteData, preset: PixelCharacterPreset, dir: DirectionName): void {
  if (dir === 'up') return

  const eyeColor = preset.id === 'black-suit' || preset.id === 'navy-broker' || preset.id === 'staff-strategist' ? EYE_BLUE : EYE
  if (dir === 'right') {
    rect(sprite, 19, 10, 2, 3, eyeColor)
    pixel(sprite, 20, 10, '#d8e1e7')
    return
  }

  rect(sprite, 12, 10, 2, 3, eyeColor)
  rect(sprite, 18, 10, 2, 3, eyeColor)
  pixel(sprite, 13, 10, '#d8e1e7')
  pixel(sprite, 19, 10, '#d8e1e7')
  pixel(sprite, 16, 13, preset.skinShade)
  rect(sprite, 15, 15, 3, 1, shade(preset.skinShade, 0.76))
}

function drawHair(sprite: SpriteData, preset: PixelCharacterPreset): void {
  const h = preset.hair
  const h2 = preset.hair2 ?? shade(h, 1.18)

  if (preset.hairStyle === 'none') return
  if (preset.hairStyle === 'hood') {
    rect(sprite, 8, 3, 16, 7, h)
    rect(sprite, 8, 8, 3, 9, h)
    rect(sprite, 21, 8, 3, 9, h)
    rect(sprite, 12, 3, 8, 2, h2)
    return
  }
  if (preset.hairStyle === 'helmet') {
    rect(sprite, 8, 4, 16, 8, h)
    rect(sprite, 8, 9, 3, 7, shade(h, 0.72))
    rect(sprite, 21, 9, 3, 7, shade(h, 0.72))
    rect(sprite, 10, 4, 4, 2, h2)
    rect(sprite, 18, 4, 4, 2, h2)
    return
  }
  if (preset.hairStyle === 'visor') {
    rect(sprite, 8, 4, 16, 7, h)
    rect(sprite, 9, 9, 14, 3, preset.accent)
    rect(sprite, 10, 12, 12, 2, shade(preset.accent, 0.66))
    return
  }
  if (preset.hairStyle === 'bob') {
    rect(sprite, 8, 4, 16, 6, h)
    rect(sprite, 8, 9, 4, 8, h)
    rect(sprite, 20, 9, 4, 8, h)
    rect(sprite, 12, 4, 8, 2, h2)
    return
  }
  if (preset.hairStyle === 'wide') {
    rect(sprite, 7, 4, 18, 6, h)
    rect(sprite, 8, 2, 16, 4, h)
    rect(sprite, 8, 9, 3, 5, h)
    rect(sprite, 21, 9, 3, 5, h)
    return
  }
  if (preset.hairStyle === 'bun') {
    rect(sprite, 8, 4, 15, 6, h)
    rect(sprite, 7, 8, 4, 6, h)
    rect(sprite, 21, 8, 4, 6, h)
    rect(sprite, 22, 5, 4, 4, h)
    return
  }
  if (preset.hairStyle === 'side-bun') {
    rect(sprite, 8, 4, 16, 6, h)
    rect(sprite, 8, 8, 4, 6, h)
    rect(sprite, 21, 2, 5, 5, h)
    rect(sprite, 22, 2, 2, 8, h2)
    return
  }
  if (preset.hairStyle === 'swept') {
    rect(sprite, 8, 4, 15, 6, h)
    rect(sprite, 18, 3, 5, 5, h)
    rect(sprite, 21, 7, 3, 6, h)
    rect(sprite, 9, 9, 4, 4, h)
    return
  }
  if (preset.hairStyle === 'teal-split') {
    rect(sprite, 8, 4, 16, 6, h)
    rect(sprite, 8, 8, 8, 6, h)
    rect(sprite, 16, 8, 8, 8, h2)
    rect(sprite, 20, 14, 4, 5, h2)
    return
  }

  rect(sprite, 9, 4, 14, 5, h)
  rect(sprite, 8, 8, 4, 4, h)
}

function drawSpecialHead(sprite: SpriteData, preset: PixelCharacterPreset, dir: DirectionName): void {
  if (preset.headStyle === 'wide-ears') {
    rect(sprite, 4, 9, 6, 4, preset.skin)
    rect(sprite, 22, 9, 6, 4, preset.skin)
    rect(sprite, 5, 12, 4, 2, preset.skinShade)
    rect(sprite, 23, 12, 4, 2, preset.skinShade)
  }

  if (preset.headStyle === 'horn-hood') {
    rect(sprite, 9, 2, 4, 6, preset.hair2 ?? '#cad3e0')
    rect(sprite, 19, 2, 4, 6, preset.hair2 ?? '#cad3e0')
    rect(sprite, 10, 1, 2, 3, shade(preset.hair2 ?? '#cad3e0', 0.8))
    rect(sprite, 20, 1, 2, 3, shade(preset.hair2 ?? '#cad3e0', 0.8))
  }

  if (preset.headStyle === 'round-alien') {
    rect(sprite, 7, 7, 4, 6, preset.skin)
    rect(sprite, 21, 7, 4, 6, preset.skin)
    rect(sprite, 6, 11, 5, 4, preset.skinShade)
    rect(sprite, 21, 11, 5, 4, preset.skinShade)
  }

  if (preset.headStyle === 'mask') {
    rect(sprite, 9, 6, 14, 4, shade(preset.skin, 0.7))
    rect(sprite, 13, 4, 2, 10, preset.accent)
    rect(sprite, 18, 4, 2, 10, preset.accent)
  }

  if (preset.headStyle === 'soft-helmet') {
    rect(sprite, 8, 5, 16, 4, preset.hair2 ?? '#ffffff')
    rect(sprite, 9, 3, 3, 4, preset.hair)
    rect(sprite, 20, 3, 3, 4, preset.hair)
    rect(sprite, 15, 3, 2, 3, preset.hair2 ?? '#ffffff')
  }

  if (preset.headStyle === 'visor') {
    rect(sprite, 10, 10, 12, 3, '#202020')
    rect(sprite, 10, 13, 12, 2, preset.accent)
  }

  if (preset.headStyle === 'shadow') {
    rect(sprite, 9, 15, 14, 2, shade(preset.skin, 1.8))
  }

  if (dir === 'right' && preset.headStyle === 'wide-ears') {
    rect(sprite, 22, 9, 6, 4, preset.skin)
  }
}

function drawHead(sprite: SpriteData, preset: PixelCharacterPreset, dir: DirectionName): void {
  if (dir === 'right') {
    rect(sprite, 11, 6, 12, 10, OUTLINE)
    rect(sprite, 12, 7, 11, 9, preset.skin)
    rect(sprite, 22, 10, 2, 4, preset.skinShade)
    rect(sprite, 14, 16, 6, 2, preset.skinShade)
  } else if (dir === 'up') {
    rect(sprite, 9, 5, 14, 11, OUTLINE)
    rect(sprite, 10, 6, 12, 10, preset.skin)
    rect(sprite, 9, 5, 14, 9, preset.hairStyle === 'none' ? preset.skinShade : preset.hair)
    rect(sprite, 11, 13, 10, 3, shade(preset.hairStyle === 'none' ? preset.skinShade : preset.hair, 0.75))
  } else {
    rect(sprite, 9, 5, 14, 11, OUTLINE)
    rect(sprite, 8, 9, 2, 4, preset.skinShade)
    rect(sprite, 22, 9, 2, 4, preset.skinShade)
    rect(sprite, 10, 6, 12, 10, preset.skin)
    rect(sprite, 10, 14, 12, 2, preset.skinShade)
  }

  drawSpecialHead(sprite, preset, dir)
  drawHair(sprite, preset)
  drawFace(sprite, preset, dir)
}

function drawAccessory(sprite: SpriteData, preset: PixelCharacterPreset, mode: FrameMode): void {
  if (preset.accessory === 'staff') {
    rect(sprite, 6, 9, 2, 20, '#333333')
    rect(sprite, 6, 8, 2, 2, '#757575')
  }
  if (preset.accessory === 'chest-badge' || preset.id === 'shadow-auditor') {
    rect(sprite, 16, 18, 2, 2, preset.accent)
  }
  if (preset.accessory === 'belt' || mode === 'reading') {
    rect(sprite, 10, 22, 12, 2, shade(preset.accent, 0.72))
  }
}

function makeFrame(preset: PixelCharacterPreset, dir: DirectionName, step: Step, mode: FrameMode): SpriteData {
  const sprite = emptySprite()
  drawWalkLegs(sprite, preset, step, mode)
  drawOutfit(sprite, preset, mode)
  drawArms(sprite, preset, step, mode, dir)
  drawHead(sprite, preset, dir)
  drawAccessory(sprite, preset, mode)
  return sprite
}

function makeCharacterData(preset: PixelCharacterPreset): LoadedCharacterData {
  const frames: Array<{ step: Step; mode: FrameMode }> = [
    { step: -1, mode: 'walk' },
    { step: 0, mode: 'walk' },
    { step: 1, mode: 'walk' },
    { step: 0, mode: 'typing' },
    { step: 1, mode: 'typing' },
    { step: 0, mode: 'reading' },
    { step: 1, mode: 'reading' },
  ]

  const down = frames.map((frame) => makeFrame(preset, 'down', frame.step, frame.mode))
  const up = frames.map((frame) => makeFrame(preset, 'up', frame.step, frame.mode))
  const right = frames.map((frame) => makeFrame(preset, 'right', frame.step, frame.mode))
  return { down, up, right, left: right.map(mirror) }
}

export function createPixelCharacterTemplates(): LoadedCharacterData[] {
  return PIXEL_CHARACTER_PRESETS.map(makeCharacterData)
}
