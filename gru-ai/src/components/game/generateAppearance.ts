// ---------------------------------------------------------------------------
// generateAppearance — infer gender from agent name and pick character layers
// ---------------------------------------------------------------------------
//
// Deterministically generates a CharacterAppearance (bodyRow, hairRow, outfitIndex)
// from an agent's first name. Infers likely gender from common first names to
// pick gender-appropriate hair and outfit, then uses a simple hash for variety.
//
// MetroCity asset layout:
//   Body (Character Model.png): 6 rows = skin tones (light → dark), all unisex
//   Hair (Hairs.png): 8 rows — some feminine (bob, wavy, curly), some masculine (short)
//   Outfits (Outfit1-6.png): 6 outfits, all fairly neutral at 32px

import type { CharacterAppearance } from '@/stores/agent-registry-store'

// ── Gender inference from first name ────────────────────────────────────────

type InferredGender = 'male' | 'female'

/** Known first names → gender. Covers the current team + common names. */
const NAME_GENDER: Record<string, InferredGender> = {
  sarah: 'female', marcus: 'male', morgan: 'male', priya: 'female',
  riley: 'female', jordan: 'male', casey: 'male', taylor: 'female',
  sam: 'male', quinn: 'female', devon: 'male',
  alex: 'male', emma: 'female', james: 'male', sophia: 'female',
  liam: 'male', olivia: 'female', noah: 'male', ava: 'female',
  ethan: 'male', mia: 'female', lucas: 'male', isabella: 'female',
  mason: 'male', charlotte: 'female', logan: 'male', amelia: 'female',
  daniel: 'male', luna: 'female', henry: 'male', ella: 'female',
  max: 'male', lily: 'female', jack: 'male', aria: 'female',
  leo: 'male', zoe: 'female', ryan: 'male', nora: 'female',
  kai: 'male', maya: 'female', jin: 'male', yuki: 'female',
  raj: 'male', ananya: 'female', omar: 'male', fatima: 'female',
  carlos: 'male', camila: 'female', david: 'male', elena: 'female',
  michael: 'male', jessica: 'female', chris: 'male', emily: 'female',
  kevin: 'male', rachel: 'female', brian: 'male', alice: 'female',
  nick: 'male', natalie: 'female', adam: 'male', claire: 'female',
  ben: 'male', anna: 'female', tom: 'male', maria: 'female',
  jake: 'male', nina: 'female', matt: 'male', kate: 'female',
  eric: 'male', sara: 'female', mark: 'male', julia: 'female',
  paul: 'male', amy: 'female', mike: 'male', rosa: 'female',
}

function inferGender(firstName: string): InferredGender {
  const key = firstName.toLowerCase().trim()
  if (NAME_GENDER[key]) return NAME_GENDER[key]
  // Fallback heuristic for unknown names
  if (key.endsWith('a') || key.endsWith('ia') || key.endsWith('ie') || key.endsWith('ah')) return 'female'
  return 'male'
}

// ── Appearance generation ───────────────────────────────────────────────────

// Hair row pools by gender (from visual inspection of Hairs.png):
//   Row 0: short dark brown (masculine)
//   Row 1: blonde bob (feminine)
//   Row 2: red/orange wavy (feminine)
//   Row 3: orange curly medium (feminine)
//   Row 4: medium brown (neutral — assigned to both)
//   Row 5: dark straight longer (masculine)
//   Row 6: black medium (masculine)
//   Row 7: short black (masculine)
const HAIR_ROWS_MALE = [0, 4, 5, 6, 7]
const HAIR_ROWS_FEMALE = [1, 2, 3, 4]

// Outfit pools by gender (from visual inspection):
//   Outfit 1: light gray top — EXCLUDED (invisible against skin)
//   Outfit 2: purple blouse (feminine)
//   Outfit 3: white minimal — EXCLUDED (invisible against skin)
//   Outfit 4: orange small top/vest — EXCLUDED (no pants, looks like shorts)
//   Outfit 5: blue vest (neutral, full coverage)
//   Outfit 6: red top with collar (neutral, full coverage)
// Only outfits 2, 5, 6 have full body coverage and visible contrast
const OUTFIT_INDICES_MALE = [5, 6]
const OUTFIT_INDICES_FEMALE = [2, 5, 6]

// Body rows 0-5 are skin tones (all unisex)
const BODY_ROW_COUNT = 6

/** Simple deterministic hash from a string → number */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Generate a deterministic CharacterAppearance from an agent name.
 * Infers gender from the first name to pick appropriate hair/outfit pools,
 * then uses a hash of the full name for variety within those pools.
 */
export function generateAppearance(agentName: string): CharacterAppearance {
  const firstName = agentName.split(' ')[0] || agentName
  const gender = inferGender(firstName)
  const hash = simpleHash(agentName.toLowerCase())

  const hairPool = gender === 'female' ? HAIR_ROWS_FEMALE : HAIR_ROWS_MALE
  const outfitPool = gender === 'female' ? OUTFIT_INDICES_FEMALE : OUTFIT_INDICES_MALE

  const bodyRow = hash % BODY_ROW_COUNT
  const hairRow = hairPool[hash % hairPool.length]
  const outfitIndex = outfitPool[(hash >> 4) % outfitPool.length]

  return { bodyRow, hairRow, outfitIndex }
}
