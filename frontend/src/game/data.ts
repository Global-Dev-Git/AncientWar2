import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import configRaw from '../config/config.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  TradeState,
} from './types'
import { RESOURCE_TYPES } from './trade'

export const nations: NationDefinition[] = nationsRaw
export const territories: TerritoryDefinition[] = territoriesRaw
export const gameConfig: GameConfig = configRaw

export const buildInitialTradeState = (): TradeState => ({
  prices: RESOURCE_TYPES.reduce<Record<ResourceType, number>>((acc, resource) => {
    acc[resource] = 1
    return acc
  }, {} as Record<ResourceType, number>),
  history: RESOURCE_TYPES.reduce<Record<ResourceType, number[]>>((acc, resource) => {
    acc[resource] = [1]
    return acc
  }, {} as Record<ResourceType, number[]>),
  routes: [],
})

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
  resources: definition.resources ?? [],
})
