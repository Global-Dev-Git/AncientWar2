import { describe, expect, it } from 'vitest'
import { advanceTurn, createInitialGameState, executePlayerAction } from '../engine'
import { RandomGenerator } from '../random'

describe('end of turn updates', () => {
  it('increments turn, resets actions and applies upkeep', () => {
    const state = createInitialGameState('rome', 404)
    const rng = new RandomGenerator(11)
    const initialTreasury = state.nations[state.playerNationId].treasury
    executePlayerAction(state, { type: 'CollectTaxes' }, rng)
    expect(state.actionsTaken).toBe(1)
    advanceTurn(state, rng)
    expect(state.turn).toBe(2)
    expect(state.actionsTaken).toBe(0)
    expect(state.nations[state.playerNationId].treasury).toBeGreaterThanOrEqual(0)
    expect(state.nations[state.playerNationId].treasury).not.toBe(initialTreasury)
  })
})
