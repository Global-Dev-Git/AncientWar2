import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialGameState } from '../engine'
import { applyTradeEconomy, recomputeTradeRoutes } from '../trade'
import { gameConfig } from '../data'
import { relationKey } from '../utils'

const initialiseState = () => {
  const state = createInitialGameState('rome', 42)
  Object.values(state.territories).forEach((territory) => {
    territory.resources = territory.resources.length ? territory.resources : ['grain']
  })
  return state
}

describe('trade economy', () => {
  let state = initialiseState()

  beforeEach(() => {
    state = initialiseState()
  })

  it('keeps prices within configured bounds', () => {
    Object.values(state.territories).forEach((territory, index) => {
      territory.resources = index % 2 === 0 ? ['grain'] : ['copper']
    })

    applyTradeEconomy(state, gameConfig)

    expect(state.trade.prices.grain).toBeLessThanOrEqual(gameConfig.priceCeiling)
    expect(state.trade.prices.grain).toBeGreaterThanOrEqual(gameConfig.priceFloor)
    expect(state.trade.prices.copper).toBeLessThanOrEqual(gameConfig.priceCeiling)
    expect(state.trade.prices.copper).toBeGreaterThanOrEqual(gameConfig.priceFloor)
  })

  it('reduces income when blockaded and reports smuggling potential', () => {
    const rome = state.nations.rome
    const routesBefore = recomputeTradeRoutes(state)
    expect(routesBefore.some((route) => route.mode === 'sea' && route.blocked)).toBe(false)

    applyTradeEconomy(state, gameConfig)
    const baseline = rome.economySummary?.tradeIncome ?? 0
    expect(baseline).toBeGreaterThan(0)

    state.diplomacy.wars.add(relationKey('rome', 'carthage'))
    applyTradeEconomy(state, gameConfig)
    const after = rome.economySummary?.tradeIncome ?? 0

    expect(after).toBeLessThan(baseline)
    expect(rome.economySummary?.blockedRoutes ?? 0).toBeGreaterThan(0)
  })

  it('classifies land and sea routes', () => {
    const routes = recomputeTradeRoutes(state)
    const coastalKey = ['rome_campania', 'carthage_carthage'].sort().join('|')
    const inlandKey = ['rome_latium', 'rome_etruria'].sort().join('|')

    const coastal = routes.find((route) => route.id === coastalKey)
    const inland = routes.find((route) => route.id === inlandKey)

    expect(coastal?.mode).toBe('sea')
    expect(inland?.mode).toBe('land')
  })
})
