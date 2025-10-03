import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import unitsRaw from '../data/units.json'
import techRaw from '../data/tech.json'
import missionsRaw from '../data/missions.json'
import configRaw from '../config/config.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  UnitDefinition,
  TechDefinition,
  MissionDefinition,
  NationUnitDeployment,
  SupplyStatus,
} from './types'

export const units: UnitDefinition[] = unitsRaw as UnitDefinition[]
export const tech: TechDefinition[] = techRaw as TechDefinition[]
export const missions: MissionDefinition[] = missionsRaw as MissionDefinition[]

export const nations: NationDefinition[] = nationsRaw as NationDefinition[]
export const territories: TerritoryDefinition[] = territoriesRaw as TerritoryDefinition[]
export const gameConfig: GameConfig = configRaw as GameConfig

const defaultUnitId = unitsRaw[0]?.id

const cloneResourceInventory = (resources: NationDefinition['resourceInventory']): NationState['resourceInventory'] =>
  resources?.map((entry) => ({ ...entry })) ?? []

const cloneCharacters = (characters: NationDefinition['characters']): NationState['characters'] =>
  characters?.map((character) => ({ ...character, traits: [...character.traits] })) ?? []

const cloneFactions = (factions: NationDefinition['factions']): NationState['factions'] =>
  factions?.map((faction) => ({ ...faction })) ?? []

const determineSupplyStatus = (current: number, max: number): SupplyStatus => {
  if (current >= max * 0.66) return 'green'
  if (current >= max * 0.33) return 'strained'
  return 'depleted'
}

export const buildInitialNationState = (definition: NationDefinition): NationState => {
  const deployments: NationUnitDeployment[] = definition.startingUnits?.length
    ? definition.startingUnits
    : definition.territories.map((territoryId) => ({
        unitId: defaultUnitId ?? 'levy_infantry',
        territoryId,
      }))

  const armies = deployments.map((deployment, index) => {
    const unit = units.find((entry) => entry.id === deployment.unitId)
    const maxSupply = deployment.currentSupply ?? unit?.maxSupply ?? gameConfig.defaultUnitSupply
    const strength = deployment.strength ?? unit?.baseStrength ?? gameConfig.armyRecruitStrength
    const currentSupply = Math.min(maxSupply, deployment.currentSupply ?? maxSupply)
    return {
      id: `${definition.id}-army-${index + 1}`,
      territoryId: deployment.territoryId,
      strength,
      unitId: deployment.unitId,
      currentSupply,
      maxSupply,
      supplyStatus: determineSupplyStatus(currentSupply, maxSupply),
    }
  })

  return {
    ...definition,
    stats: { ...definition.stats },
    armies,
    treasury: definition.startingTreasury ?? 20,
    resourceInventory: cloneResourceInventory(definition.resourceInventory),
    characters: cloneCharacters(definition.characters),
    factions: cloneFactions(definition.factions),
    traditions: definition.traditions ? [...definition.traditions] : [],
    activeMissions: definition.startingMissions ? [...definition.startingMissions] : [],
    completedMissions: [],
    knownTechs: definition.startingTechs ? [...definition.startingTechs] : [],
  }
}

export const buildInitialTerritoryState = (
  definition: TerritoryDefinition,
): TerritoryState => ({
  ...definition,
  garrison: 5,
  development: 50,
  unrest: 10,
  supplyCache: definition.resources.reduce((total, resource) => total + Math.round(resource.output / 2), 0),
})
