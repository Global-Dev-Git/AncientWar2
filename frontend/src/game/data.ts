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
  ResourceType,
  CharacterState,
  FactionStanding,
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

const DEFAULT_FACTIONS: FactionStanding[] = [
  { id: 'Military', support: 62 },
  { id: 'Priesthood', support: 58 },
  { id: 'Merchants', support: 60 },
  { id: 'Nobility', support: 55 },
]

const cloneFactions = (): FactionStanding[] => DEFAULT_FACTIONS.map((faction) => ({ ...faction }))

export const generateFallbackCharacters = (definition: NationDefinition): CharacterState[] => [
  {
    id: `${definition.id}-leader`,
    name: `${definition.name} Regent`,
    role: 'Leader',
    loyalty: 68,
    traits: ['Charismatic'],
    expertise: 'diplomacy',
  },
  {
    id: `${definition.id}-advisor-1`,
    name: 'Chief Scholar',
    role: 'Advisor',
    loyalty: 60,
    traits: ['Scholar'],
    expertise: 'intrigue',
  },
  {
    id: `${definition.id}-advisor-2`,
    name: 'Quartermaster',
    role: 'Advisor',
    loyalty: 55,
    traits: ['Cunning'],
    expertise: 'economy',
  },
  {
    id: `${definition.id}-general`,
    name: 'Legate Commander',
    role: 'General',
    loyalty: 65,
    traits: ['Brave'],
    expertise: 'military',
  },
]

export const buildInitialNationState = (definition: NationDefinition): NationState => ({
  ...definition,
  stats: { ...definition.stats },
  armies: definition.territories.map((territoryId, index) => ({
    id: `${definition.id}-army-${index + 1}`,
    territoryId,
    strength: 6,
  })),
  treasury: 20,
  characters: (definition.startingCharacters ?? generateFallbackCharacters(definition)).map((character) => ({
    ...character,
    traits: [...character.traits],
  })),
  factions: cloneFactions(),
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
