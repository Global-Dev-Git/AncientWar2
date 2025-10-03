export type StatKey =
  | 'stability'
  | 'military'
  | 'tech'
  | 'economy'
  | 'crime'
  | 'influence'
  | 'support'
  | 'science'
  | 'laws'

export type TerrainType =
  | 'plains'
  | 'hills'
  | 'mountain'
  | 'river'
  | 'coastal'
  | 'steppe'
  | 'desert'

export interface NationDefinition {
  id: string
  name: string
  description: string
  territories: string[]
  stats: Record<StatKey, number>
  advantages: string[]
  disadvantages: string[]
}

export interface TerritoryDefinition {
  id: string
  name: string
  coordinates: [number, number]
  terrain: TerrainType
  neighbors: string[]
  ownerId: string
}

export interface TerritoryState extends TerritoryDefinition {
  garrison: number
  development: number
  unrest: number
}

export interface NationState extends NationDefinition {
  stats: Record<StatKey, number>
  armies: ArmyUnit[]
  treasury: number
  archetype?: AIArchetype
}

export interface ArmyUnit {
  id: string
  territoryId: string
  strength: number
}

export type AIArchetype = 'Expansionist' | 'Defensive' | 'Opportunistic'

export type ActionType =
  | 'InvestInTech'
  | 'RecruitArmy'
  | 'MoveArmy'
  | 'CollectTaxes'
  | 'PassLaw'
  | 'Spy'
  | 'DiplomacyOffer'
  | 'DeclareWar'
  | 'FormAlliance'
  | 'Bribe'
  | 'SuppressCrime'

export type TreatyType =
  | 'nonAggression'
  | 'trade'
  | 'defensivePact'
  | 'research'
  | 'tribute'

export interface BilateralDiplomacyStatus {
  score: number
  treaties: TreatyType[]
  reputation: number
  casusBelli: string | null
  treatyPenalty: number
  lastUpdated: number
}

export interface DiplomacyMatrix {
  relations: Record<string, Record<string, BilateralDiplomacyStatus>>
  wars: Set<string>
  alliances: Set<string>
  reputations: Record<string, number>
}

export interface NotificationEntry {
  id: string
  message: string
  tone: 'positive' | 'negative' | 'neutral'
  timestamp: number
}

export interface TurnLogEntry {
  id: string
  summary: string
  details?: string
  turn: number
  tone: 'info' | 'success' | 'warning' | 'danger'
}

export interface GameConfig {
  combatRandomnessRange: [number, number]
  techGainPerInvest: number
  scienceGainPerInvest: number
  economyGainTaxes: number
  crimeGainTaxes: number
  lawGainPass: number
  stabilityGainPass: number
  spyEffect: number
  spyCrimeIncrease: number
  diplomacyEffect: number
  warStabilityPenalty: number
  crimeDecay: number
  stabilityDecayPerWar: number
  incomePerTerritoryBase: number
  armyRecruitStrength: number
  armyMoveCost: number
  armyUpkeep: number
  maxActionsPerTurn: number
  baseSupportDecay: number
  baseScienceDrift: number
  baseCrimeGrowth: number
  eventStabilityVariance: number
  eventEconomyVariance: number
}

export interface GameState {
  turn: number
  currentPhase: 'selection' | 'player' | 'ai' | 'events' | 'gameover'
  playerNationId: string
  nations: Record<string, NationState>
  territories: Record<string, TerritoryState>
  diplomacy: DiplomacyMatrix
  tech: TechState
  traditions: TraditionState
  missionProgress: MissionProgressState
  scenario?: ScenarioDefinition
  achievements: AchievementState
  options: GameOptions
  replay: ReplayLog
  hotkeys: HotkeyBindings
  selectedTerritoryId?: string
  pendingAction?: PlayerAction
  log: TurnLogEntry[]
  notifications: NotificationEntry[]
  queuedEvents: string[]
  winner?: string
  defeated?: boolean
  actionsTaken: number
}

export interface PlayerAction {
  type: ActionType
  targetNationId?: string
  sourceTerritoryId?: string
  targetTerritoryId?: string
}

export interface CombatResult {
  attackerId: string
  defenderId: string
  territoryId: string
  outcome: 'attackerVictory' | 'defenderHolds' | 'stalemate'
  attackerLoss: number
  defenderLoss: number
}

export interface TechNode {
  id: string
  name: string
  description: string
  tier: number
  prerequisites: string[]
  cultureBonuses?: Partial<Record<string, Partial<Record<StatKey, number>>>>
  unlocks?: string[]
}

export interface TechState {
  researched: Set<string>
  available: Set<string>
  focus: string | null
  progress: Record<string, number>
  researchPoints: number
}

export interface TraditionDefinition {
  id: string
  name: string
  description: string
  cultureBonuses?: Partial<Record<string, Partial<Record<StatKey, number>>>>
  prerequisites: string[]
}

export interface TraditionState {
  adopted: Set<string>
  available: Set<string>
}

export interface MissionDefinition {
  id: string
  name: string
  description: string
  prerequisites: string[]
  objectives: MissionObjective[]
  rewards: MissionReward[]
}

export interface MissionObjective {
  type: 'controlTerritories' | 'statThreshold' | 'techResearched'
  value: number | string | string[]
  stat?: StatKey
}

export interface MissionReward {
  type: 'stat' | 'treasury' | 'reputation'
  target?: StatKey
  amount: number
}

export interface MissionProgress {
  missionId: string
  completedObjectives: number
  complete: boolean
}

export interface MissionProgressState {
  activeMissions: MissionProgress[]
  completed: Set<string>
}

export interface ScenarioDefinition {
  id: string
  name: string
  description: string
  startingMissions: string[]
  modifiers?: Partial<Record<StatKey, number>>
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  trigger: AchievementTrigger
}

export interface AchievementTrigger {
  type: 'firstWar' | 'techCount' | 'scenarioWin'
  threshold?: number
}

export interface AchievementState {
  unlocked: Set<string>
}

export interface ReplayEntry {
  turn: number
  actorId: string
  action: PlayerAction
}

export interface ReplayLog {
  seed: number
  entries: ReplayEntry[]
}

export interface HotkeyBindings {
  endTurn: string
  toggleMapMode: string
  openActions: string
  openDiplomacy: string
  openTech?: string
}

export interface GameModPackage {
  id: string
  name: string
  version: string
  techs?: TechNode[]
  traditions?: TraditionDefinition[]
  achievements?: AchievementDefinition[]
  missions?: MissionDefinition[]
  scenarios?: ScenarioDefinition[]
}

export interface GameOptions {
  seed: number
  ironman: boolean
  mode: 'sandbox' | 'scenario'
  scenarioId?: string
  mods?: GameModPackage[]
  hotkeys?: Partial<HotkeyBindings>
}
