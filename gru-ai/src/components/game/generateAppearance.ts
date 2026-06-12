import type { CharacterAppearance } from '@/stores/agent-registry-store'
import { PIXEL_CHARACTER_PRESET_IDS } from './sprites/pixelCharacters'

function simpleHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

export function generateAppearance(agentName: string): CharacterAppearance {
  const presetId = PIXEL_CHARACTER_PRESET_IDS[simpleHash(agentName.toLowerCase()) % PIXEL_CHARACTER_PRESET_IDS.length]
  return { presetId }
}
