import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import configRaw from '../config/config.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  StatKey,
} from './types'

const STAT_KEYS: StatKey[] = [
  'stability',
  'military',
  'tech',
  'economy',
  'crime',
  'influence',
  'support',
  'science',
  'laws',
]

const CONFIG_NUMERIC_KEYS: (keyof Omit<GameConfig, 'combatRandomnessRange'>)[] = [
  'techGainPerInvest',
  'scienceGainPerInvest',
  'economyGainTaxes',
  'crimeGainTaxes',
  'lawGainPass',
  'stabilityGainPass',
  'spyEffect',
  'spyCrimeIncrease',
  'diplomacyEffect',
  'warStabilityPenalty',
  'crimeDecay',
  'stabilityDecayPerWar',
  'incomePerTerritoryBase',
  'armyRecruitStrength',
  'armyMoveCost',
  'armyUpkeep',
  'maxActionsPerTurn',
  'baseSupportDecay',
  'baseScienceDrift',
  'baseCrimeGrowth',
  'eventStabilityVariance',
  'eventEconomyVariance',
]

const logWarnings = (context: string, warnings: string[]) => {
  if (warnings.length > 0) {
    warnings.forEach((warning) => {
      console.warn(`[AncientWar2] ${context}: ${warning}`)
    })
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertNationDefinitions = (input: unknown): asserts input is NationDefinition[] => {
  if (!Array.isArray(input)) {
    throw new Error('[AncientWar2] nations.json must export an array of nation definitions.')
  }
  const warnings: string[] = []

  input.forEach((nation, index) => {
    if (!isRecord(nation)) {
      throw new Error(`[AncientWar2] Nation entry at index ${index} is not an object.`)
    }
    if (typeof nation.id !== 'string' || nation.id.length === 0) {
      throw new Error(`[AncientWar2] Nation entry at index ${index} is missing a valid "id" field.`)
    }
    if (typeof nation.name !== 'string' || nation.name.length === 0) {
      warnings.push(`Nation "${nation.id}" is missing a name.`)
    }
    if (!Array.isArray(nation.territories)) {
      warnings.push(`Nation "${nation.id}" territories should be an array; defaulting to empty.`)
      ;(nation as NationDefinition).territories = []
    }
    if (!isRecord(nation.stats)) {
      throw new Error(`[AncientWar2] Nation "${nation.id}" has an invalid stats block.`)
    }
    STAT_KEYS.forEach((key) => {
      if (typeof (nation.stats as Record<string, unknown>)[key] !== 'number') {
        warnings.push(`Nation "${nation.id}" stat "${key}" is missing or not numeric.`)
        ;(nation.stats as Record<string, number>)[key] = 0
      }
    })
    if (!Array.isArray(nation.advantages)) {
      warnings.push(`Nation "${nation.id}" advantages should be an array; defaulting to empty.`)
      ;(nation as NationDefinition).advantages = []
    }
    if (!Array.isArray(nation.disadvantages)) {
      warnings.push(`Nation "${nation.id}" disadvantages should be an array; defaulting to empty.`)
      ;(nation as NationDefinition).disadvantages = []
    }
  })

  logWarnings('Nation schema mismatch', warnings)
}

const assertTerritoryDefinitions = (input: unknown): asserts input is TerritoryDefinition[] => {
  if (!Array.isArray(input)) {
    throw new Error('[AncientWar2] territories.json must export an array of territory definitions.')
  }
  const warnings: string[] = []

  input.forEach((territory, index) => {
    if (!isRecord(territory)) {
      throw new Error(`[AncientWar2] Territory entry at index ${index} is not an object.`)
    }
    if (typeof territory.id !== 'string' || territory.id.length === 0) {
      throw new Error(`[AncientWar2] Territory entry at index ${index} is missing a valid "id" field.`)
    }
    if (!Array.isArray(territory.coordinates) || territory.coordinates.length !== 2) {
      warnings.push(`Territory "${territory.id}" coordinates should be a [x, y] tuple; defaulting to [0, 0].`)
      ;(territory as TerritoryDefinition).coordinates = [0, 0]
    } else if (territory.coordinates.some((coord) => typeof coord !== 'number')) {
      warnings.push(`Territory "${territory.id}" coordinates contained non-numeric values; defaulting to [0, 0].`)
      ;(territory as TerritoryDefinition).coordinates = [0, 0]
    }
    if (!Array.isArray(territory.neighbors)) {
      warnings.push(`Territory "${territory.id}" neighbors should be an array; defaulting to empty.`)
      ;(territory as TerritoryDefinition).neighbors = []
    }
    if (typeof territory.ownerId !== 'string') {
      warnings.push(`Territory "${territory.id}" ownerId should be a string; defaulting to empty.`)
      ;(territory as TerritoryDefinition).ownerId = ''
    }
  })

  logWarnings('Territory schema mismatch', warnings)
}

const assertGameConfig = (input: unknown): asserts input is GameConfig => {
  if (!isRecord(input)) {
    throw new Error('[AncientWar2] config.json must export an object.')
  }
  const warnings: string[] = []

  if (
    !Array.isArray(input.combatRandomnessRange) ||
    input.combatRandomnessRange.length !== 2 ||
    input.combatRandomnessRange.some((entry: unknown) => typeof entry !== 'number')
  ) {
    warnings.push('combatRandomnessRange should be a [min, max] tuple; defaulting to [0.85, 1.15].')
    ;(input as GameConfig).combatRandomnessRange = [0.85, 1.15]
  }

  CONFIG_NUMERIC_KEYS.forEach((key) => {
    if (typeof input[key] !== 'number' || Number.isNaN(input[key])) {
      warnings.push(`${key} should be a numeric value; defaulting to 0.`)
      ;(input as GameConfig)[key] = 0 as GameConfig[typeof key]
    }
  })

  logWarnings('Config schema mismatch', warnings)
}

assertNationDefinitions(nationsRaw)
assertTerritoryDefinitions(territoriesRaw)
assertGameConfig(configRaw)

export const nations: NationDefinition[] = nationsRaw
export const territories: TerritoryDefinition[] = territoriesRaw
export const gameConfig: GameConfig = configRaw

export const buildInitialNationState = (definition: NationDefinition): NationState => ({
  ...definition,
  stats: { ...definition.stats },
  armies: definition.territories.map((territoryId, index) => ({
    id: `${definition.id}-army-${index + 1}`,
    territoryId,
    strength: 6,
  })),
  treasury: 20,
})

export const buildInitialTerritoryState = (
  definition: TerritoryDefinition,
): TerritoryState => ({
  ...definition,
  garrison: 5,
  development: 50,
  unrest: 10,
})
