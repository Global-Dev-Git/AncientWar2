import {
  nations,
  territories,
  gameConfig,
  buildInitialNationState,
  buildInitialTerritoryState,
} from './data'
import { RandomGenerator } from './random'
import { TERRAIN_MODIFIERS, DEFAULT_HOTKEYS } from './constants'
import type {
  ActionType,
  CombatResult,
  DiplomacyMatrix,
  GameOptions,
  GameState,
  NationState,
  PlayerAction,
  TerritoryState,
} from './types'
import {
  addTreaty,
  adjustTerritoryGarrison,
  applyTreatyPenalty,
  ensureRelationMatrix,
  getControlledTerritories,
  modifyRelation,
  pushLog,
  pushNotification,
  removeTreaty,
  setCasusBelli,
  toggleAlliance,
  toggleWar,
  updateStats,
} from './utils'
import { decideActions, getArchetypeMap } from './ai'
import { applyTurnEvents } from './events'
import {
  advanceTechResearch,
  buildInitialTechState,
  buildInitialTraditionState,
  hydrateAchievements,
  hydrateMissionProgress,
  hydrateReplay,
  hydrateTechState,
  hydrateTraditionState,
  serialiseAchievements,
  serialiseMissionProgress,
  serialiseReplay,
  serialiseTechState,
  serialiseTraditionState,
} from './tech'
import {
  evaluateAchievementTriggers,
  evaluateMissions,
  initialiseScenarioProgression,
  triggerFirstWarAchievement,
} from './progression'

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

export const createInitialGameState = (
  playerNationId: string,
  seed: number = Date.now(),
  options: Partial<GameOptions> = {},
): GameState => {
  const nationStates: Record<string, NationState> = {}
  nations.forEach((nation) => {
    nationStates[nation.id] = buildInitialNationState(nation)
  })

  const territoryStates: Record<string, TerritoryState> = {}
  territories.forEach((territory) => {
    territoryStates[territory.id] = buildInitialTerritoryState(territory)
  })

  const resolvedOptions: GameOptions = {
    seed,
    ironman: options.ironman ?? false,
    mode: options.mode ?? 'sandbox',
    scenarioId: options.scenarioId,
    mods: options.mods ?? [],
    hotkeys: options.hotkeys,
  }

  const diplomacy: DiplomacyMatrix = {
    relations: {},
    wars: new Set<string>(),
    alliances: new Set<string>(),
    reputations: {},
  }
  ensureRelationMatrix(diplomacy, nationStates)
  Object.keys(nationStates).forEach((id) => {
    diplomacy.reputations[id] = 0
  })

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
    tech: buildInitialTechState(resolvedOptions.mods),
    traditions: buildInitialTraditionState(resolvedOptions.mods),
    missionProgress: { activeMissions: [], completed: new Set<string>() },
    scenario: undefined,
    achievements: { unlocked: new Set<string>() },
    options: resolvedOptions,
    replay: { seed: resolvedOptions.seed, entries: [] },
    hotkeys: { ...DEFAULT_HOTKEYS, ...(resolvedOptions.hotkeys ?? {}) },
    log: [],
    notifications: [],
    queuedEvents: [],
    selectedTerritoryId: undefined,
    pendingAction: undefined,
    winner: undefined,
    defeated: undefined,
    actionsTaken: 0,
  }

  initialiseScenarioProgression(state)

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
  advanceTechResearch(state, nation.id, gameConfig.techGainPerInvest)
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
  addTreaty(state.diplomacy, nation.id, target.id, 'trade')
  state.diplomacy.reputations[nation.id] =
    (state.diplomacy.reputations[nation.id] ?? 0) + Math.max(1, Math.round(effect / 2))
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
  const relation = state.diplomacy.relations[nation.id]?.[target.id]
  if (relation) {
    const brokenTreaties = [...relation.treaties]
    if (brokenTreaties.length) {
      brokenTreaties.forEach((treaty) => {
        applyTreatyPenalty(state.diplomacy, nation.id, target.id, 5)
        removeTreaty(state.diplomacy, nation.id, target.id, treaty)
      })
      state.diplomacy.reputations[nation.id] =
        (state.diplomacy.reputations[nation.id] ?? 0) - brokenTreaties.length * 5
    }
  }
  setCasusBelli(state.diplomacy, nation.id, target.id, 'Aggressive expansion')
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
  addTreaty(state.diplomacy, nation.id, target.id, 'defensivePact')
  state.diplomacy.reputations[nation.id] = (state.diplomacy.reputations[nation.id] ?? 0) + 3
  state.diplomacy.reputations[target.id] = (state.diplomacy.reputations[target.id] ?? 0) + 2
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
  state.diplomacy.reputations[nation.id] = (state.diplomacy.reputations[nation.id] ?? 0) - 1
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

  let outcome: string | undefined

  switch (action.type) {
    case 'InvestInTech':
      outcome = handleInvestInTech(state, nation)
      break
    case 'RecruitArmy': {
      const territory = action.sourceTerritoryId
        ? state.territories[action.sourceTerritoryId]
        : undefined
      if (!territory || territory.ownerId !== nationId) {
        return undefined
      }
      outcome = handleRecruitArmy(state, nation, territory)
      break
    }
    case 'CollectTaxes':
      outcome = handleCollectTaxes(state, nation, getControlledTerritories(state, nationId))
      break
    case 'PassLaw':
      if (nation.id === 'carthage' && nation.stats.stability < 60) {
        pushNotification(state, {
          message: 'Carthaginian councils reject reforms below 60 stability.',
          tone: 'negative',
        })
        nation.treasury += cost
        return undefined
      }
      outcome = handlePassLaw(state, nation)
      break
    case 'Spy': {
      if (!action.targetNationId) return undefined
      outcome = handleSpy(state, nation, state.nations[action.targetNationId])
      break
    }
    case 'DiplomacyOffer': {
      if (!action.targetNationId) return undefined
      outcome = handleDiplomacyOffer(state, nation, state.nations[action.targetNationId])
      break
    }
    case 'DeclareWar': {
      if (!action.targetNationId) return undefined
      outcome = handleDeclareWar(state, nation, state.nations[action.targetNationId])
      if (outcome && nationId === state.playerNationId) {
        triggerFirstWarAchievement(state)
      }
      break
    }
    case 'FormAlliance': {
      if (!action.targetNationId) return undefined
      outcome = handleFormAlliance(state, nation, state.nations[action.targetNationId])
      break
    }
    case 'Bribe': {
      if (!action.targetNationId) return undefined
      outcome = handleBribe(state, nation, state.nations[action.targetNationId])
      break
    }
    case 'SuppressCrime':
      outcome = handleSuppressCrime(state, nation)
      break
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
        outcome = `Moved ${sent} strength to ${target.name}`
        break
      }
      const result = resolveCombat(state, nationId, target.ownerId, target.id, sent, rng)
      if (result.outcome !== 'attackerVictory') {
        adjustTerritoryGarrison(source, -1)
      }
      outcome = `Battle result: ${result.outcome}`
      break
    }
    default:
      return undefined
  }

  if (outcome) {
    state.replay.entries.push({
      turn: state.turn,
      actorId: nationId,
      action: { ...action },
    })
  }

  return outcome
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
  evaluateMissions(state)
  revoltChecks(state, rng)
  checkVictoryConditions(state)
  evaluateAchievementTriggers(state)
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
    tech: serialiseTechState(state.tech),
    traditions: serialiseTraditionState(state.traditions),
    missionProgress: serialiseMissionProgress(state.missionProgress),
    achievements: serialiseAchievements(state.achievements),
    replay: serialiseReplay(state.replay),
  }
  return JSON.stringify(serialisable)
}

export const loadStateFromString = (payload: string): GameState => {
  const parsed = JSON.parse(payload)
  const loaded: GameState = {
    ...parsed,
    diplomacy: {
      relations: parsed.diplomacy.relations,
      wars: new Set(parsed.diplomacy.wars),
      alliances: new Set(parsed.diplomacy.alliances),
      reputations: parsed.diplomacy.reputations ?? {},
    },
    tech: parsed.tech ? hydrateTechState(parsed.tech) : buildInitialTechState(parsed.options?.mods),
    traditions: parsed.traditions
      ? hydrateTraditionState(parsed.traditions)
      : buildInitialTraditionState(parsed.options?.mods),
    missionProgress: parsed.missionProgress
      ? hydrateMissionProgress(parsed.missionProgress)
      : { activeMissions: [], completed: new Set<string>() },
    achievements: parsed.achievements
      ? hydrateAchievements(parsed.achievements)
      : { unlocked: new Set<string>() },
    replay: parsed.replay
      ? hydrateReplay(parsed.replay)
      : { seed: parsed.options?.seed ?? Date.now(), entries: [] },
  }
  ensureRelationMatrix(loaded.diplomacy, loaded.nations)
  Object.keys(loaded.nations).forEach((id) => {
    if (loaded.diplomacy.reputations[id] === undefined) {
      loaded.diplomacy.reputations[id] = 0
    }
  })
  loaded.hotkeys = { ...DEFAULT_HOTKEYS, ...(loaded.hotkeys ?? {}) }
  loaded.options.hotkeys = { ...loaded.hotkeys }
  return loaded
}
