import { nations, territories, gameConfig, buildInitialNationState, buildInitialTerritoryState } from './data'
import { RandomGenerator } from './random'
import { TERRAIN_MODIFIERS } from './constants'
import type {
  ActionType,
  CombatResult,
  EconomyState,
  GameState,
  NationState,
  ResourceLedger,
  ResourceType,
  TradeRoute,
  PlayerAction,
  TerritoryState,
} from './types'
import {
  adjustTerritoryGarrison,
  ensureRelationMatrix,
  getControlledTerritories,
  modifyRelation,
  pushLog,
  pushNotification,
  toggleAlliance,
  toggleWar,
  updateStats,
  isAtWar,
} from './utils'
import { decideActions, getArchetypeMap } from './ai'
import { applyTurnEvents } from './events'

const ACTION_COSTS: Record<ActionType, number> = {
  InvestInTech: 6,
  RecruitArmy: 5,
  MoveArmy: 0,
  CollectTaxes: 0,
  PassLaw: 4,
  Spy: 4,
  DiplomacyOffer: 3,
  DeclareWar: 0,
  FormAlliance: 0,
  Bribe: 5,
  SuppressCrime: 4,
}

const UNIQUE_TRAIT_COST_MODIFIERS: Partial<Record<string, Partial<Record<ActionType, number>>>> = {
  carthage: { RecruitArmy: -1 },
  medes: { RecruitArmy: 1 },
  minoa: { RecruitArmy: 1 },
}

const RESOURCE_TYPES: ResourceType[] = ['grain', 'timber', 'ore', 'luxury']

const BASE_MARKET_PRICES: Record<ResourceType, number> = {
  grain: 10,
  timber: 12,
  ore: 16,
  luxury: 24,
}

const PRICE_HISTORY_LENGTH = 12

const TERRAIN_RESOURCE_OUTPUT: Record<TerritoryState['terrain'], ResourceLedger> = {
  plains: { grain: 6, timber: 2, ore: 1, luxury: 1 },
  hills: { grain: 4, timber: 3, ore: 2, luxury: 1 },
  mountain: { grain: 2, timber: 1, ore: 4, luxury: 1 },
  river: { grain: 7, timber: 2, ore: 1, luxury: 2 },
  coastal: { grain: 5, timber: 3, ore: 1, luxury: 3 },
  steppe: { grain: 3, timber: 2, ore: 1, luxury: 1 },
  desert: { grain: 1, timber: 1, ore: 1, luxury: 2 },
}

const emptyLedger = (): ResourceLedger => ({ grain: 0, timber: 0, ore: 0, luxury: 0 })

const cloneLedger = (ledger: ResourceLedger): ResourceLedger => ({ ...ledger })

const addLedger = (target: ResourceLedger, delta: ResourceLedger): ResourceLedger => {
  RESOURCE_TYPES.forEach((resource) => {
    target[resource] += delta[resource]
  })
  return target
}

const scaleLedger = (ledger: ResourceLedger, factor: number): ResourceLedger => {
  const result = emptyLedger()
  RESOURCE_TYPES.forEach((resource) => {
    result[resource] = ledger[resource] * factor
  })
  return result
}

const subtractLedger = (a: ResourceLedger, b: ResourceLedger): ResourceLedger => {
  const result = emptyLedger()
  RESOURCE_TYPES.forEach((resource) => {
    result[resource] = a[resource] - b[resource]
  })
  return result
}

const ledgerValue = (ledger: ResourceLedger, prices: Record<ResourceType, number>): number =>
  RESOURCE_TYPES.reduce((sum, resource) => sum + ledger[resource] * prices[resource], 0)

const calculateTerritoryProduction = (territory: TerritoryState): ResourceLedger => {
  const base = TERRAIN_RESOURCE_OUTPUT[territory.terrain] ?? emptyLedger()
  const multiplier = 0.6 + territory.development / 100
  return scaleLedger(base, multiplier)
}

const calculateNationProduction = (state: GameState, nationId: string): ResourceLedger => {
  const production = emptyLedger()
  const tiles = getControlledTerritories(state, nationId)
  tiles.forEach((territory) => {
    addLedger(production, calculateTerritoryProduction(territory))
  })
  return production
}

const calculateNationDemand = (nation: NationState, territoriesControlled: number): ResourceLedger => {
  const baseDemand = emptyLedger()
  const populationFactor = Math.max(1, territoriesControlled)
  baseDemand.grain = populationFactor * (4 + nation.stats.stability / 50)
  baseDemand.timber = populationFactor * (2 + nation.stats.economy / 80)
  baseDemand.ore = populationFactor * (1.5 + nation.stats.military / 120)
  baseDemand.luxury = populationFactor * (0.75 + nation.stats.influence / 140)
  return baseDemand
}

const buildTradeRoutes = (state: GameState): TradeRoute[] => {
  const routes: TradeRoute[] = []
  const seen = new Set<string>()
  Object.values(state.territories).forEach((territory) => {
    territory.neighbors.forEach((neighborId) => {
      const neighbor = state.territories[neighborId]
      if (!neighbor) return
      if (neighbor.ownerId !== territory.ownerId) return
      const pairKey = [territory.id, neighbor.id].sort().join('|')
      if (seen.has(pairKey)) return
      seen.add(pairKey)
      const mode = territory.terrain === 'coastal' || neighbor.terrain === 'coastal' ? 'sea' : 'land'
      routes.push({
        id: `${territory.ownerId}:${pairKey}:${mode}`,
        ownerId: territory.ownerId,
        from: territory.id,
        to: neighbor.id,
        mode,
        blocked: false,
        smugglingModifier: 0,
      })
    })
  })
  return routes
}

const markBlockades = (state: GameState, routes: TradeRoute[]): void => {
  routes.forEach((route) => {
    if (route.mode !== 'sea') {
      route.blocked = false
      route.smugglingModifier = 0
      return
    }
    const from = state.territories[route.from]
    const to = state.territories[route.to]
    const hostileNeighbors = new Set<string>([...from.neighbors, ...to.neighbors])
    const hasBlockade = Array.from(hostileNeighbors).some((neighborId) => {
      const neighbor = state.territories[neighborId]
      if (!neighbor) return false
      if (neighbor.ownerId === route.ownerId) return false
      return isAtWar(state.diplomacy, route.ownerId, neighbor.ownerId)
    })
    route.blocked = hasBlockade
    route.smugglingModifier = hasBlockade ? gameConfig.smugglingEfficiency : 0
  })
}

const deriveBlockadeReports = (state: GameState, routes: TradeRoute[]): EconomyState['blockades'] => {
  const reportsMap = new Map<string, {
    ownerId: string
    aggressorId: string
    territories: Set<string>
    blockedRoutes: number
    totalRoutes: number
  }>()

  routes
    .filter((route) => route.mode === 'sea')
    .forEach((route) => {
      const keyBase = `${route.ownerId}`
      const ownerEntry = reportsMap.get(keyBase)
      if (!ownerEntry) {
        reportsMap.set(keyBase, {
          ownerId: route.ownerId,
          aggressorId: '',
          territories: new Set<string>(),
          blockedRoutes: route.blocked ? 1 : 0,
          totalRoutes: 1,
        })
      } else {
        ownerEntry.totalRoutes += 1
        if (route.blocked) {
          ownerEntry.blockedRoutes += 1
        }
      }

      if (!route.blocked) {
        return
      }

      const from = state.territories[route.from]
      const to = state.territories[route.to]
      const neighbors = new Set<string>([...from.neighbors, ...to.neighbors])
      neighbors.forEach((neighborId) => {
        const neighbor = state.territories[neighborId]
        if (!neighbor) return
        if (neighbor.ownerId === route.ownerId) return
        if (!isAtWar(state.diplomacy, route.ownerId, neighbor.ownerId)) return
        const pairKey = `${route.ownerId}|${neighbor.ownerId}`
        let entry = reportsMap.get(pairKey)
        if (!entry) {
          entry = {
            ownerId: route.ownerId,
            aggressorId: neighbor.ownerId,
            territories: new Set<string>(),
            blockedRoutes: 0,
            totalRoutes: 0,
          }
          reportsMap.set(pairKey, entry)
        }
        entry.blockedRoutes += 1
        entry.totalRoutes += 1
        entry.territories.add(route.from)
        entry.territories.add(route.to)
      })
    })

  return Array.from(reportsMap.values()).map((entry) => ({
    ownerId: entry.ownerId,
    aggressorId: entry.aggressorId,
    territories: Array.from(entry.territories),
    severity: entry.totalRoutes > 0 ? entry.blockedRoutes / entry.totalRoutes : 0,
  }))
}

const createInitialEconomyState = (state: GameState): EconomyState => {
  const routes = buildTradeRoutes(state)
  markBlockades(state, routes)
  const marketPrices: Record<ResourceType, number> = { ...BASE_MARKET_PRICES }
  const priceHistory: Record<ResourceType, number[]> = {
    grain: [marketPrices.grain],
    timber: [marketPrices.timber],
    ore: [marketPrices.ore],
    luxury: [marketPrices.luxury],
  }

  return {
    marketPrices,
    priceHistory,
    tradeRoutes: routes,
    blockades: deriveBlockadeReports(state, routes),
    nationSummaries: {},
  }
}

const updateEconomySystems = (state: GameState): void => {
  const routes = buildTradeRoutes(state)
  markBlockades(state, routes)

  const productionByNation: Record<string, ResourceLedger> = {}
  const demandByNation: Record<string, ResourceLedger> = {}
  const globalSupply = emptyLedger()
  const globalDemand = emptyLedger()

  Object.values(state.nations).forEach((nation) => {
    const territoriesControlled = getControlledTerritories(state, nation.id).length
    const production = calculateNationProduction(state, nation.id)
    const demand = calculateNationDemand(nation, territoriesControlled)
    productionByNation[nation.id] = production
    demandByNation[nation.id] = demand
    addLedger(globalSupply, production)
    addLedger(globalDemand, demand)
  })

  const marketPrices: Record<ResourceType, number> = { ...BASE_MARKET_PRICES }
  RESOURCE_TYPES.forEach((resource) => {
    const base = BASE_MARKET_PRICES[resource]
    const supply = globalSupply[resource]
    const demand = globalDemand[resource]
    const imbalance = demand - supply
    const elasticity = gameConfig.priceElasticity
    const ratio = demand > 0 ? imbalance / demand : 0
    const multiplier = 1 + elasticity * ratio
    const price = base * multiplier
    marketPrices[resource] = Math.max(base * 0.4, Math.min(base * 1.8, Number(price.toFixed(2))))
  })

  const nationSummaries = Object.values(state.nations).reduce<Record<string, EconomyState['nationSummaries'][string]>>( (
    acc,
    nation,
  ) => {
    const production = productionByNation[nation.id]
    const demand = demandByNation[nation.id]
    const netExports = subtractLedger(production, demand)

    const routesOwned = routes.filter((route) => route.ownerId === nation.id)
    const totalSea = routesOwned.filter((route) => route.mode === 'sea')
    const blockedSea = totalSea.filter((route) => route.blocked)
    const blockadePressure = totalSea.length > 0 ? blockedSea.length / totalSea.length : 0
    const smugglingRelief = blockadePressure * gameConfig.smugglingEfficiency

    const exportLedger = emptyLedger()
    RESOURCE_TYPES.forEach((resource) => {
      exportLedger[resource] = Math.max(0, netExports[resource])
    })
    const exportValue = ledgerValue(exportLedger, marketPrices)
    const mitigatedExports = exportValue * (1 - gameConfig.blockadePenalty * blockadePressure)
    const smugglingRecovered = exportValue * smugglingRelief
    const tariffRevenue = (mitigatedExports + smugglingRecovered) * gameConfig.baseTariffRate
    const maintenanceCost = routesOwned.length * gameConfig.routeMaintenance
    const tradeIncome = tariffRevenue - maintenanceCost

    nation.treasury = Math.max(0, nation.treasury + Math.round(tradeIncome))

    acc[nation.id] = {
      production: cloneLedger(production),
      demand: cloneLedger(demand),
      netExports,
      tariffRevenue: Number(tariffRevenue.toFixed(2)),
      maintenanceCost: Number(maintenanceCost.toFixed(2)),
      tradeIncome: Number(tradeIncome.toFixed(2)),
      blockadePressure: Number(blockadePressure.toFixed(2)),
      smugglingRelief: Number(smugglingRelief.toFixed(2)),
    }
    return acc
  }, {})

  const priceHistory = { ...state.economy.priceHistory }
  RESOURCE_TYPES.forEach((resource) => {
    const history = priceHistory[resource] ? [...priceHistory[resource]] : []
    history.push(marketPrices[resource])
    if (history.length > PRICE_HISTORY_LENGTH) {
      history.splice(0, history.length - PRICE_HISTORY_LENGTH)
    }
    priceHistory[resource] = history
  })

  state.economy = {
    marketPrices,
    priceHistory,
    tradeRoutes: routes,
    blockades: deriveBlockadeReports(state, routes),
    nationSummaries,
  }
}

export const createInitialGameState = (
  playerNationId: string,
  seed: number = Date.now(),
): GameState => {
  const nationStates: Record<string, NationState> = {}
  nations.forEach((nation) => {
    nationStates[nation.id] = buildInitialNationState(nation)
  })

  const territoryStates: Record<string, TerritoryState> = {}
  territories.forEach((territory) => {
    territoryStates[territory.id] = buildInitialTerritoryState(territory)
  })

  const diplomacy = {
    relations: {},
    wars: new Set<string>(),
    alliances: new Set<string>(),
  }
  ensureRelationMatrix(diplomacy, nationStates)

  const archetypeAssignments = getArchetypeMap(playerNationId)
  Object.entries(archetypeAssignments).forEach(([id, archetype]) => {
    if (nationStates[id]) {
      nationStates[id].archetype = archetype
    }
  })

  const state: GameState = {
    turn: 1,
    currentPhase: 'player',
    playerNationId,
    nations: nationStates,
    territories: territoryStates,
    diplomacy,
    log: [],
    notifications: [],
    queuedEvents: [],
    selectedTerritoryId: undefined,
    pendingAction: undefined,
    winner: undefined,
    defeated: undefined,
    actionsTaken: 0,
    economy: undefined as unknown as EconomyState,
  }

  state.economy = createInitialEconomyState(state)
  updateEconomySystems(state)

  pushLog(state, {
    summary: `${nationStates[playerNationId].name} prepares for ascendance`,
    turn: state.turn,
    tone: 'info',
  })

  pushNotification(state, {
    message: 'Press A to open actions, D for diplomacy, M to change map mode, E to end the turn.',
    tone: 'neutral',
  })

  return state
}

const getActionCost = (nation: NationState, action: PlayerAction): number => {
  let cost = ACTION_COSTS[action.type]
  const modifier = UNIQUE_TRAIT_COST_MODIFIERS[nation.id]?.[action.type]
  if (modifier) {
    cost += modifier
  }
  return Math.max(0, cost)
}

const spendCost = (nation: NationState, cost: number): boolean => {
  if (nation.treasury < cost) {
    return false
  }
  nation.treasury -= cost
  return true
}

const grantIncome = (nation: NationState, territoriesOwned: number): void => {
  nation.treasury += territoriesOwned * gameConfig.incomePerTerritoryBase
}

export const resolveCombat = (
  state: GameState,
  attackerId: string,
  defenderId: string,
  territoryId: string,
  attackingStrength: number,
  rng: RandomGenerator,
): CombatResult => {
  const attacker = state.nations[attackerId]
  const defender = state.nations[defenderId]
  const territory = state.territories[territoryId]

  const terrainModifier = TERRAIN_MODIFIERS[territory.terrain]
  const baseAttacker = attackingStrength + attacker.stats.military / 5
  const baseDefender = territory.garrison + defender.stats.military / 5

  const attackerEffective =
    baseAttacker * (1 + attacker.stats.tech / 200) * (1 + attacker.stats.support / 200) *
    terrainModifier * rng.nextInRange(...gameConfig.combatRandomnessRange)

  const defenderEffective =
    baseDefender * (1 + defender.stats.tech / 200) * (1 + defender.stats.support / 200) *
    terrainModifier * rng.nextInRange(...gameConfig.combatRandomnessRange)

  let outcome: CombatResult['outcome'] = 'stalemate'
  if (attackerEffective > defenderEffective * 1.1) {
    outcome = 'attackerVictory'
  } else if (defenderEffective > attackerEffective * 1.1) {
    outcome = 'defenderHolds'
  }

  const casualtyRatio = defenderEffective / (attackerEffective + defenderEffective)
  const attackerLoss = Math.max(1, Math.round(attackingStrength * casualtyRatio))
  const defenderLoss = Math.max(1, Math.round(territory.garrison * (1 - casualtyRatio)))

  adjustTerritoryGarrison(territory, -defenderLoss)

  if (outcome === 'attackerVictory') {
    territory.ownerId = attackerId
    territory.garrison = Math.max(1, attackingStrength - attackerLoss)
    updateStats(defender, 'stability', -gameConfig.warStabilityPenalty)
    updateStats(defender, 'crime', gameConfig.crimeGainTaxes)
    updateStats(attacker, 'stability', -Math.ceil(gameConfig.warStabilityPenalty / 2))
  } else if (outcome === 'defenderHolds') {
    territory.garrison = Math.max(1, territory.garrison)
    updateStats(attacker, 'stability', -gameConfig.warStabilityPenalty)
    updateStats(attacker, 'crime', gameConfig.crimeGainTaxes)
  }

  pushLog(state, {
    summary: `${attacker.name} engages ${defender.name} at ${territory.name}: ${
      outcome === 'attackerVictory'
        ? 'victory'
        : outcome === 'defenderHolds'
        ? 'defender holds'
        : 'stalemate'
    }`,
    details: `Attacker loss ${attackerLoss}, Defender loss ${defenderLoss}`,
    tone: outcome === 'attackerVictory' ? 'success' : outcome === 'defenderHolds' ? 'warning' : 'info',
    turn: state.turn,
  })

  return {
    attackerId,
    defenderId,
    territoryId,
    outcome,
    attackerLoss,
    defenderLoss,
  }
}

const handleInvestInTech = (
  state: GameState,
  nation: NationState,
): string => {
  updateStats(nation, 'tech', gameConfig.techGainPerInvest)
  updateStats(nation, 'science', gameConfig.scienceGainPerInvest)
  pushLog(state, {
    summary: `${nation.name} invests in artisans and scholars`,
    tone: 'success',
    turn: state.turn,
  })
  return '+ tech, + science'
}

const handleRecruitArmy = (
  state: GameState,
  nation: NationState,
  territory: TerritoryState,
): string => {
  adjustTerritoryGarrison(territory, gameConfig.armyRecruitStrength)
  pushLog(state, {
    summary: `${nation.name} raises fresh troops in ${territory.name}`,
    tone: 'info',
    turn: state.turn,
  })
  if (nation.id === 'assyria' && territory.id === 'assyria_heartland') {
    adjustTerritoryGarrison(territory, 2)
  }
  return `+${gameConfig.armyRecruitStrength} strength in ${territory.name}`
}

const handleCollectTaxes = (
  state: GameState,
  nation: NationState,
  controlled: TerritoryState[],
): string => {
  const intake = gameConfig.economyGainTaxes + controlled.length * 2
  nation.treasury += intake
  updateStats(nation, 'economy', 2)
  updateStats(nation, 'crime', gameConfig.crimeGainTaxes)
  if (nation.id === 'harappa') {
    updateStats(nation, 'economy', 2)
  }
  if (nation.id === 'carthage') {
    updateStats(nation, 'influence', 1)
  }
  if (nation.id === 'rome' && nation.stats.support < 65) {
    updateStats(nation, 'crime', 2)
  }
  pushLog(state, {
    summary: `${nation.name} levies tribute across its realm`,
    tone: 'warning',
    turn: state.turn,
  })
  return `+${intake} treasury`
}

const handlePassLaw = (state: GameState, nation: NationState): string => {
  updateStats(nation, 'laws', gameConfig.lawGainPass)
  updateStats(nation, 'stability', gameConfig.stabilityGainPass)
  if (nation.id === 'egypt') {
    updateStats(nation, 'laws', 2)
  }
  if (nation.id === 'rome' && nation.stats.stability >= 70) {
    updateStats(nation, 'support', 1)
  }
  if (nation.id === 'scythia') {
    updateStats(nation, 'support', -3)
  }
  pushLog(state, {
    summary: `${nation.name} codifies new edicts`,
    tone: 'info',
    turn: state.turn,
  })
  return '+laws, +stability'
}

const handleSpy = (
  state: GameState,
  nation: NationState,
  target: NationState,
): string => {
  updateStats(target, 'stability', -gameConfig.spyEffect)
  updateStats(target, 'crime', gameConfig.spyCrimeIncrease)
  pushLog(state, {
    summary: `${nation.name} dispatches spies into ${target.name}`,
    tone: 'warning',
    turn: state.turn,
  })
  return `${target.name} destabilised`
}

const handleDiplomacyOffer = (
  state: GameState,
  nation: NationState,
  target: NationState,
): string => {
  let effect = gameConfig.diplomacyEffect
  if (nation.id === 'rome') {
    effect -= 1
  }
  if (nation.id === 'minoa') {
    const targetTerritories = getControlledTerritories(state, target.id)
    if (targetTerritories.some((tile) => tile.terrain === 'coastal')) {
      updateStats(nation, 'economy', 1)
    }
  }
  modifyRelation(state.diplomacy, nation.id, target.id, effect)
  pushLog(state, {
    summary: `${nation.name} extends envoys to ${target.name}`,
    tone: 'success',
    turn: state.turn,
  })
  return `Relations improved by ${effect}`
}

const handleDeclareWar = (
  state: GameState,
  nation: NationState,
  target: NationState,
): string => {
  toggleWar(state.diplomacy, nation.id, target.id, true)
  updateStats(nation, 'stability', -gameConfig.warStabilityPenalty)
  if (nation.id === 'akkad') {
    updateStats(nation, 'military', 3)
  }
  pushNotification(state, {
    message: `${nation.name} declares war on ${target.name}!`,
    tone: 'negative',
  })
  return `War with ${target.name}`
}

const handleFormAlliance = (
  state: GameState,
  nation: NationState,
  target: NationState,
): string => {
  toggleAlliance(state.diplomacy, nation.id, target.id, true)
  modifyRelation(state.diplomacy, nation.id, target.id, 8)
  if (nation.id === 'hittites') {
    updateStats(nation, 'stability', -1)
  }
  pushNotification(state, {
    message: `${nation.name} forges an alliance with ${target.name}.`,
    tone: 'positive',
  })
  return `Alliance with ${target.name}`
}

const handleBribe = (
  state: GameState,
  nation: NationState,
  target: NationState,
): string => {
  modifyRelation(state.diplomacy, nation.id, target.id, 4)
  updateStats(target, 'crime', 3)
  pushLog(state, {
    summary: `${nation.name} slips tribute to ${target.name}'s nobles`,
    tone: 'warning',
    turn: state.turn,
  })
  return `Relations eased; ${target.name} crime rises`
}

const handleSuppressCrime = (
  state: GameState,
  nation: NationState,
): string => {
  const base = gameConfig.crimeDecay + 2
  const reduction = nation.id === 'assyria' ? base + 2 : base
  updateStats(nation, 'crime', -reduction)
  updateStats(nation, 'support', -1)
  if (nation.id === 'harappa') {
    updateStats(nation, 'influence', 2)
  }
  if (nation.id === 'egypt') {
    updateStats(nation, 'support', -1)
  }
  pushLog(state, {
    summary: `${nation.name} cracks down on unrest`,
    tone: 'warning',
    turn: state.turn,
  })
  return `Crime reduced by ${reduction}`
}

const applyAction = (
  state: GameState,
  nationId: string,
  action: PlayerAction,
  rng: RandomGenerator,
): string | undefined => {
  const nation = state.nations[nationId]
  const cost = getActionCost(nation, action)
  if (cost > 0 && !spendCost(nation, cost)) {
    if (nationId === state.playerNationId) {
      pushNotification(state, {
        message: `Insufficient treasury for ${action.type}.`,
        tone: 'negative',
      })
    }
    return undefined
  }

  switch (action.type) {
    case 'InvestInTech':
      return handleInvestInTech(state, nation)
    case 'RecruitArmy': {
      const territory = action.sourceTerritoryId
        ? state.territories[action.sourceTerritoryId]
        : undefined
      if (!territory || territory.ownerId !== nationId) {
        return undefined
      }
      return handleRecruitArmy(state, nation, territory)
    }
    case 'CollectTaxes':
      return handleCollectTaxes(state, nation, getControlledTerritories(state, nationId))
    case 'PassLaw':
      if (nation.id === 'carthage' && nation.stats.stability < 60) {
        pushNotification(state, {
          message: 'Carthaginian councils reject reforms below 60 stability.',
          tone: 'negative',
        })
        nation.treasury += cost
        return undefined
      }
      return handlePassLaw(state, nation)
    case 'Spy': {
      if (!action.targetNationId) return undefined
      return handleSpy(state, nation, state.nations[action.targetNationId])
    }
    case 'DiplomacyOffer': {
      if (!action.targetNationId) return undefined
      return handleDiplomacyOffer(state, nation, state.nations[action.targetNationId])
    }
    case 'DeclareWar': {
      if (!action.targetNationId) return undefined
      return handleDeclareWar(state, nation, state.nations[action.targetNationId])
    }
    case 'FormAlliance': {
      if (!action.targetNationId) return undefined
      return handleFormAlliance(state, nation, state.nations[action.targetNationId])
    }
    case 'Bribe': {
      if (!action.targetNationId) return undefined
      return handleBribe(state, nation, state.nations[action.targetNationId])
    }
    case 'SuppressCrime':
      return handleSuppressCrime(state, nation)
    case 'MoveArmy': {
      if (!action.sourceTerritoryId || !action.targetTerritoryId) {
        return undefined
      }
      const source = state.territories[action.sourceTerritoryId]
      const target = state.territories[action.targetTerritoryId]
      if (!source || !target) return undefined
      if (source.ownerId !== nationId) return undefined
      if (!source.neighbors.includes(target.id)) return undefined
      const moveable = source.garrison - gameConfig.armyMoveCost
      if (moveable <= 0) return undefined
      const sent = Math.max(1, Math.min(moveable, gameConfig.armyRecruitStrength))
      adjustTerritoryGarrison(source, -sent)
      if (target.ownerId === nationId) {
        adjustTerritoryGarrison(target, sent)
        pushLog(state, {
          summary: `${nation.name} repositions forces into ${target.name}`,
          tone: 'info',
          turn: state.turn,
        })
        return `Moved ${sent} strength to ${target.name}`
      }
      const result = resolveCombat(state, nationId, target.ownerId, target.id, sent, rng)
      if (result.outcome !== 'attackerVictory') {
        adjustTerritoryGarrison(source, -1)
      }
      return `Battle result: ${result.outcome}`
    }
    default:
      return undefined
  }
}

const upkeepPhase = (state: GameState): void => {
  Object.values(state.nations).forEach((nation) => {
    const tiles = getControlledTerritories(state, nation.id)
    grantIncome(nation, tiles.length)
    const upkeepCost = tiles.length * gameConfig.armyUpkeep
    nation.treasury = Math.max(0, nation.treasury - upkeepCost)
    updateStats(nation, 'support', -gameConfig.baseSupportDecay)
    updateStats(nation, 'science', gameConfig.baseScienceDrift)
    updateStats(nation, 'crime', gameConfig.baseCrimeGrowth - gameConfig.crimeDecay)

    const wars = [...state.diplomacy.wars].filter((key) => key.includes(nation.id))
    updateStats(nation, 'stability', -wars.length * gameConfig.stabilityDecayPerWar)

    if (nation.id === 'harappa' && nation.stats.stability < 55) {
      updateStats(nation, 'military', -10)
    }
    if (nation.id === 'medes' && nation.stats.economy < 50) {
      updateStats(nation, 'stability', -5)
    }
    if (nation.id === 'carthage' && nation.stats.military < 55) {
      updateStats(nation, 'stability', -3)
    }
  })

  updateEconomySystems(state)
}

const revoltChecks = (state: GameState, rng: RandomGenerator): void => {
  Object.values(state.territories).forEach((territory) => {
    const nation = state.nations[territory.ownerId]
    const unrestScore = nation.stats.crime + territory.unrest - nation.stats.stability
    if (unrestScore > 60 && rng.next() > 0.6) {
      adjustTerritoryGarrison(territory, -Math.min(territory.garrison - 1, 2))
      updateStats(nation, 'stability', -3)
      pushLog(state, {
        summary: `Unrest sparks in ${territory.name}`,
        tone: 'danger',
        turn: state.turn,
      })
    }
  })
}

const checkVictoryConditions = (state: GameState): void => {
  const player = state.nations[state.playerNationId]
  const territoriesOwned = getControlledTerritories(state, player.id).length
  if (territoriesOwned >= 8 || (player.stats.influence >= 90 && player.stats.stability >= 75)) {
    state.winner = player.id
    state.currentPhase = 'gameover'
    pushNotification(state, {
      message: `${player.name} unifies the ancient world!`,
      tone: 'positive',
    })
    return
  }
  if (player.stats.stability <= 20 || territoriesOwned === 0) {
    state.defeated = true
    state.currentPhase = 'gameover'
    pushNotification(state, {
      message: `${player.name} collapses into turmoil.`,
      tone: 'negative',
    })
  }
}

export const advanceTurn = (state: GameState, rng: RandomGenerator): void => {
  state.currentPhase = 'ai'
  const aiOrder = Object.values(state.nations)
    .filter((nation) => nation.id !== state.playerNationId)
    .sort((a, b) => a.name.localeCompare(b.name))

  aiOrder.forEach((nation) => {
    const actions = decideActions(state, nation, rng)
    actions.forEach((aiAction) => {
      applyAction(state, nation.id, aiAction, rng)
    })
  })

  state.currentPhase = 'events'
  upkeepPhase(state)
  applyTurnEvents(state, rng)
  revoltChecks(state, rng)
  checkVictoryConditions(state)
  state.turn += 1
  state.actionsTaken = 0
  if (!state.winner && !state.defeated) {
    state.currentPhase = 'player'
  }
}

export const executePlayerAction = (
  state: GameState,
  action: PlayerAction,
  rng: RandomGenerator,
): boolean => {
  if (state.actionsTaken >= gameConfig.maxActionsPerTurn) {
    pushNotification(state, {
      message: 'Action limit reached this turn.',
      tone: 'negative',
    })
    return false
  }
  const result = applyAction(state, state.playerNationId, action, rng)
  if (result) {
    state.actionsTaken += 1
    pushNotification(state, {
      message: result,
      tone: 'positive',
    })
    return true
  }
  return false
}

export const quickSaveState = (state: GameState): string => {
  const serialisable = {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      wars: Array.from(state.diplomacy.wars),
      alliances: Array.from(state.diplomacy.alliances),
    },
  }
  return JSON.stringify(serialisable)
}

export const loadStateFromString = (payload: string): GameState => {
  const parsed = JSON.parse(payload)
  const state: GameState = {
    ...parsed,
    diplomacy: {
      relations: parsed.diplomacy.relations,
      wars: new Set(parsed.diplomacy.wars),
      alliances: new Set(parsed.diplomacy.alliances),
    },
  }
  if (!state.economy) {
    state.economy = createInitialEconomyState(state)
  } else {
    const priceHistory = { ...state.economy.priceHistory }
    RESOURCE_TYPES.forEach((resource) => {
      priceHistory[resource] = [...(priceHistory[resource] ?? [])]
    })
    state.economy = {
      ...state.economy,
      priceHistory,
    }
  }
  updateEconomySystems(state)
  return state
}
