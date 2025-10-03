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

const VALID_TERRAINS: TerritoryDefinition['terrain'][] = [
  'plains',
  'hills',
  'mountain',
  'river',
  'coastal',
  'steppe',
  'desert',
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

const sanitiseNationDefinitions = (input: unknown): NationDefinition[] => {
  if (!Array.isArray(input)) {
    throw new Error('[AncientWar2] nations.json must export an array of nation definitions.')
  }
  const warnings: string[] = []

  const sanitised = input.map((nation, index): NationDefinition => {
    if (!isRecord(nation)) {
      throw new Error(`[AncientWar2] Nation entry at index ${index} is not an object.`)
    }
    if (typeof nation.id !== 'string' || nation.id.length === 0) {
      throw new Error(`[AncientWar2] Nation entry at index ${index} is missing a valid "id" field.`)
    }

    let territories: string[] = []
    if (Array.isArray(nation.territories)) {
      territories = nation.territories.filter((entry): entry is string => typeof entry === 'string')
      if (territories.length !== nation.territories.length) {
        warnings.push(`Nation "${nation.id}" territories should be strings; invalid entries removed.`)
      }
    } else {
      warnings.push(`Nation "${nation.id}" territories should be an array; defaulting to empty.`)
    }

    if (!isRecord(nation.stats)) {
      throw new Error(`[AncientWar2] Nation "${nation.id}" has an invalid stats block.`)
    }

    const stats: Record<StatKey, number> = STAT_KEYS.reduce((acc, key) => {
      const value = (nation.stats as Record<string, unknown>)[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[key] = value
      } else {
        warnings.push(`Nation "${nation.id}" stat "${key}" is missing or not numeric; defaulting to 0.`)
        acc[key] = 0
      }
      return acc
    }, {} as Record<StatKey, number>)

    let advantages: string[] = []
    if (Array.isArray(nation.advantages)) {
      advantages = nation.advantages.filter((entry): entry is string => typeof entry === 'string')
      if (advantages.length !== nation.advantages.length) {
        warnings.push(`Nation "${nation.id}" advantages contained invalid entries; non-strings removed.`)
      }
    } else {
      warnings.push(`Nation "${nation.id}" advantages should be an array; defaulting to empty.`)
    }

    let disadvantages: string[] = []
    if (Array.isArray(nation.disadvantages)) {
      disadvantages = nation.disadvantages.filter((entry): entry is string => typeof entry === 'string')
      if (disadvantages.length !== nation.disadvantages.length) {
        warnings.push(`Nation "${nation.id}" disadvantages contained invalid entries; non-strings removed.`)
      }
    } else {
      warnings.push(`Nation "${nation.id}" disadvantages should be an array; defaulting to empty.`)
    }

    if (typeof nation.name !== 'string' || nation.name.length === 0) {
      warnings.push(`Nation "${nation.id}" is missing a name; defaulting to id.`)
    }

    return {
      id: nation.id,
      name: typeof nation.name === 'string' && nation.name.length > 0 ? nation.name : nation.id,
      description: typeof nation.description === 'string' ? nation.description : '',
      territories,
      stats,
      advantages,
      disadvantages,
    }
  })

  logWarnings('Nation schema mismatch', warnings)
  return sanitised
}

const sanitiseTerritoryDefinitions = (input: unknown): TerritoryDefinition[] => {
  if (!Array.isArray(input)) {
    throw new Error('[AncientWar2] territories.json must export an array of territory definitions.')
  }

  const warnings: string[] = []

  const sanitised = input.map((territory, index): TerritoryDefinition => {
    if (!isRecord(territory)) {
      throw new Error(`[AncientWar2] Territory entry at index ${index} is not an object.`)
    }
    if (typeof territory.id !== 'string' || territory.id.length === 0) {
      throw new Error(`[AncientWar2] Territory entry at index ${index} is missing a valid "id" field.`)
    }

    let coordinates: [number, number] = [0, 0]
    if (
      Array.isArray(territory.coordinates) &&
      territory.coordinates.length === 2 &&
      territory.coordinates.every((coord) => typeof coord === 'number' && Number.isFinite(coord))
    ) {
      coordinates = [territory.coordinates[0], territory.coordinates[1]]
    } else {
      warnings.push(`Territory "${territory.id}" coordinates should be a [x, y] tuple; defaulting to [0, 0].`)
    }

    let neighbors: string[] = []
    if (Array.isArray(territory.neighbors)) {
      neighbors = territory.neighbors.filter((entry): entry is string => typeof entry === 'string')
      if (neighbors.length !== territory.neighbors.length) {
        warnings.push(`Territory "${territory.id}" neighbors contained invalid entries; non-strings removed.`)
      }
    } else {
      warnings.push(`Territory "${territory.id}" neighbors should be an array; defaulting to empty.`)
    }

    const ownerId = typeof territory.ownerId === 'string' ? territory.ownerId : ''
    if (typeof territory.ownerId !== 'string') {
      warnings.push(`Territory "${territory.id}" ownerId should be a string; defaulting to empty.`)
    }

    const name = typeof territory.name === 'string' && territory.name.length > 0 ? territory.name : territory.id
    if (typeof territory.name !== 'string' || territory.name.length === 0) {
      warnings.push(`Territory "${territory.id}" is missing a name; defaulting to id.`)
    }

    let terrain: TerritoryDefinition['terrain'] = 'plains'
    if (typeof territory.terrain === 'string' && VALID_TERRAINS.includes(territory.terrain as TerritoryDefinition['terrain'])) {
      terrain = territory.terrain as TerritoryDefinition['terrain']
    } else {
      warnings.push(`Territory "${territory.id}" terrain should be one of ${VALID_TERRAINS.join(', ')}; defaulting to plains.`)
    }

    return {
      id: territory.id,
      name,
      coordinates,
      terrain,
      neighbors,
      ownerId,
    }
  })

  logWarnings('Territory schema mismatch', warnings)
  return sanitised
}

const sanitiseGameConfig = (input: unknown): GameConfig => {
  if (!isRecord(input)) {
    throw new Error('[AncientWar2] config.json must export an object.')
  }
  const warnings: string[] = []

  const combatRandomnessRange: [number, number] =
    Array.isArray(input.combatRandomnessRange) &&
    input.combatRandomnessRange.length === 2 &&
    input.combatRandomnessRange.every((entry: unknown) => typeof entry === 'number' && Number.isFinite(entry))
      ? [input.combatRandomnessRange[0] as number, input.combatRandomnessRange[1] as number]
      : ([0.85, 1.15] as [number, number])
  if (
    !Array.isArray(input.combatRandomnessRange) ||
    input.combatRandomnessRange.length !== 2 ||
    input.combatRandomnessRange.some((entry: unknown) => typeof entry !== 'number')
  ) {
    warnings.push('combatRandomnessRange should be a [min, max] tuple; defaulting to [0.85, 1.15].')
  }

  const config: GameConfig = {
    combatRandomnessRange,
    techGainPerInvest: 0,
    scienceGainPerInvest: 0,
    economyGainTaxes: 0,
    crimeGainTaxes: 0,
    lawGainPass: 0,
    stabilityGainPass: 0,
    spyEffect: 0,
    spyCrimeIncrease: 0,
    diplomacyEffect: 0,
    warStabilityPenalty: 0,
    crimeDecay: 0,
    stabilityDecayPerWar: 0,
    incomePerTerritoryBase: 0,
    armyRecruitStrength: 0,
    armyMoveCost: 0,
    armyUpkeep: 0,
    maxActionsPerTurn: 0,
    baseSupportDecay: 0,
    baseScienceDrift: 0,
    baseCrimeGrowth: 0,
    eventStabilityVariance: 0,
    eventEconomyVariance: 0,
  }

  CONFIG_NUMERIC_KEYS.forEach((key) => {
    const value = input[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      config[key] = value as GameConfig[typeof key]
    } else {
      warnings.push(`${key} should be a numeric value; defaulting to 0.`)
    }
  })

  logWarnings('Config schema mismatch', warnings)
  return config
}

export const nations: NationDefinition[] = sanitiseNationDefinitions(nationsRaw)
export const territories: TerritoryDefinition[] = sanitiseTerritoryDefinitions(territoriesRaw)
export const gameConfig: GameConfig = sanitiseGameConfig(configRaw)

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
