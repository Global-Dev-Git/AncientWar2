import { nations, territories, gameConfig, buildInitialNationState, buildInitialTerritoryState } from './data'
import { RandomGenerator } from './random'
import { TERRAIN_MODIFIERS } from './constants'
import type {
  ActionType,
  CombatResult,
  GameState,
  NationState,
  PlayerAction,
  TerritoryState,
  TraitKey,
} from './types'
import {
  adjustCharacterLoyalty,
  adjustCourtLoyaltyByFaction,
  adjustEntireCourtLoyalty,
  adjustFactionSupport,
  adjustFactionSupportById,
  adjustTerritoryGarrison,
  clampValue,
  ensureRelationMatrix,
  getControlledTerritories,
  modifyRelation,
  pushLog,
  pushNotification,
  toggleAlliance,
  toggleWar,
  updateStats,
} from './utils'
import { decideActions, getArchetypeMap } from './ai'
import { applyTurnEvents } from './events'
import { calculateIntrigueChance, getBestAgent, isIntrigueAction } from './intrigue'
import type { IntrigueActionType } from './intrigue'

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
  Purge: 4,
  Assassinate: 6,
  StealTech: 6,
  FomentRevolt: 5,
  SuppressCrime: 4,
}

const UNIQUE_TRAIT_COST_MODIFIERS: Partial<Record<string, Partial<Record<ActionType, number>>>> = {
  carthage: { RecruitArmy: -1 },
  medes: { RecruitArmy: 1 },
  minoa: { RecruitArmy: 1 },
}

const COURT_TRAIT_COST_MODIFIERS: Partial<Record<TraitKey, Partial<Record<ActionType, number>>>> = {
  administrator: { CollectTaxes: -1, PassLaw: -1 },
  schemer: { Bribe: -1, Spy: -1, StealTech: -1, Assassinate: -1, FomentRevolt: -1 },
  spymaster: { StealTech: -1, FomentRevolt: -1 },
  ironGuard: { Purge: -2, SuppressCrime: -1 },
  loyalist: { Purge: -1 },
  merchant: { Bribe: -1, DiplomacyOffer: -1 },
  charismatic: { DiplomacyOffer: -1, Bribe: -1 },
  zealot: { DeclareWar: -1, SuppressCrime: -1 },
}

const getCourtActionModifier = (nation: NationState, action: ActionType): number => {
  const modifier = nation.court.reduce((sum, character) => {
    if (character.loyalty < 40) return sum
    const traitEffect = character.traits.reduce(
      (acc, trait) => acc + (COURT_TRAIT_COST_MODIFIERS[trait]?.[action] ?? 0),
      0,
    )
    return sum + traitEffect
  }, 0)
  if (modifier === 0) return 0
  return Math.round(clampValue(modifier, -3, 3))
}

export const createInitialGameState = (
  playerNationId: string,
  _seed: number = Date.now(),
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

  return state
}

const getActionCost = (nation: NationState, action: PlayerAction): number => {
  let cost = ACTION_COSTS[action.type]
  const modifier = UNIQUE_TRAIT_COST_MODIFIERS[nation.id]?.[action.type]
  if (modifier) {
    cost += modifier
  }
  const courtModifier = getCourtActionModifier(nation, action.type)
  if (courtModifier) {
    cost += courtModifier
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

const applyFactionSupportBonuses = (nation: NationState): void => {
  nation.factions.forEach((faction) => {
    const deviation = faction.support - 50
    const delta = Math.trunc(deviation / 15)
    if (delta === 0) return
    switch (faction.focus) {
      case 'stability':
        updateStats(nation, 'stability', delta)
        break
      case 'economy':
        updateStats(nation, 'economy', delta)
        break
      case 'diplomacy':
        updateStats(nation, 'influence', delta)
        break
      default:
        break
    }
  })
}

const driftFactionSupport = (nation: NationState): void => {
  nation.factions.forEach((faction) => {
    const anchor =
      faction.focus === 'stability'
        ? nation.stats.stability
        : faction.focus === 'economy'
        ? nation.stats.economy
        : nation.stats.influence
    const drift = Math.trunc((anchor - 55) / 25)
    let adjustedDrift = drift
    if (nation.stats.crime > 65 && faction.focus === 'stability') {
      adjustedDrift -= 1
    }
    if (adjustedDrift !== 0) {
      adjustFactionSupportById(nation, faction.id, adjustedDrift)
    }
  })
}

const driftCourtLoyalty = (nation: NationState): void => {
  nation.court.forEach((character) => {
    const faction = nation.factions.find((entry) => entry.id === character.factionId)
    const factionDrift = faction ? Math.trunc((faction.support - 50) / 18) : 0
    const crimePenalty = nation.stats.crime > 60 ? -1 : 0
    adjustCharacterLoyalty(character, factionDrift + crimePenalty)
  })
}

const findLowestLoyalCourtier = (nation: NationState) =>
  [...nation.court].sort((a, b) => a.loyalty - b.loyalty)[0] ?? null

const findHighestInfluenceCourtier = (nation: NationState) =>
  [...nation.court].sort((a, b) => b.influence - a.influence)[0] ?? null

const createReplacementCourtier = (nation: NationState, factionId: string) => ({
  id: `${nation.id}-court-${Date.now().toString(36)}`,
  name: `${nation.name.split(' ')[0]} Steward`,
  role: 'Steward',
  loyalty: clampValue(Math.round(nation.stats.stability / 1.5), 30, 80),
  influence: clampValue(Math.round(nation.stats.influence / 2), 20, 70),
  intrigue: clampValue(Math.round(nation.stats.support / 2 + 30), 25, 80),
  traits: ['loyalist'] as TraitKey[],
  factionId,
})

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

const resolveIntrigueAction = (
  state: GameState,
  nation: NationState,
  action: PlayerAction & { type: IntrigueActionType },
  rng: RandomGenerator,
): string | undefined => {
  const agent = getBestAgent(nation)
  if (!agent) {
    return undefined
  }

  const directTarget = action.targetNationId ? state.nations[action.targetNationId] : undefined
  if (action.type !== 'Purge' && !directTarget) {
    return undefined
  }

  const targetForChance = action.type === 'Purge' ? nation : directTarget
  const chance = calculateIntrigueChance(action.type, nation, targetForChance)
  const roll = rng.next()
  const success = roll <= chance
  const percent = Math.round(chance * 100)

  let summary = ''
  let message = ''
  let tone: 'info' | 'success' | 'warning' | 'danger' = success ? 'success' : 'danger'

  switch (action.type) {
    case 'Bribe': {
      const target = directTarget!
      if (success) {
        const relationDelta = 6 + Math.round(agent.influence / 20)
        modifyRelation(state.diplomacy, nation.id, target.id, relationDelta)
        updateStats(target, 'crime', 4)
        adjustCharacterLoyalty(agent, 4)
        adjustFactionSupport(nation, 'diplomacy', 1)
        summary = `${nation.name}'s envoy bribes ${target.name}'s court`
        message = `Bribe succeeded (${percent}% chance)`
      } else {
        modifyRelation(state.diplomacy, nation.id, target.id, -3)
        adjustCharacterLoyalty(agent, -8)
        adjustFactionSupport(nation, 'diplomacy', -1)
        summary = `${nation.name}'s bribe attempt is exposed in ${target.name}`
        message = `Bribe failed (${percent}% chance)`
      }
      break
    }
    case 'Purge': {
      if (success) {
        const dissenter = findLowestLoyalCourtier(nation)
        if (dissenter) {
          const boost = Math.max(15, 80 - dissenter.loyalty)
          adjustCharacterLoyalty(dissenter, boost)
          if (!dissenter.traits.includes('loyalist')) {
            dissenter.traits = [...dissenter.traits, 'loyalist']
          }
          adjustCourtLoyaltyByFaction(nation, dissenter.factionId, 3)
        }
        adjustCharacterLoyalty(agent, 3)
        adjustFactionSupport(nation, 'stability', 2)
        updateStats(nation, 'stability', 3)
        summary = `${nation.name} purges disloyal elements successfully`
        message = `Purge succeeded (${percent}% chance)`
      } else {
        adjustCharacterLoyalty(agent, -6)
        adjustEntireCourtLoyalty(nation, -6)
        adjustFactionSupport(nation, 'stability', -3)
        updateStats(nation, 'stability', -5)
        summary = `${nation.name}'s purge attempt backfires`
        message = `Purge failed (${percent}% chance)`
      }
      break
    }
    case 'Assassinate': {
      const target = directTarget!
      if (success) {
        const victim = findHighestInfluenceCourtier(target)
        if (victim) {
          target.court = target.court.filter((character) => character.id !== victim.id)
          target.court.push(createReplacementCourtier(target, victim.factionId))
        }
        updateStats(target, 'stability', -7)
        adjustFactionSupport(target, 'stability', -4)
        modifyRelation(state.diplomacy, nation.id, target.id, -2)
        adjustCharacterLoyalty(agent, 6)
        summary = `${nation.name}'s assassin strikes within ${target.name}`
        message = `Assassination succeeded (${percent}% chance)`
      } else {
        modifyRelation(state.diplomacy, nation.id, target.id, -8)
        adjustCharacterLoyalty(agent, -12)
        adjustFactionSupport(nation, 'diplomacy', -1)
        updateStats(nation, 'stability', -2)
        summary = `${nation.name}'s assassin is captured in ${target.name}`
        message = `Assassination failed (${percent}% chance)`
      }
      break
    }
    case 'StealTech': {
      const target = directTarget!
      if (success) {
        updateStats(nation, 'tech', 4)
        updateStats(nation, 'science', 3)
        updateStats(target, 'tech', -3)
        adjustCharacterLoyalty(agent, 4)
        adjustFactionSupport(nation, 'economy', 1)
        summary = `${nation.name} steals secrets from ${target.name}`
        message = `Technology stolen (${percent}% chance)`
      } else {
        modifyRelation(state.diplomacy, nation.id, target.id, -5)
        adjustCharacterLoyalty(agent, -7)
        adjustFactionSupport(nation, 'economy', -1)
        summary = `${nation.name}'s theft attempt is uncovered in ${target.name}`
        message = `Steal tech failed (${percent}% chance)`
      }
      break
    }
    case 'FomentRevolt': {
      const target = directTarget!
      if (success) {
        const targetTerritories = getControlledTerritories(state, target.id)
        if (targetTerritories.length > 0) {
          const tile = targetTerritories[Math.floor(rng.next() * targetTerritories.length)]
          tile.unrest = clampValue(tile.unrest + 15, 0, 100)
          adjustTerritoryGarrison(tile, -1)
        }
        updateStats(target, 'stability', -6)
        adjustFactionSupport(target, 'stability', -3)
        adjustCharacterLoyalty(agent, 3)
        summary = `${nation.name} foments revolt within ${target.name}`
        message = `Revolt sparked (${percent}% chance)`
        tone = 'warning'
      } else {
        modifyRelation(state.diplomacy, nation.id, target.id, -4)
        adjustCharacterLoyalty(agent, -6)
        adjustFactionSupport(nation, 'diplomacy', -1)
        summary = `${nation.name}'s agitators are exposed in ${target.name}`
        message = `Revolt failed (${percent}% chance)`
      }
      break
    }
    default:
      break
  }

  if (!summary) {
    return undefined
  }

  pushLog(state, {
    summary,
    details: `${agent.name} attempted ${action.type} (${percent}% chance) — ${success ? 'success' : 'failure'}`,
    tone,
    turn: state.turn,
  })

  return message
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

  if (isIntrigueAction(action.type)) {
    return resolveIntrigueAction(state, nation, action as PlayerAction & { type: IntrigueActionType }, rng)
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

    driftFactionSupport(nation)
    applyFactionSupportBonuses(nation)
    driftCourtLoyalty(nation)
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
    const tone = result.toLowerCase().includes('failed') ? 'negative' : 'positive'
    pushNotification(state, {
      message: result,
      tone,
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
    diplomacy: {
      relations: parsed.diplomacy.relations,
      wars: new Set(parsed.diplomacy.wars),
      alliances: new Set(parsed.diplomacy.alliances),
    },
  }
}
