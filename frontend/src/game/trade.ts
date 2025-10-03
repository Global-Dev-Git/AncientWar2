import type {
  GameConfig,
  GameState,
  NationEconomySummary,
  NationState,
  ResourceType,
  TerritoryState,
  TradeRoute,
} from './types'
import { isAtWar } from './utils'

export const RESOURCE_TYPES: ResourceType[] = ['grain', 'timber', 'copper', 'tin', 'horses', 'papyrus']

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const isSeaEdge = (a: TerritoryState, b: TerritoryState): boolean =>
  a.terrain === 'coastal' ||
  b.terrain === 'coastal' ||
  a.terrain === 'river' ||
  b.terrain === 'river'

export const recomputeTradeRoutes = (state: GameState): TradeRoute[] => {
  const routes: TradeRoute[] = []
  const visited = new Set<string>()

  Object.values(state.territories).forEach((territory) => {
    territory.neighbors.forEach((neighborId) => {
      const neighbor = state.territories[neighborId]
      if (!neighbor) return
      const key = [territory.id, neighbor.id].sort().join('|')
      if (visited.has(key)) return

      const mode: TradeRoute['mode'] = isSeaEdge(territory, neighbor) ? 'sea' : 'land'
      const blocked =
        mode === 'sea' &&
        territory.ownerId !== neighbor.ownerId &&
        territory.ownerId &&
        neighbor.ownerId
          ? isAtWar(state.diplomacy, territory.ownerId, neighbor.ownerId)
          : false

      routes.push({ id: key, from: territory.id, to: neighbor.id, mode, blocked })
      visited.add(key)
    })
  })

  return routes
}

export const updateTradePrices = (state: GameState, config: GameConfig): void => {
  const supplyTotals: Record<ResourceType, number> = RESOURCE_TYPES.reduce((acc, resource) => {
    acc[resource] = 0
    return acc
  }, {} as Record<ResourceType, number>)

  Object.values(state.territories).forEach((territory) => {
    territory.resources.forEach((resource) => {
      supplyTotals[resource] = (supplyTotals[resource] ?? 0) + 1
    })
  })

  const demandBaseline = Object.keys(state.nations).length * 2

  RESOURCE_TYPES.forEach((resource) => {
    const previous = state.trade.prices[resource] ?? 1
    const supply = supplyTotals[resource] ?? 0
    const delta = (demandBaseline - supply) * config.priceElasticity
    const next = clamp(previous + delta, config.priceFloor, config.priceCeiling)
    const rounded = Number(next.toFixed(2))
    state.trade.prices[resource] = rounded
    const history = state.trade.history[resource] ?? []
    state.trade.history[resource] = [...history.slice(-11), rounded]
  })
}

const routeTouchesNation = (
  route: TradeRoute,
  territories: Record<string, TerritoryState>,
  nationId: string,
): boolean => {
  const fromOwner = territories[route.from]?.ownerId
  const toOwner = territories[route.to]?.ownerId
  return fromOwner === nationId || toOwner === nationId
}

export const computeNationTrade = (
  state: GameState,
  nation: NationState,
  config: GameConfig,
): NationEconomySummary => {
  const ownedTerritories = Object.values(state.territories).filter(
    (territory) => territory.ownerId === nation.id,
  )

  const relevantRoutes = state.trade.routes.filter((route) =>
    routeTouchesNation(route, state.territories, nation.id),
  )

  const blockedRoutes = relevantRoutes.filter((route) => route.blocked).length
  const smugglingFactor = Number(Math.min(0.4, Math.max(0, nation.stats.crime / 200)).toFixed(2))

  const baseIncome = ownedTerritories.reduce((total, territory) => {
    return (
      total +
      territory.resources.reduce((resourceSum, resource) => {
        const price = state.trade.prices[resource] ?? 1
        return resourceSum + price * config.tariffRate
      }, 0)
    )
  }, 0)

  const blockadeModifier =
    blockedRoutes > 0 ? 1 - config.blockadeEffect * (1 - smugglingFactor) : 1

  const incomeAfterBlockade = Math.max(0, baseIncome * blockadeModifier)

  const maintenance = relevantRoutes.filter((route) => {
    const fromOwner = state.territories[route.from]?.ownerId
    const toOwner = state.territories[route.to]?.ownerId
    return fromOwner === nation.id && toOwner === nation.id
  }).length * config.routeMaintenance

  return {
    tradeIncome: Number(incomeAfterBlockade.toFixed(2)),
    maintenance: Number(maintenance.toFixed(2)),
    blockedRoutes,
    smugglingFactor,
  }
}

export const applyTradeEconomy = (state: GameState, config: GameConfig): void => {
  state.trade.routes = recomputeTradeRoutes(state)
  updateTradePrices(state, config)

  Object.values(state.nations).forEach((nation) => {
    const summary = computeNationTrade(state, nation, config)
    nation.economySummary = summary
    nation.treasury += Math.round(summary.tradeIncome)
    nation.treasury = Math.max(0, nation.treasury - Math.round(summary.maintenance))
  })
}
