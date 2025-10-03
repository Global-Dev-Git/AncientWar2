import { achievements, missions, scenarios, techTree, traditions } from './data'
import type {
  AchievementDefinition,
  GameModPackage,
  GameState,
  MissionDefinition,
  ScenarioDefinition,
  TechNode,
  TechState,
  TraditionDefinition,
  TraditionState,
  NationState,
} from './types'
import { updateStats } from './utils'

const RESEARCH_THRESHOLD = 100

const mergeContent = <T extends { id: string }>(base: T[], mods: GameModPackage[] | undefined, key: keyof GameModPackage): T[] => {
  if (!mods?.length) {
    return base
  }
  const registry = new Map(base.map((entry) => [entry.id, entry]))
  mods.forEach((mod) => {
    const entries = mod[key]
    if (Array.isArray(entries)) {
      entries.forEach((entry) => {
        registry.set(entry.id, entry as unknown as T)
      })
    }
  })
  return Array.from(registry.values())
}

export const getMergedTechTree = (mods?: GameModPackage[]): TechNode[] =>
  mergeContent(techTree, mods, 'techs')

export const getMergedTraditions = (mods?: GameModPackage[]): TraditionDefinition[] =>
  mergeContent(traditions, mods, 'traditions')

export const getMergedMissions = (mods?: GameModPackage[]): MissionDefinition[] =>
  mergeContent(missions, mods, 'missions')

export const getMergedScenarios = (mods?: GameModPackage[]): ScenarioDefinition[] =>
  mergeContent(scenarios, mods, 'scenarios')

export const getMergedAchievements = (mods?: GameModPackage[]): AchievementDefinition[] =>
  mergeContent(achievements, mods, 'achievements')

const prerequisitesMet = (researched: Set<string>, prerequisites: string[]): boolean =>
  prerequisites.every((id) => researched.has(id))

const initialiseAvailability = (nodes: TechNode[], researched: Set<string>): Set<string> => {
  const available = new Set<string>()
  nodes.forEach((node) => {
    if (!researched.has(node.id) && prerequisitesMet(researched, node.prerequisites)) {
      available.add(node.id)
    }
  })
  return available
}

export const buildInitialTechState = (mods?: GameModPackage[]): TechState => {
  const merged = getMergedTechTree(mods)
  const researched = new Set<string>()
  const available = initialiseAvailability(merged, researched)
  return {
    researched,
    available,
    focus: null,
    progress: {},
    researchPoints: 0,
  }
}

export const buildInitialTraditionState = (mods?: GameModPackage[]): TraditionState => {
  const adopted = new Set<string>()
  const available = new Set<string>()
  const merged = getMergedTraditions(mods)
  merged.forEach((tradition) => {
    if (tradition.prerequisites.length === 0) {
      available.add(tradition.id)
    }
  })
  return {
    adopted,
    available,
  }
}

export const calculateTechAvailability = (state: TechState, mods?: GameModPackage[]): void => {
  const merged = getMergedTechTree(mods)
  merged.forEach((node) => {
    if (state.researched.has(node.id)) return
    if (prerequisitesMet(state.researched, node.prerequisites)) {
      state.available.add(node.id)
    }
  })
}

export const setTechFocus = (state: TechState, techId: string | null): void => {
  if (techId && !state.available.has(techId) && !state.researched.has(techId)) {
    return
  }
  state.focus = techId
  if (techId && state.progress[techId] === undefined) {
    state.progress[techId] = 0
  }
}

const applyCultureBonuses = (
  gameState: GameState,
  node: TechNode | TraditionDefinition,
  nationId: string,
): void => {
  const nation = gameState.nations[nationId]
  if (!nation || !node.cultureBonuses) return
  const bonuses = node.cultureBonuses[nationId]
  if (!bonuses) return
  Object.entries(bonuses).forEach(([stat, value]) => {
    updateStats(nation, stat as keyof NationState['stats'], value ?? 0)
  })
}

const completeTech = (gameState: GameState, node: TechNode, nationId: string): void => {
  gameState.tech.researched.add(node.id)
  gameState.tech.available.delete(node.id)
  delete gameState.tech.progress[node.id]
  applyCultureBonuses(gameState, node, nationId)
  calculateTechAvailability(gameState.tech, gameState.options.mods)
}

export const advanceTechResearch = (
  gameState: GameState,
  nationId: string,
  points: number,
): void => {
  const { tech } = gameState
  if (!tech.focus) {
    tech.researchPoints += points
    return
  }
  tech.researchPoints += points
  tech.progress[tech.focus] = (tech.progress[tech.focus] ?? 0) + points
  const node = getMergedTechTree(gameState.options.mods).find((entry) => entry.id === tech.focus)
  if (!node) return
  if (tech.progress[tech.focus] >= RESEARCH_THRESHOLD) {
    completeTech(gameState, node, nationId)
    tech.focus = null
  }
}

export const adoptTradition = (
  gameState: GameState,
  traditionId: string,
  nationId: string,
): boolean => {
  const { traditions: traditionState } = gameState
  if (traditionState.adopted.has(traditionId)) {
    return false
  }
  if (!traditionState.available.has(traditionId)) {
    return false
  }
  const definition = getMergedTraditions(gameState.options.mods).find((entry) => entry.id === traditionId)
  if (!definition) return false
  traditionState.adopted.add(traditionId)
  traditionState.available.delete(traditionId)
  applyCultureBonuses(gameState, definition, nationId)
  // unlock next traditions
  getMergedTraditions(gameState.options.mods).forEach((tradition) => {
    if (traditionState.adopted.has(tradition.id)) return
    if (prerequisitesMet(traditionState.adopted, tradition.prerequisites)) {
      traditionState.available.add(tradition.id)
    }
  })
  return true
}

export const serialiseTechState = (state: TechState) => ({
  researched: Array.from(state.researched),
  available: Array.from(state.available),
  focus: state.focus,
  progress: state.progress,
  researchPoints: state.researchPoints,
})

export const hydrateTechState = (data: ReturnType<typeof serialiseTechState>): TechState => ({
  researched: new Set(data.researched),
  available: new Set(data.available),
  focus: data.focus,
  progress: data.progress ?? {},
  researchPoints: data.researchPoints ?? 0,
})

export const serialiseTraditionState = (state: TraditionState) => ({
  adopted: Array.from(state.adopted),
  available: Array.from(state.available),
})

export const hydrateTraditionState = (
  data: ReturnType<typeof serialiseTraditionState>,
): TraditionState => ({
  adopted: new Set(data.adopted),
  available: new Set(data.available),
})

export const serialiseAchievements = (state: GameState['achievements']) => ({
  unlocked: Array.from(state.unlocked),
})

export const hydrateAchievements = (
  data: ReturnType<typeof serialiseAchievements>,
): GameState['achievements'] => ({
  unlocked: new Set(data.unlocked),
})

export const serialiseMissionProgress = (state: GameState['missionProgress']) => ({
  activeMissions: state.activeMissions,
  completed: Array.from(state.completed),
})

export const hydrateMissionProgress = (
  data: ReturnType<typeof serialiseMissionProgress>,
): GameState['missionProgress'] => ({
  activeMissions: data.activeMissions ?? [],
  completed: new Set(data.completed ?? []),
})

export const serialiseReplay = (state: GameState['replay']) => state

export const hydrateReplay = (data: ReturnType<typeof serialiseReplay>): GameState['replay'] => ({
  seed: data.seed,
  entries: data.entries ?? [],
})
