import type {
  AchievementDefinition,
  AchievementTrigger,
  GameModPackage,
  MissionDefinition,
  ScenarioDefinition,
  TechNode,
  TraditionDefinition,
} from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validateArray = <T extends { id: string }>(
  entries: unknown,
  validator: (entry: Record<string, unknown>) => T,
): T[] => {
  if (!Array.isArray(entries)) {
    throw new Error('Expected array in mod package section')
  }
  return entries.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('Invalid entry in mod package section')
    }
    return validator(entry)
  })
}

const validateTech = (entry: Record<string, unknown>): TechNode => {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('Tech entries require id and name')
  }
  return {
    id: entry.id,
    name: entry.name,
    description: String(entry.description ?? ''),
    tier: Number(entry.tier ?? 1),
    prerequisites: Array.isArray(entry.prerequisites)
      ? (entry.prerequisites as string[])
      : [],
    cultureBonuses: entry.cultureBonuses as TechNode['cultureBonuses'],
    unlocks: Array.isArray(entry.unlocks) ? (entry.unlocks as string[]) : undefined,
  }
}

const validateTradition = (entry: Record<string, unknown>): TraditionDefinition => {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('Tradition entries require id and name')
  }
  return {
    id: entry.id,
    name: entry.name,
    description: String(entry.description ?? ''),
    prerequisites: Array.isArray(entry.prerequisites)
      ? (entry.prerequisites as string[])
      : [],
    cultureBonuses: entry.cultureBonuses as TraditionDefinition['cultureBonuses'],
  }
}

const validateAchievement = (entry: Record<string, unknown>): AchievementDefinition => {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string' || !isRecord(entry.trigger)) {
    throw new Error('Achievements require id, name and trigger')
  }
  const triggerRecord = entry.trigger
  if (typeof triggerRecord.type !== 'string') {
    throw new Error('Achievement trigger requires a type')
  }
  if (!['firstWar', 'techCount', 'scenarioWin'].includes(triggerRecord.type)) {
    throw new Error(`Unsupported achievement trigger type ${triggerRecord.type}`)
  }
  const trigger: AchievementTrigger = { type: triggerRecord.type as AchievementTrigger['type'] }
  if ('threshold' in triggerRecord && triggerRecord.threshold !== undefined) {
    trigger.threshold = Number(triggerRecord.threshold)
  }
  return {
    id: entry.id,
    name: entry.name,
    description: String(entry.description ?? ''),
    trigger,
  }
}

const validateMission = (entry: Record<string, unknown>): MissionDefinition => {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('Mission entries require id and name')
  }
  return {
    id: entry.id,
    name: entry.name,
    description: String(entry.description ?? ''),
    prerequisites: Array.isArray(entry.prerequisites)
      ? (entry.prerequisites as string[])
      : [],
    objectives: Array.isArray(entry.objectives)
      ? (entry.objectives as MissionDefinition['objectives'])
      : [],
    rewards: Array.isArray(entry.rewards)
      ? (entry.rewards as MissionDefinition['rewards'])
      : [],
  }
}

const validateScenario = (entry: Record<string, unknown>): ScenarioDefinition => {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('Scenario entries require id and name')
  }
  return {
    id: entry.id,
    name: entry.name,
    description: String(entry.description ?? ''),
    startingMissions: Array.isArray(entry.startingMissions)
      ? (entry.startingMissions as string[])
      : [],
    modifiers: entry.modifiers as ScenarioDefinition['modifiers'],
  }
}

export const parseModPayload = (payload: string): GameModPackage => {
  const parsed = JSON.parse(payload)
  if (!isRecord(parsed)) {
    throw new Error('Invalid mod package root')
  }
  if (typeof parsed.id !== 'string' || typeof parsed.name !== 'string' || typeof parsed.version !== 'string') {
    throw new Error('Mod package requires id, name, and version fields')
  }
  const mod: GameModPackage = {
    id: parsed.id,
    name: parsed.name,
    version: parsed.version,
  }
  if (parsed.techs) {
    mod.techs = validateArray(parsed.techs, validateTech)
  }
  if (parsed.traditions) {
    mod.traditions = validateArray(parsed.traditions, validateTradition)
  }
  if (parsed.achievements) {
    mod.achievements = validateArray(parsed.achievements, validateAchievement)
  }
  if (parsed.missions) {
    mod.missions = validateArray(parsed.missions, validateMission)
  }
  if (parsed.scenarios) {
    mod.scenarios = validateArray(parsed.scenarios, validateScenario)
  }
  return mod
}
