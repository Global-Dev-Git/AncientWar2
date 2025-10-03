import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import configRaw from '../config/config.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  CharacterState,
  TraitKey,
  FactionState,
} from './types'

const COURT_TEMPLATE: Array<{
  role: string
  traits: TraitKey[]
  faction: 'court' | 'guild' | 'oracles'
}> = [
  { role: 'Chancellor', traits: ['administrator', 'charismatic'], faction: 'court' },
  { role: 'Spymaster', traits: ['schemer', 'spymaster'], faction: 'oracles' },
  { role: 'Marshal', traits: ['ironGuard', 'loyalist'], faction: 'court' },
  { role: 'Ambassador', traits: ['merchant', 'charismatic'], faction: 'guild' },
]

const FACTION_TEMPLATE: Array<{
  key: 'court' | 'guild' | 'oracles'
  name: string
  description: string
  focus: FactionState['focus']
}> = [
  {
    key: 'court',
    name: 'Court Nobility',
    description: 'Dynasts, generals and traditional power brokers.',
    focus: 'stability',
  },
  {
    key: 'guild',
    name: 'Guild Consortium',
    description: 'Merchants, artisans and civic officials.',
    focus: 'economy',
  },
  {
    key: 'oracles',
    name: 'Sacred Order',
    description: 'Priests, scholars and diplomats.',
    focus: 'diplomacy',
  },
]

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const buildInitialCourt = (definition: NationDefinition): CharacterState[] => {
  const stabilityBase = definition.stats.stability
  const influenceBase = definition.stats.influence
  return COURT_TEMPLATE.map((template, index) => {
    const loyalty = clamp(Math.round(stabilityBase - 5 * index + 20), 35, 90)
    const influence = clamp(Math.round(influenceBase / 2 + 10 - index * 3), 20, 80)
    const intrigue = clamp(Math.round(45 + influenceBase / 4 + index * 8), 35, 90)
    const factionId = `${definition.id}-${template.faction}`
    return {
      id: `${definition.id}-court-${index + 1}`,
      name: `${definition.name.split(' ')[0]} ${template.role}`,
      role: template.role,
      loyalty,
      influence,
      intrigue,
      traits: template.traits,
      factionId,
    }
  })
}

const buildInitialFactions = (definition: NationDefinition): FactionState[] => {
  return FACTION_TEMPLATE.map((template) => {
    const baseStat =
      template.focus === 'stability'
        ? definition.stats.stability
        : template.focus === 'economy'
        ? definition.stats.economy
        : definition.stats.influence
    const support = clamp(Math.round(45 + baseStat / 2), 30, 85)
    return {
      id: `${definition.id}-${template.key}`,
      name: `${definition.name.split(' ')[0]} ${template.name}`,
      description: template.description,
      support,
      focus: template.focus,
    }
  })
}

export const nations: NationDefinition[] = nationsRaw
export const territories: TerritoryDefinition[] = territoriesRaw as TerritoryDefinition[]
export const gameConfig: GameConfig = configRaw as GameConfig

export const buildInitialNationState = (definition: NationDefinition): NationState => ({
  ...definition,
  stats: { ...definition.stats },
  armies: definition.territories.map((territoryId, index) => ({
    id: `${definition.id}-army-${index + 1}`,
    territoryId,
    strength: 6,
  })),
  treasury: 20,
  court: buildInitialCourt(definition),
  factions: buildInitialFactions(definition),
})

export const buildInitialTerritoryState = (
  definition: TerritoryDefinition,
): TerritoryState => ({
  ...definition,
  garrison: 5,
  development: 50,
  unrest: 10,
})
