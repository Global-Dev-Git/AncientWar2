import type { GameState, NationState, PlayerAction } from './types'
import { getControlledTerritories, isAtWar } from './utils'
import { RandomGenerator } from './random'
import { nations } from './data'

export const archetypes: Array<'Expansionist' | 'Defensive' | 'Opportunistic'> = [
  'Expansionist',
  'Defensive',
  'Opportunistic',
]

export const getArchetypeMap = (playerNationId: string): Record<string, typeof archetypes[number]> => {
  const assignment: Record<string, typeof archetypes[number]> = {}
  let index = 0
  nations
    .filter((nation) => nation.id !== playerNationId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((nation) => {
      assignment[nation.id] = archetypes[index % archetypes.length]
      index += 1
    })
  return assignment
}

interface AIDecisionContext {
  state: GameState
  nation: NationState
  rng: RandomGenerator
}

const considerWarTargets = ({ state, nation, rng }: AIDecisionContext): PlayerAction | undefined => {
  const territories = getControlledTerritories(state, nation.id)
  const borderTiles = territories.filter((tile) =>
    tile.neighbors.some((neighborId) => state.territories[neighborId].ownerId !== nation.id),
  )
  if (borderTiles.length === 0) return undefined
  const targetTile = borderTiles[Math.floor(rng.next() * borderTiles.length)]
  const enemy = targetTile.neighbors
    .map((neighborId) => state.territories[neighborId])
    .find((neighbor) => neighbor.ownerId !== nation.id)
  if (!enemy) return undefined
  if (!isAtWar(state.diplomacy, nation.id, enemy.ownerId)) {
    return { type: 'DeclareWar', targetNationId: enemy.ownerId }
  }
  return { type: 'MoveArmy', sourceTerritoryId: targetTile.id, targetTerritoryId: enemy.id }
}

const defensivePlan = ({ state, nation }: AIDecisionContext): PlayerAction | undefined => {
  const worstCrime = nation.stats.crime
  if (worstCrime > 60) {
    return { type: 'SuppressCrime' }
  }
  if (nation.stats.stability < 55) {
    return { type: 'PassLaw' }
  }
  return { type: 'InvestInTech' }
}

const opportunisticPlan = ({ state, nation, rng }: AIDecisionContext): PlayerAction | undefined => {
  const ownedTiles = getControlledTerritories(state, nation.id)
  const borderEnemies = ownedTiles
    .flatMap((tile) =>
      tile.neighbors
        .map((neighborId) => state.territories[neighborId])
        .filter((neighbor) => neighbor.ownerId !== nation.id),
    )
    .filter((tile, index, self) => self.findIndex((t) => t.id === tile.id) === index)

  const weakTarget = borderEnemies.find((tile) => state.nations[tile.ownerId].stats.stability < 60)
  if (weakTarget) {
    const friendlySource = weakTarget.neighbors
      .map((neighborId) => state.territories[neighborId])
      .find((neighbor) => neighbor.ownerId === nation.id)
    if (friendlySource) {
      return {
        type: 'MoveArmy',
        sourceTerritoryId: friendlySource.id,
        targetTerritoryId: weakTarget.id,
      }
    }
  }
  if (borderEnemies.length > 0 && rng.next() > 0.5) {
    return { type: 'DiplomacyOffer', targetNationId: borderEnemies[0].ownerId }
  }
  return { type: 'CollectTaxes' }
}

const expansionistPlan = (ctx: AIDecisionContext): PlayerAction | undefined => {
  const warAction = considerWarTargets(ctx)
  if (warAction) {
    return warAction
  }
  return { type: 'RecruitArmy', sourceTerritoryId: getControlledTerritories(ctx.state, ctx.nation.id)[0]?.id }
}

const defensiveActions = (ctx: AIDecisionContext): PlayerAction[] => {
  const primary = defensivePlan(ctx)
  const secondary = ctx.rng.next() > 0.5 ? { type: 'CollectTaxes' as const } : { type: 'InvestInTech' as const }
  return [primary, secondary].filter(Boolean) as PlayerAction[]
}

const expansionistActions = (ctx: AIDecisionContext): PlayerAction[] => {
  const decisions: PlayerAction[] = []
  const main = expansionistPlan(ctx)
  if (main) decisions.push(main)
  decisions.push({ type: 'RecruitArmy', sourceTerritoryId: getControlledTerritories(ctx.state, ctx.nation.id)[0]?.id })
  return decisions
}

const opportunisticActions = (ctx: AIDecisionContext): PlayerAction[] => {
  const choices: PlayerAction[] = []
  const plan = opportunisticPlan(ctx)
  if (plan) choices.push(plan)
  choices.push({ type: 'Spy', targetNationId: ctx.state.playerNationId })
  return choices
}

const archetypeHandlers = {
  Expansionist: expansionistActions,
  Defensive: defensiveActions,
  Opportunistic: opportunisticActions,
}

export const decideActions = (state: GameState, nation: NationState, rng: RandomGenerator): PlayerAction[] => {
  const ctx: AIDecisionContext = { state, nation, rng }
  const handler = archetypeHandlers[nation.archetype ?? 'Defensive']
  const actions = handler(ctx)
  return actions.slice(0, 2)
}

/**
 * Archetype heuristics pseudocode (also documented in GAME_SPEC.md):
 *
 * Expansionist:
 *   if border enemy and not at war -> declare war
 *   else if already at war -> move army toward border
 *   always recruit in highest value territory
 *
 * Defensive:
 *   if crime high -> suppress
 *   else if stability low -> pass law
 *   else invest in tech and optionally collect taxes
 *
 * Opportunistic:
 *   look for weak neighbor (low stability)
 *   if found -> move army toward it or harass with spies
 *   else alternate between diplomacy offers and taxes
 */
