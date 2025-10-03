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

export type ResourceType = 'grain' | 'timber' | 'bronze' | 'horses' | 'stone' | 'luxuries'

export interface ResourceStockpile {
  type: ResourceType
  amount: number
  reserved?: number
}

export type ResourceRichness = 'scarce' | 'abundant' | 'standard'

export interface TerritoryResource {
  type: ResourceType
  richness: ResourceRichness
  output: number
  notes?: string
}

export interface FortificationDefinition {
  level: number
  type: 'none' | 'palisade' | 'stone' | 'citadel'
  garrisonBonus: number
  supplyBonus?: number
}

export type CharacterRole = 'ruler' | 'general' | 'diplomat' | 'governor' | 'sage'

export interface CharacterDefinition {
  id: string
  name: string
  role: CharacterRole
  loyalty: number
  traits: string[]
}

export interface FactionDefinition {
  id: string
  name: string
  agenda: string
  approval: number
  influence: number
  leaderId?: string
}

export interface TraditionDefinition {
  id: string
  name: string
  description: string
  effects: string[]
}

export interface NationUnitDeployment {
  unitId: string
  territoryId: string
  strength?: number
  currentSupply?: number
}

export interface NationDefinition {
  id: string
  name: string
  description: string
  territories: string[]
  stats: Record<StatKey, number>
  advantages: string[]
  disadvantages: string[]
  resourceInventory?: ResourceStockpile[]
  characters?: CharacterDefinition[]
  factions?: FactionDefinition[]
  traditions?: string[]
  startingUnits?: NationUnitDeployment[]
  startingTechs?: string[]
  startingMissions?: string[]
  scenarioTags?: string[]
  startingTreasury?: number
}

export interface TerritoryDefinition {
  id: string
  name: string
  coordinates: [number, number]
  terrain: TerrainType
  neighbors: string[]
  ownerId: string
  resources: TerritoryResource[]
  fortifications: FortificationDefinition
}

export interface TerritoryState extends TerritoryDefinition {
  garrison: number
  development: number
  unrest: number
  supplyCache: number
}

export interface NationState extends NationDefinition {
  stats: Record<StatKey, number>
  armies: ArmyUnit[]
  treasury: number
  archetype?: AIArchetype
  resourceInventory: ResourceStockpile[]
  characters: CharacterDefinition[]
  factions: FactionDefinition[]
  traditions: string[]
  activeMissions: string[]
  completedMissions: string[]
  knownTechs: string[]
}

export type SupplyStatus = 'green' | 'strained' | 'depleted'

export interface ArmyUnit {
  id: string
  territoryId: string
  strength: number
  unitId?: string
  currentSupply: number
  maxSupply: number
  supplyStatus: SupplyStatus
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

export interface DiplomacyMatrix {
  relations: Record<string, Record<string, number>>
  wars: Set<string>
  alliances: Set<string>
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
  defaultUnitSupply: number
  supplyConsumptionPerTurn: number
  fortificationDefenseBonus: number
  missionRefreshInterval: number
  traditionAdoptionCost: number
  resourceShortagePenalty: number
}

export interface GameState {
  turn: number
  currentPhase: 'selection' | 'player' | 'ai' | 'events' | 'gameover'
  playerNationId: string
  nations: Record<string, NationState>
  territories: Record<string, TerritoryState>
  diplomacy: DiplomacyMatrix
  selectedTerritoryId?: string
  pendingAction?: PlayerAction
  log: TurnLogEntry[]
  notifications: NotificationEntry[]
  queuedEvents: string[]
  winner?: string
  defeated?: boolean
  actionsTaken: number
  scenarioId?: string
  saveVersion: number
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

export interface TechDefinition {
  id: string
  name: string
  tier: number
  prerequisites: string[]
  effects: string[]
}

export interface MissionDefinition {
  id: string
  name: string
  description: string
  rewards: string[]
  requirements: string[]
  expiresIn?: number
}

export interface ScenarioDefinition {
  id: string
  name: string
  description: string
  recommendedNations: string[]
  victoryConditions: string[]
  failureConditions: string[]
}

export interface SerializedDiplomacyMatrix extends Omit<DiplomacyMatrix, 'wars' | 'alliances'> {
  wars: string[]
  alliances: string[]
}

export interface SavePayload {
  version: number
  state: Omit<GameState, 'diplomacy'> & { diplomacy: SerializedDiplomacyMatrix }
}

export interface UnitDefinition {
  id: string
  name: string
  category: 'infantry' | 'cavalry' | 'naval' | 'siege' | 'support'
  baseStrength: number
  maxSupply: number
  upkeep: number
  supplyUse: number
  abilities: string[]
  techRequirement?: string
  description: string
}
