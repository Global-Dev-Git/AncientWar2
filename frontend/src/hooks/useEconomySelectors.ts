import { useMemo } from 'react'
import type { EconomyState, GameState, ResourceType, TradeRoute } from '../game/types'

const emptyHistory: Record<ResourceType, number[]> = {
  grain: [],
  timber: [],
  ore: [],
  luxury: [],
}

const buildOverlay = (economy: EconomyState | null, nationId?: string) => {
  if (!economy || !nationId) {
    return {
      blockadedTerritories: new Set<string>(),
      tradeRoutes: [] as TradeRoute[],
    }
  }
  const relevantRoutes = economy.tradeRoutes.filter((route) => route.ownerId === nationId)
  const blockaded = new Set<string>()
  relevantRoutes
    .filter((route) => route.blocked)
    .forEach((route) => {
      blockaded.add(route.from)
      blockaded.add(route.to)
    })
  return {
    blockadedTerritories: blockaded,
    tradeRoutes: relevantRoutes,
  }
}

export const useEconomySelectors = (state: GameState | null, nationId?: string) =>
  useMemo(() => {
    if (!state) {
      return {
        overlay: buildOverlay(null, nationId),
        summary: null,
        priceHistory: emptyHistory,
        marketPrices: null as Record<ResourceType, number> | null,
      }
    }

    const overlay = buildOverlay(state.economy, nationId)
    const summary = nationId ? state.economy.nationSummaries[nationId] ?? null : null
    const priceHistory = state.economy.priceHistory
    const marketPrices = state.economy.marketPrices

    return {
      overlay,
      summary,
      priceHistory,
      marketPrices,
    }
  }, [state, nationId])

export default useEconomySelectors
