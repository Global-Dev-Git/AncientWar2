import { nations, territories, gameConfig, buildInitialNationState, buildInitialTerritoryState } from './data'
import { RandomGenerator } from './random'
import { TERRAIN_MODIFIERS, TERRAIN_MOVEMENT_COST, ZOC_SUPPLY_PENALTY, SUPPLY_STATE_THRESHOLDS } from './constants'
import type {
  ActionType,
  CombatResult,
  GameState,
  NationState,
  SupplyState,
  PlayerAction,
  TerritoryState,
  VisibilityState,
} from './types'
import {
  adjustTerritoryGarrison,
  ensureRelationMatrix,
  getControlledTerritories,
  isAtWar,
  modifyRelation,
  pushLog,
  pushNotification,
  toggleAlliance,
  toggleWar,
  updateStats,
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const deriveSupplyState = (value: number): SupplyState => {
  if (value >= SUPPLY_STATE_THRESHOLDS.supplied) return 'supplied'
  if (value >= SUPPLY_STATE_THRESHOLDS.strained) return 'strained'
  return 'exhausted'
}

const adjustTerritorySupply = (territory: TerritoryState, delta: number): number => {
  const before = territory.supply
  territory.supply = clamp(territory.supply + delta, 0, 100)
  territory.supplyState = deriveSupplyState(territory.supply)
  return before - territory.supply
}

const adjustTerritoryMorale = (territory: TerritoryState, delta: number): void => {
  territory.morale = clamp(territory.morale + delta, 0, 100)
}

const syncNationArmy = (state: GameState, territory: TerritoryState): void => {
  const nation = state.nations[territory.ownerId]
  if (!nation) return
  let army = nation.armies.find((unit) => unit.territoryId === territory.id)
  if (!army) {
    army = {
      id: `${nation.id}-army-${nation.armies.length + 1}`,
      territoryId: territory.id,
      strength: territory.garrison,
      unitCount: territory.unitCount,
      morale: territory.morale,
      supply: territory.supply,
      supplyState: territory.supplyState,
      visibility: territory.visibility[nation.id] ?? 'hidden',
    }
    nation.armies.push(army)
    return
  }
  army.strength = territory.garrison
  army.unitCount = territory.unitCount
  army.morale = territory.morale
  army.supply = territory.supply
  army.supplyState = territory.supplyState
  army.visibility = territory.visibility[nation.id] ?? army.visibility
}

const removeArmyRecord = (state: GameState, nationId: string, territoryId: string): void => {
  const nation = state.nations[nationId]
  if (!nation) return
  nation.armies = nation.armies.filter((army) => army.territoryId !== territoryId)
}

const markTerritoryVisible = (state: GameState, territoryId: string): void => {
  const territory = state.territories[territoryId]
  if (!territory) return
  const playerId = state.playerNationId
  territory.visibility[playerId] = 'visible'
  state.visibility[territoryId] = 'visible'
}

const recalculateVisibility = (state: GameState): void => {
  const playerId = state.playerNationId
  const next: Record<string, VisibilityState> = {}

  Object.values(state.territories).forEach((territory) => {
    if (territory.ownerId === playerId) {
      next[territory.id] = 'visible'
      territory.visibility[playerId] = 'visible'
    }
  })

  Object.values(state.territories).forEach((territory) => {
    if (next[territory.id] === 'visible') {
      territory.neighbors.forEach((neighborId) => {
        if (!next[neighborId]) {
          next[neighborId] = 'fogged'
        }
      })
    }
  })

  Object.entries(state.territories).forEach(([territoryId, territory]) => {
    if (!next[territoryId]) {
      const previous = territory.visibility[playerId] ?? 'hidden'
      next[territoryId] = previous === 'visible' ? 'fogged' : previous
      territory.visibility[playerId] = next[territoryId]
    } else {
      territory.visibility[playerId] = next[territoryId]
    }
  })

  state.visibility = next
}

const isInEnemyZoneOfControl = (
  state: GameState,
  nationId: string,
  territory: TerritoryState,
): boolean => {
  if (territory.ownerId !== nationId && isAtWar(state.diplomacy, nationId, territory.ownerId)) {
    return true
  }
  return territory.neighbors.some((neighborId) => {
    const neighbor = state.territories[neighborId]
    if (!neighbor) return false
    if (neighbor.ownerId === nationId) return false
    return isAtWar(state.diplomacy, nationId, neighbor.ownerId)
  })
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
    visibility: {},
    battleReports: [],
    log: [],
    notifications: [],
    queuedEvents: [],
    selectedTerritoryId: undefined,
    pendingAction: undefined,
    winner: undefined,
    defeated: undefined,
    actionsTaken: 0,
  }

  pushLog(state, {
    summary: `${nationStates[playerNationId].name} prepares for ascendance`,
    turn: state.turn,
    tone: 'info',
  })

  pushNotification(state, {
    message: 'Press A to open actions, D for diplomacy, M to change map mode, E to end the turn.',
    tone: 'neutral',
  })

  Object.values(state.territories).forEach((territory) => {
    syncNationArmy(state, territory)
  })
  recalculateVisibility(state)

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
  sourceTerritoryId?: string,
): CombatResult => {
  const attacker = state.nations[attackerId]
  const defender = state.nations[defenderId]
  const territory = state.territories[territoryId]
  const source = sourceTerritoryId ? state.territories[sourceTerritoryId] : undefined

  const terrainModifier = TERRAIN_MODIFIERS[territory.terrain]
  const attackerRoll = rng.nextInRange(...gameConfig.combatRandomnessRange)
  const defenderRoll = rng.nextInRange(...gameConfig.combatRandomnessRange)

  const attackerMoraleFactor = source ? 0.6 + source.morale / 200 : 0.75
  const defenderMoraleFactor = 0.6 + territory.morale / 200

  const attackerSupplyFactor = source ? 0.6 + source.supply / 200 : 0.8
  const defenderSupplyFactor = 0.6 + territory.supply / 200

  const attackerPower =
    (attackingStrength + attacker.stats.military / 4) *
    (1 + attacker.stats.tech / 150) *
    (1 + attacker.stats.support / 180) *
    attackerMoraleFactor *
    attackerSupplyFactor *
    terrainModifier *
    attackerRoll

  const defenderPower =
    (territory.garrison + defender.stats.military / 4) *
    (1 + defender.stats.tech / 160) *
    (1 + defender.stats.support / 200) *
    defenderMoraleFactor *
    Math.max(0.4, defenderSupplyFactor) *
    terrainModifier *
    (1 + territory.siegeProgress / 150) *
    defenderRoll

  const decisiveThreshold = 0.18
  let outcome: CombatResult['outcome'] = 'stalemate'
  if (attackerPower > defenderPower * (1 + decisiveThreshold)) {
    outcome = 'attackerVictory'
  } else if (defenderPower > attackerPower * (1 + decisiveThreshold)) {
    outcome = 'defenderHolds'
  }

  let siegeProgress = territory.siegeProgress
  if (outcome === 'attackerVictory') {
    siegeProgress = 0
  } else if (outcome === 'defenderHolds') {
    siegeProgress = Math.max(0, siegeProgress - 12)
  } else {
    const siegeGain = Math.max(4, Math.round((attackerPower / Math.max(1, defenderPower)) * 10))
    siegeProgress = clamp(siegeProgress + siegeGain, 0, 100)
    if (siegeProgress >= 100) {
      outcome = 'attackerVictory'
      siegeProgress = 0
    }
  }
  territory.siegeProgress = siegeProgress

  const totalPower = Math.max(1, attackerPower + defenderPower)
  const attackerLoss = Math.max(
    1,
    Math.min(attackingStrength, Math.round((defenderPower / totalPower) * attackingStrength)),
  )
  const defenderLoss = Math.max(
    1,
    Math.min(territory.garrison, Math.round((attackerPower / totalPower) * territory.garrison)),
  )

  let attackerSupplyPenalty = 0
  if (source) {
    const supplyDrain = outcome === 'attackerVictory' ? -14 : outcome === 'stalemate' ? -10 : -8
    attackerSupplyPenalty = adjustTerritorySupply(source, supplyDrain)
    const moraleShift = outcome === 'attackerVictory' ? 4 : outcome === 'stalemate' ? -1 : -3
    adjustTerritoryMorale(source, moraleShift)
  }

  const defenderSupplyDrain = outcome === 'attackerVictory' ? -24 : outcome === 'stalemate' ? -12 : -8
  const defenderSupplyPenalty = adjustTerritorySupply(territory, defenderSupplyDrain)
  adjustTerritoryMorale(territory, outcome === 'defenderHolds' ? 3 : -2)

  if (outcome === 'attackerVictory') {
    const survivors = Math.max(1, attackingStrength - attackerLoss)
    removeArmyRecord(state, defenderId, territory.id)
    territory.ownerId = attackerId
    territory.garrison = survivors
    territory.unitCount = survivors
    territory.morale = clamp(60 + attacker.stats.support / 5, 0, 100)
    territory.supply = clamp(55 - Math.round(attackerSupplyPenalty / 2), 20, 100)
    territory.supplyState = deriveSupplyState(territory.supply)
    territory.visibility[attackerId] = 'visible'
    territory.visibility[defenderId] = territory.visibility[defenderId] ?? 'fogged'
    syncNationArmy(state, territory)
    if (source) {
      syncNationArmy(state, source)
    }
    updateStats(defender, 'stability', -gameConfig.warStabilityPenalty)
    updateStats(defender, 'crime', gameConfig.crimeGainTaxes)
    updateStats(attacker, 'stability', -Math.ceil(gameConfig.warStabilityPenalty / 2))
  } else {
    adjustTerritoryGarrison(territory, -defenderLoss)
    syncNationArmy(state, territory)
    if (source) {
      const survivors = Math.max(0, attackingStrength - attackerLoss)
      if (survivors > 0) {
        adjustTerritoryGarrison(source, survivors)
      }
      syncNationArmy(state, source)
    }
    if (outcome === 'defenderHolds') {
      updateStats(attacker, 'stability', -gameConfig.warStabilityPenalty)
      updateStats(attacker, 'crime', gameConfig.crimeGainTaxes)
    }
  }

  if (attackerId === state.playerNationId || defenderId === state.playerNationId) {
    markTerritoryVisible(state, territory.id)
  }
  recalculateVisibility(state)

  const result: CombatResult = {
    attackerId,
    defenderId,
    territoryId,
    outcome,
    attackerLoss,
    defenderLoss,
    siegeProgress: territory.siegeProgress,
    attackerSupplyPenalty,
    defenderSupplyPenalty,
  }

  state.battleReports = [result, ...state.battleReports].slice(0, 6)

  pushLog(state, {
    summary: `${attacker.name} engages ${defender.name} at ${territory.name}: ${
      outcome === 'attackerVictory'
        ? 'victory'
        : outcome === 'defenderHolds'
        ? 'defender holds'
        : 'siege tightens'
    }`,
    details: `Losses A:${attackerLoss} D:${defenderLoss} • Siege ${territory.siegeProgress}% • Supply Δ A:${-attackerSupplyPenalty} D:${-defenderSupplyPenalty}`,
    tone: outcome === 'attackerVictory' ? 'success' : outcome === 'defenderHolds' ? 'warning' : 'info',
    turn: state.turn,
  })

  return result
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
      const movementCost = TERRAIN_MOVEMENT_COST[target.terrain] ?? 1
      const moveable = source.garrison - movementCost
      if (moveable <= 0) return undefined
      const sent = Math.max(1, Math.min(moveable, gameConfig.armyRecruitStrength))
      adjustTerritoryGarrison(source, -sent)
      adjustTerritoryMorale(source, -1)
      adjustTerritorySupply(source, -movementCost * 2)
      if (isInEnemyZoneOfControl(state, nationId, source) || isInEnemyZoneOfControl(state, nationId, target)) {
        adjustTerritorySupply(source, -ZOC_SUPPLY_PENALTY)
        adjustTerritoryMorale(source, -2)
      }
      syncNationArmy(state, source)
      if (target.ownerId === nationId) {
        adjustTerritoryGarrison(target, sent)
        adjustTerritoryMorale(target, 1)
        adjustTerritorySupply(target, -Math.max(1, movementCost - 1))
        syncNationArmy(state, target)
        if (nationId === state.playerNationId) {
          markTerritoryVisible(state, target.id)
          recalculateVisibility(state)
        }
        pushLog(state, {
          summary: `${nation.name} repositions forces into ${target.name}`,
          tone: 'info',
          turn: state.turn,
        })
        return `Moved ${sent} strength to ${target.name}`
      }
      const result = resolveCombat(state, nationId, target.ownerId, target.id, sent, rng, source.id)
      return `Battle result: ${result.outcome} (siege ${result.siegeProgress}%)`
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

    tiles.forEach((tile) => {
      if (tile.siegeProgress > 0) {
        adjustTerritorySupply(tile, -6)
        adjustTerritoryMorale(tile, -3)
      } else {
        adjustTerritorySupply(tile, 4)
        adjustTerritoryMorale(tile, 1)
      }
      syncNationArmy(state, tile)
    })

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
  recalculateVisibility(state)
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
  return {
    ...parsed,
    visibility: parsed.visibility ?? {},
    battleReports: parsed.battleReports ?? [],
    diplomacy: {
      relations: parsed.diplomacy.relations,
      wars: new Set(parsed.diplomacy.wars),
      alliances: new Set(parsed.diplomacy.alliances),
    },
  }
}
