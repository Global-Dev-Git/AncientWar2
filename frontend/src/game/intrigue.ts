import type { ActionType, CharacterState, NationState, TraitKey } from './types'

export const INTRIGUE_ACTION_TYPES = ['Bribe', 'Purge', 'Assassinate', 'StealTech', 'FomentRevolt'] as const

export type IntrigueActionType = (typeof INTRIGUE_ACTION_TYPES)[number]

const BASE_SUCCESS: Record<IntrigueActionType, number> = {
  Bribe: 0.65,
  Purge: 0.55,
  Assassinate: 0.38,
  StealTech: 0.45,
  FomentRevolt: 0.34,
}

const TRAIT_BONUS: Partial<Record<TraitKey, Partial<Record<IntrigueActionType, number>>>> = {
  schemer: { Bribe: 0.08, Assassinate: 0.08, StealTech: 0.05, FomentRevolt: 0.05 },
  charismatic: { Bribe: 0.05 },
  spymaster: { StealTech: 0.1, FomentRevolt: 0.08 },
  assassin: { Assassinate: 0.15 },
  loyalist: { Purge: 0.12 },
  merchant: { Bribe: 0.05 },
  ironGuard: { Purge: 0.1 },
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const averageLoyalty = (court: CharacterState[]): number => {
  if (!court.length) return 50
  return court.reduce((sum, member) => sum + member.loyalty, 0) / court.length
}

const averageFactionSupport = (nation: NationState): number => {
  if (!nation.factions.length) return 50
  return nation.factions.reduce((sum, faction) => sum + faction.support, 0) / nation.factions.length
}

export const isIntrigueAction = (action: ActionType): action is IntrigueActionType =>
  (INTRIGUE_ACTION_TYPES as readonly string[]).includes(action)

export const getBestAgent = (nation: NationState): CharacterState | null => {
  if (!nation.court.length) return null
  const sorted = [...nation.court].sort((a, b) => {
    const aScore = a.intrigue * 1.2 + a.loyalty * 0.6 + a.influence * 0.3
    const bScore = b.intrigue * 1.2 + b.loyalty * 0.6 + b.influence * 0.3
    return bScore - aScore
  })
  return sorted[0] ?? null
}

const traitBonusFor = (agent: CharacterState | null, action: IntrigueActionType): number => {
  if (!agent) return 0
  return agent.traits.reduce((bonus, trait) => bonus + (TRAIT_BONUS[trait]?.[action] ?? 0), 0)
}

export const calculateIntrigueChance = (
  action: IntrigueActionType,
  actor: NationState,
  target?: NationState | null,
): number => {
  const base = BASE_SUCCESS[action]
  const agent = getBestAgent(actor)
  const loyaltyModifier = agent ? (agent.loyalty - 50) / 220 : 0
  const intrigueModifier = agent ? (agent.intrigue - 50) / 180 : 0
  const influenceModifier = (actor.stats.influence - 50) / 220
  const traitModifier = traitBonusFor(agent, action)
  const targetStability = target ? (target.stats.stability - 50) / 200 : 0
  const targetSupport = target ? (averageFactionSupport(target) - 55) / 250 : 0
  const targetLoyalty = target ? (averageLoyalty(target.court) - 55) / 260 : 0

  let result =
    base + loyaltyModifier + intrigueModifier + influenceModifier + traitModifier - targetStability - targetSupport - targetLoyalty

  if (action === 'Purge') {
    // Internal power struggles become easier when factions favour the ruler
    const factionModifier = (averageFactionSupport(actor) - 50) / 180
    result += factionModifier
  }

  if (action === 'FomentRevolt' && target) {
    const crimeModifier = (target.stats.crime - 50) / 240
    result += crimeModifier
  }

  return clamp(result, 0.08, 0.95)
}
