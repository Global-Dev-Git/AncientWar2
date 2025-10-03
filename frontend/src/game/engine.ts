import {
  nations,
  territories,
  gameConfig,
  buildInitialNationState,
  buildInitialTerritoryState,
  buildInitialTradeState,
  generateFallbackCharacters,
} from './data'
import { RandomGenerator } from './random'
import { TERRAIN_MODIFIERS } from './constants'
import { applyTradeEconomy, RESOURCE_TYPES } from './trade'
import type {
  ActionType,
  CombatResult,
  GameState,
  NationState,
  PlayerAction,
  TerritoryState,
} from './types'
import {
  adjustFactionSupport,
  adjustTerritoryGarrison,
  averageFactionSupport,
  ensureRelationMatrix,
  getControlledTerritories,
  getFactionStanding,
  modifyRelation,
  pushLog,
  pushNotification,
  toggleAlliance,
  toggleWar,
  updateStats,
} from './utils'
import { calculateIntrigueChance, getIntrigueSpecialistName } from './intrigue'
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
  BribeAdvisor: 4,
  Purge: 3,
  Assassinate: 6,
  StealTech: 5,
  FomentRevolt: 5,
}

const UNIQUE_TRAIT_COST_MODIFIERS: Partial<Record<string, Partial<Record<ActionType, number>>>> = {
  carthage: { RecruitArmy: -1 },
  medes: { RecruitArmy: 1 },
  minoa: { RecruitArmy: 1 },
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
    trade: buildInitialTradeState(),
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

  applyTradeEconomy(state, gameConfig)

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

const adjustLoyalty = (loyalty: number, delta: number): number =>
  Math.max(0, Math.min(100, loyalty + delta))

const findLowestLoyalAdvisor = (nation: NationState) =>
  nation.characters
    .filter((character) => character.role === 'Advisor')
    .sort((a, b) => a.loyalty - b.loyalty)[0]

const handleBribeAdvisor = (
  state: GameState,
  nation: NationState,
  rng: RandomGenerator,
): string | undefined => {
  const advisor = findLowestLoyalAdvisor(nation)
  if (!advisor) return undefined
  const chance = calculateIntrigueChance('BribeAdvisor', nation)
  const success = rng.next() <= chance
  if (success) {
    advisor.loyalty = adjustLoyalty(advisor.loyalty, 18)
    adjustFactionSupport(nation, 'Merchants', 4)
    pushLog(state, {
      summary: `${nation.name} quietly secures ${advisor.name}'s loyalty`,
      tone: 'success',
      turn: state.turn,
      details: `Success chance ${Math.round(chance * 100)}%`,
    })
    return `${advisor.name} loyalty now ${advisor.loyalty}`
  }
  advisor.loyalty = adjustLoyalty(advisor.loyalty, -6)
  updateStats(nation, 'stability', -gameConfig.intrigueFailurePenalty)
  adjustFactionSupport(nation, 'Merchants', -3)
  pushLog(state, {
    summary: `${nation.name} bribe plot exposed`,
    tone: 'danger',
    turn: state.turn,
    details: `Chance ${Math.round(chance * 100)}%`,
  })
  pushNotification(state, {
    message: 'Bribe failed and shook domestic confidence.',
    tone: 'negative',
  })
  return 'Bribe attempt failed'
}

const handlePurge = (
  state: GameState,
  nation: NationState,
  rng: RandomGenerator,
): string | undefined => {
  const advisor = findLowestLoyalAdvisor(nation)
  if (!advisor) return undefined
  const chance = calculateIntrigueChance('Purge', nation)
  const success = rng.next() <= chance
  if (success) {
    nation.characters = nation.characters.filter((character) => character.id !== advisor.id)
    adjustFactionSupport(nation, 'Military', 3)
    adjustFactionSupport(nation, 'Priesthood', 2)
    updateStats(nation, 'stability', 1)
    pushLog(state, {
      summary: `${nation.name} purges ${advisor.name} from court`,
      tone: 'warning',
      turn: state.turn,
    })
    return `${advisor.name} removed; factions steady`
  }
  updateStats(nation, 'stability', -gameConfig.intrigueFailurePenalty)
  adjustFactionSupport(nation, 'Nobility', -4)
  pushLog(state, {
    summary: `${nation.name} purge misfires and sparks scandal`,
    tone: 'danger',
    turn: state.turn,
  })
  pushNotification(state, {
    message: 'Purge failed; Nobility are offended.',
    tone: 'negative',
  })
  return 'Purge attempt failed'
}

const handleAssassinate = (
  state: GameState,
  nation: NationState,
  target: NationState,
  rng: RandomGenerator,
): string => {
  const chance = calculateIntrigueChance('Assassinate', nation, target)
  const success = rng.next() <= chance
  if (success) {
    const leader = target.characters.find((character) => character.role === 'Leader')
    if (leader) {
      leader.loyalty = adjustLoyalty(leader.loyalty, -20)
    }
    updateStats(target, 'stability', -6)
    updateStats(target, 'crime', 4)
    adjustFactionSupport(nation, 'Military', 4)
    pushLog(state, {
      summary: `${nation.name} assassinates a ${target.name} notable`,
      tone: 'warning',
      turn: state.turn,
      details: `Success chance ${Math.round(chance * 100)}%`,
    })
    return `Assassination success; ${target.name} reels`
  }
  updateStats(nation, 'stability', -gameConfig.intrigueFailurePenalty)
  adjustFactionSupport(nation, 'Priesthood', -3)
  pushLog(state, {
    summary: `${nation.name} assassin plot foiled by ${target.name}`,
    tone: 'danger',
    turn: state.turn,
  })
  pushNotification(state, {
    message: 'Assassins captured; reputation suffers.',
    tone: 'negative',
  })
  return 'Assassination attempt failed'
}

const handleStealTech = (
  state: GameState,
  nation: NationState,
  target: NationState,
  rng: RandomGenerator,
): string => {
  const chance = calculateIntrigueChance('StealTech', nation, target)
  const success = rng.next() <= chance
  if (success) {
    updateStats(nation, 'tech', Math.ceil(gameConfig.techGainPerInvest / 2))
    updateStats(nation, 'science', 2)
    updateStats(target, 'science', -1)
    adjustFactionSupport(nation, 'Merchants', 2)
    pushLog(state, {
      summary: `${nation.name} spies pilfer designs from ${target.name}`,
      tone: 'success',
      turn: state.turn,
    })
    return `Stolen insights advance science`
  }
  updateStats(nation, 'stability', -gameConfig.intrigueFailurePenalty)
  adjustFactionSupport(nation, 'Merchants', -2)
  pushLog(state, {
    summary: `${nation.name} agents caught stealing scrolls`,
    tone: 'danger',
    turn: state.turn,
  })
  pushNotification(state, {
    message: 'Steal Tech failed; merchants embarrassed.',
    tone: 'negative',
  })
  return 'Steal Tech attempt failed'
}

const handleFomentRevolt = (
  state: GameState,
  nation: NationState,
  target: NationState,
  rng: RandomGenerator,
): string => {
  const chance = calculateIntrigueChance('FomentRevolt', nation, target)
  const success = rng.next() <= chance
  if (success) {
    updateStats(target, 'stability', -5)
    updateStats(target, 'crime', 5)
    const merchants = getFactionStanding(target, 'Merchants')
    merchants.support = adjustLoyalty(merchants.support, -5)
    pushLog(state, {
      summary: `${nation.name} foments unrest within ${target.name}`,
      tone: 'warning',
      turn: state.turn,
    })
    return `${target.name} faces uprisings`
  }
  updateStats(nation, 'stability', -gameConfig.intrigueFailurePenalty)
  adjustFactionSupport(nation, 'Nobility', -2)
  pushLog(state, {
    summary: `${nation.name} agitators uncovered in ${target.name}`,
    tone: 'danger',
    turn: state.turn,
  })
  pushNotification(state, {
    message: 'Revolt plots exposed.',
    tone: 'negative',
  })
  return 'Foment revolt failed'
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
    case 'BribeAdvisor':
      return handleBribeAdvisor(state, nation, rng)
    case 'Purge':
      return handlePurge(state, nation, rng)
    case 'Assassinate': {
      if (!action.targetNationId) return undefined
      return handleAssassinate(state, nation, state.nations[action.targetNationId], rng)
    }
    case 'StealTech': {
      if (!action.targetNationId) return undefined
      return handleStealTech(state, nation, state.nations[action.targetNationId], rng)
    }
    case 'FomentRevolt': {
      if (!action.targetNationId) return undefined
      return handleFomentRevolt(state, nation, state.nations[action.targetNationId], rng)
    }
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
  applyTradeEconomy(state, gameConfig)
  Object.values(state.nations).forEach((nation) => {
    const tiles = getControlledTerritories(state, nation.id)
    grantIncome(nation, tiles.length)
    const upkeepCost = tiles.length * gameConfig.armyUpkeep
    nation.treasury = Math.max(0, nation.treasury - upkeepCost)
    updateStats(nation, 'support', -gameConfig.baseSupportDecay)
    updateStats(nation, 'science', gameConfig.baseScienceDrift)
    updateStats(nation, 'crime', gameConfig.baseCrimeGrowth - gameConfig.crimeDecay)

    const stabilityShift = Math.round((averageFactionSupport(nation) - 55) * gameConfig.factionStabilityImpact)
    if (stabilityShift !== 0) {
      updateStats(nation, 'stability', stabilityShift)
    }
    const merchantSupport = getFactionStanding(nation, 'Merchants').support
    const economyShift = Math.round((merchantSupport - 50) * gameConfig.factionEconomyImpact)
    if (economyShift !== 0) {
      updateStats(nation, 'economy', economyShift)
    }

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
    const tone = result.toLowerCase().includes('fail') ? 'negative' : 'positive'
    pushNotification(state, {
      message: result,
      tone,
    })
    return true
  }
  return false
}

const SAVE_VERSION = 2

const reviveTradeState = (snapshot: Partial<GameState['trade']> | undefined): GameState['trade'] => {
  const fallback = buildInitialTradeState()
  if (!snapshot) {
    return fallback
  }

  const prices = { ...fallback.prices }
  const history = { ...fallback.history }

  RESOURCE_TYPES.forEach((resource) => {
    if (snapshot.prices && typeof snapshot.prices[resource] === 'number') {
      prices[resource] = snapshot.prices[resource]
    }
    if (snapshot.history && Array.isArray(snapshot.history[resource])) {
      const trimmed = snapshot.history[resource].slice(-12).map((value) => Number(value))
      history[resource] = trimmed.length > 0 ? trimmed : history[resource]
    }
  })

  return {
    prices,
    history,
    routes: Array.isArray(snapshot.routes) ? snapshot.routes : [],
  }
}

const reviveTerritories = (
  territorySnapshot: Record<string, TerritoryState> | undefined,
): Record<string, TerritoryState> => {
  const result: Record<string, TerritoryState> = {}
  if (!territorySnapshot) {
    return result
  }
  Object.entries(territorySnapshot).forEach(([id, territory]) => {
    result[id] = {
      ...territory,
      resources: Array.isArray(territory.resources) ? territory.resources : [],
    }
  })
  return result
}

const reviveNations = (nationSnapshot: Record<string, NationState> | undefined): Record<string, NationState> => {
  const result: Record<string, NationState> = {}
  if (!nationSnapshot) {
    return result
  }
  Object.entries(nationSnapshot).forEach(([id, nation]) => {
    const baseDefinition = nations.find((candidate) => candidate.id === id)
    const fallbackCharacters = baseDefinition
      ? (baseDefinition.startingCharacters ?? generateFallbackCharacters(baseDefinition))
      : []
    const characters = Array.isArray(nation.characters) && nation.characters.length
      ? nation.characters.map((character) => ({
          ...character,
          traits: Array.isArray(character.traits) ? [...character.traits] : [],
        }))
      : fallbackCharacters.map((character) => ({ ...character, traits: [...character.traits] }))
    const factions = Array.isArray(nation.factions) && nation.factions.length
      ? nation.factions.map((faction) => ({ ...faction }))
      : [
          { id: 'Military', support: 62 },
          { id: 'Priesthood', support: 58 },
          { id: 'Merchants', support: 60 },
          { id: 'Nobility', support: 55 },
        ]
    result[id] = {
      ...nation,
      economySummary: nation.economySummary ?? {
        tradeIncome: 0,
        maintenance: 0,
        blockedRoutes: 0,
        smugglingFactor: 0,
      },
      characters,
      factions,
    }
  })
  return result
}

const hydrateState = (snapshot: any): GameState => ({
  ...snapshot,
  diplomacy: {
    relations: snapshot.diplomacy.relations,
    wars: new Set(snapshot.diplomacy.wars as unknown as string[]),
    alliances: new Set(snapshot.diplomacy.alliances as unknown as string[]),
  },
  territories: reviveTerritories(snapshot.territories),
  nations: reviveNations(snapshot.nations),
  trade: reviveTradeState(snapshot.trade),
})

const migrateLegacySave = (legacy: any): GameState => {
  const withTrade = {
    ...legacy,
    trade: legacy.trade ?? buildInitialTradeState(),
  }
  return hydrateState(withTrade)
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
  return JSON.stringify({ version: SAVE_VERSION, state: serialisable })
}

export const loadStateFromString = (payload: string): GameState => {
  const parsed = JSON.parse(payload)
  if (typeof parsed.version !== 'number' || !parsed.state) {
    return migrateLegacySave(parsed as GameState)
  }
  if (parsed.version === SAVE_VERSION) {
    return hydrateState(parsed.state as GameState)
  }
  throw new Error(`Unsupported save version: ${parsed.version}`)
}
