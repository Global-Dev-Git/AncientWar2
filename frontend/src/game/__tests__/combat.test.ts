import { describe, expect, it } from 'vitest'
import { createInitialGameState, resolveCombat } from '../engine'
import { RandomGenerator } from '../random'

describe('resolveCombat', () => {
  it('uses deterministic seeded randomness for predictable outcomes', () => {
    const state = createInitialGameState('rome', 123)
    const rng = new RandomGenerator(42)
    const battle = resolveCombat(state, 'rome', 'carthage', 'carthage_carthage', 12, rng, 'rome_latium')
    expect(battle.outcome).toBe('attackerVictory')
    expect(state.territories.carthage_carthage.ownerId).toBe('rome')
    expect(battle.attackerLoss).toBeGreaterThan(0)
    expect(battle.defenderLoss).toBeGreaterThan(0)
    expect(battle.siegeProgress).toBe(0)
    expect(battle.attackerSupplyPenalty).toBeGreaterThan(0)
    expect(state.battleReports[0]).toEqual(battle)
  })
})
