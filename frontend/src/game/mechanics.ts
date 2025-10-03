import type { DiplomacyMatrix, TechTree, Treaty } from './types'
import { getBlockadeSeverity, relationKey, setBlockade } from './utils'

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

export interface TradeContext {
  influence: number
  blockadeLevel?: number
  supplyPenalty?: number
  treatyModifier?: number
  techLevel?: number
  scarcity?: number
}

export const calculateTradePrice = (basePrice: number, context: TradeContext): number => {
  const influenceFactor = 1 - clamp(context.influence, 0, 100) / 200
  const blockadeFactor = 1 + clamp(context.blockadeLevel ?? 0, 0, 1) * 0.5
  const supplyFactor = 1 + clamp(context.supplyPenalty ?? 0, 0, 1)
  const treatyFactor = 1 + (context.treatyModifier ?? 0)
  const techFactor = 1 - clamp(context.techLevel ?? 0, 0, 100) / 250
  const scarcityFactor = 1 + (context.scarcity ?? 0)
  const adjusted =
    basePrice * influenceFactor * blockadeFactor * supplyFactor * treatyFactor * techFactor * scarcityFactor
  return Number(Math.max(0, adjusted).toFixed(2))
}

export const getBlockadeKey = (a: string, b: string): string => relationKey(a, b)

export const getBlockadeLevel = (diplomacy: DiplomacyMatrix, a: string, b: string): number =>
  clamp(getBlockadeSeverity(diplomacy, a, b), 0, 1)

export const applyBlockade = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  severity: number,
): void => {
  setBlockade(diplomacy, a, b, severity)
}

export interface IntrigueContext {
  spySkill: number
  targetSecurity: number
  relations: number
  support: number
  blockadeLevel?: number
}

export const calculateIntrigueOdds = (context: IntrigueContext): number => {
  const skillDelta = clamp(context.spySkill - context.targetSecurity, -60, 60) / 120
  const relationPenalty = -clamp(context.relations, -100, 100) / 200
  const supportBonus = clamp(context.support - 50, -50, 50) / 200
  const blockadePenalty = -(context.blockadeLevel ?? 0) * 0.25
  const base = 0.35 + skillDelta + relationPenalty + supportBonus + blockadePenalty
  return Number(clamp(base, 0.05, 0.95).toFixed(3))
}

export interface InfluenceContext {
  baseInfluence: number
  prestige: number
  wonders: number
  treatyNetwork: number
  propaganda?: number
  crises?: number
  blockadesBroken?: number
  intrigueVictories?: number
}

export const calculateFactionInfluence = (context: InfluenceContext): number => {
  const propaganda = context.propaganda ?? 0
  const crises = context.crises ?? 0
  const blockadesBroken = context.blockadesBroken ?? 0
  const intrigueVictories = context.intrigueVictories ?? 0
  const influence =
    context.baseInfluence +
    context.prestige * 2 +
    context.wonders * 3 +
    context.treatyNetwork * 1.5 +
    propaganda +
    blockadesBroken * 1.25 +
    intrigueVictories * 0.75 -
    crises * 2.5
  return Number(clamp(influence, 0, 100).toFixed(2))
}

export interface SupplyContext {
  distance: number
  support: number
  terrainDifficulty?: number
  weatherSeverity?: number
  blockadeLevel?: number
}

export const calculateSupplyPenalty = (context: SupplyContext): number => {
  const distancePenalty = clamp(context.distance * 0.06, 0, 0.4)
  const supportPenalty = clamp((60 - context.support) / 200, 0, 0.25)
  const terrainPenalty = clamp(context.terrainDifficulty ?? 0, 0, 0.2)
  const weatherPenalty = clamp(context.weatherSeverity ?? 0, 0, 0.2)
  const blockadePenalty = clamp((context.blockadeLevel ?? 0) * 0.5, 0, 0.25)
  const penalty = distancePenalty + supportPenalty + terrainPenalty + weatherPenalty + blockadePenalty
  return Number(clamp(penalty, 0, 0.75).toFixed(3))
}

export const advanceSiegeProgress = (
  currentProgress: number,
  siegePower: number,
  fortification: number,
  supplyPenalty: number,
): number => {
  const baseRate = clamp(siegePower / (fortification + 5), 0.05, 0.35)
  const penaltyMultiplier = 1 - clamp(supplyPenalty, 0, 0.9)
  const progress = currentProgress + baseRate * penaltyMultiplier
  return Number(clamp(progress, 0, 1).toFixed(3))
}

export interface TreatyPenaltyOptions {
  relationScore?: number
  rivalPartners?: string[]
  recentlyBrokeTreaty?: boolean
}

export const calculateTreatyPenalty = (
  existing: Treaty[],
  candidate: Treaty,
  options: TreatyPenaltyOptions = {},
): number => {
  let penalty = 0
  const { relationScore = 0, rivalPartners = [], recentlyBrokeTreaty = false } = options

  if (candidate.exclusivity) {
    const conflictingExclusive = existing.some(
      (treaty) =>
        treaty.type === candidate.type &&
        treaty.exclusivity &&
        treaty.partner !== candidate.partner &&
        (!treaty.expires || treaty.expires > Date.now()),
    )
    if (conflictingExclusive) {
      penalty += 25
    }
  }

  if (existing.some((treaty) => treaty.partner === candidate.partner && treaty.type === candidate.type)) {
    penalty -= 10
  }

  penalty += existing.filter((treaty) => treaty.type === candidate.type && treaty.partner !== candidate.partner).length * 5

  if (rivalPartners.includes(candidate.partner)) {
    penalty += 20
  }

  if (relationScore < 0) {
    penalty += Math.abs(relationScore) / 2
  }

  if (recentlyBrokeTreaty) {
    penalty += 15
  }

  return Number(Math.max(0, penalty).toFixed(2))
}

export const DEFAULT_TECH_TREE: TechTree = {
  BronzeWorking: [],
  Irrigation: [],
  TradeCaravans: ['Irrigation'],
  SiegeEngineering: ['BronzeWorking'],
  NavalLogistics: ['BronzeWorking'],
  IronWorking: ['BronzeWorking'],
  Mathematics: ['BronzeWorking'],
  Astronomy: ['Mathematics'],
  SiegeMasters: ['SiegeEngineering', 'IronWorking'],
  NavalDominance: ['NavalLogistics', 'Mathematics'],
  ImperialBureaucracy: ['TradeCaravans'],
}

const resolvePrerequisites = (
  tech: string,
  tree: TechTree,
  visited: Set<string>,
  stack: Set<string>,
): string[] => {
  if (stack.has(tech)) {
    return []
  }
  stack.add(tech)
  const prerequisites = tree[tech] ?? []
  const resolved: string[] = []
  prerequisites.forEach((requirement) => {
    if (!visited.has(requirement)) {
      visited.add(requirement)
      resolved.push(requirement)
      resolvePrerequisites(requirement, tree, visited, stack).forEach((value) => {
        if (!visited.has(value)) {
          visited.add(value)
          resolved.push(value)
        }
      })
    }
  })
  stack.delete(tech)
  return resolved
}

export const getMissingTechPrerequisites = (
  owned: Iterable<string>,
  tech: string,
  tree: TechTree = DEFAULT_TECH_TREE,
): string[] => {
  const ownedSet = new Set(owned)
  const visited = new Set<string>()
  const resolved = resolvePrerequisites(tech, tree, visited, new Set())
  return resolved.filter((requirement) => !ownedSet.has(requirement))
}

export const canResearchTech = (owned: Iterable<string>, tech: string, tree: TechTree = DEFAULT_TECH_TREE): boolean =>
  getMissingTechPrerequisites(owned, tech, tree).length === 0

export type IronmanAction = 'manualSave' | 'autoSave' | 'undo' | 'reload' | 'enableCheats'

export interface IronmanRuleContext {
  ironman: boolean
  action: IronmanAction
  hasAutoSave?: boolean
}

export interface IronmanResult {
  allowed: boolean
  reason?: string
}

export const isIronmanActionAllowed = (context: IronmanRuleContext): IronmanResult => {
  if (!context.ironman) {
    return { allowed: true }
  }

  switch (context.action) {
    case 'autoSave':
      return { allowed: true }
    case 'manualSave':
      return { allowed: false, reason: 'Manual saves are disabled in ironman mode.' }
    case 'undo':
      return { allowed: false, reason: 'Undo history is locked while ironman is active.' }
    case 'enableCheats':
      return { allowed: false, reason: 'Debug or cheat commands void ironman runs.' }
    case 'reload':
      return context.hasAutoSave
        ? { allowed: true }
        : { allowed: false, reason: 'Only most recent auto-save may be loaded in ironman mode.' }
    default:
      return { allowed: false, reason: 'Action not recognised under ironman restrictions.' }
  }
}
