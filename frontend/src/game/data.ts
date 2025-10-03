import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import configRaw from '../config/config.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  VisibilityState,
} from './types'

const initialVisibilityMap = (ownerId: string): Record<string, VisibilityState> => ({
  [ownerId]: 'visible',
})

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
    unitCount: 6,
    morale: 70,
    supply: 80,
    supplyState: 'supplied',
    visibility: 'visible',
  })),
  treasury: 20,
})

export const buildInitialTerritoryState = (
  definition: TerritoryDefinition,
): TerritoryState => ({
  ...definition,
  garrison: 5,
  unitCount: 5,
  morale: 70,
  supply: 80,
  supplyState: 'supplied',
  siegeProgress: 0,
  development: 50,
  unrest: 10,
  visibility: initialVisibilityMap(definition.ownerId),
})
