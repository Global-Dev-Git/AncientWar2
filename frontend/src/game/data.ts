import nationsRaw from '../data/nations.json'
import territoriesRaw from '../data/territories.json'
import configRaw from '../config/config.json'
import techTreeRaw from '../data/techTree.json'
import traditionsRaw from '../data/traditions.json'
import missionsRaw from '../data/missions.json'
import scenariosRaw from '../data/scenarios.json'
import achievementsRaw from '../data/achievements.json'
import type {
  NationDefinition,
  TerritoryDefinition,
  GameConfig,
  NationState,
  TerritoryState,
  TechNode,
  TraditionDefinition,
  MissionDefinition,
  ScenarioDefinition,
  AchievementDefinition,
} from './types'

export const nations: NationDefinition[] = nationsRaw as NationDefinition[]
export const territories: TerritoryDefinition[] = territoriesRaw as TerritoryDefinition[]
export const gameConfig: GameConfig = {
  ...configRaw,
  combatRandomnessRange: configRaw.combatRandomnessRange as [number, number],
}
export const techTree: TechNode[] = techTreeRaw as TechNode[]
export const traditions: TraditionDefinition[] = traditionsRaw as TraditionDefinition[]
export const missions: MissionDefinition[] = missionsRaw as MissionDefinition[]
export const scenarios: ScenarioDefinition[] = scenariosRaw as ScenarioDefinition[]
export const achievements: AchievementDefinition[] = achievementsRaw as AchievementDefinition[]

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
