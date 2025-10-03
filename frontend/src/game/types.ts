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

export type ResourceType =
  | 'grain'
  | 'timber'
  | 'copper'
  | 'tin'
  | 'horses'
  | 'papyrus'

export interface TradeRoute {
  id: string
  from: string
  to: string
  mode: 'land' | 'sea'
  blocked: boolean
}

export interface TradeState {
  prices: Record<ResourceType, number>
  history: Record<ResourceType, number[]>
  routes: TradeRoute[]
}

export interface NationEconomySummary {
  tradeIncome: number
  maintenance: number
  blockedRoutes: number
  smugglingFactor: number
}

export interface NationDefinition {
  id: string
  name: string
  description: string
  territories: string[]
  stats: Record<StatKey, number>
  advantages: string[]
  disadvantages: string[]
  culture?: string
  traditions?: string[]
  resourceNeeds?: Record<string, number>
}

export interface TerritoryDefinition {
  id: string
  name: string
  coordinates: [number, number]
  terrain: TerrainType
  neighbors: string[]
  ownerId: string
  resources?: ResourceType[]
}

export interface TerritoryState extends TerritoryDefinition {
  garrison: number
  development: number
  unrest: number
  resources: ResourceType[]
}

export interface NationState extends NationDefinition {
  stats: Record<StatKey, number>
  armies: ArmyUnit[]
  treasury: number
  archetype?: AIArchetype
  economySummary?: NationEconomySummary
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
  tariffRate: number
  blockadeEffect: number
  routeMaintenance: number
  priceElasticity: number
  priceFloor: number
  priceCeiling: number
}

export interface GameState {
  turn: number
  currentPhase: 'selection' | 'player' | 'ai' | 'events' | 'gameover'
  playerNationId: string
  nations: Record<string, NationState>
  territories: Record<string, TerritoryState>
  diplomacy: DiplomacyMatrix
  trade: TradeState
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
