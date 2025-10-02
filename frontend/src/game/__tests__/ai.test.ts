import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../engine'
import { decideActions } from '../ai'
import { RandomGenerator } from '../random'

describe('AI decision making', () => {
  it('expansionist archetype prioritises declaring war on neighbours', () => {
    const state = createInitialGameState('rome', 101)
    const carthage = state.nations.carthage
    carthage.archetype = 'Expansionist'
    const actions = decideActions(state, carthage, new RandomGenerator(5))
    expect(actions.some((action) => action.type === 'DeclareWar')).toBe(true)
  })

  it('defensive archetype suppresses crime under pressure', () => {
    const state = createInitialGameState('rome', 202)
    const egypt = state.nations.egypt
    egypt.archetype = 'Defensive'
    egypt.stats.crime = 75
    const actions = decideActions(state, egypt, new RandomGenerator(3))
    expect(actions[0].type).toBe('SuppressCrime')
  })

  it('opportunistic archetype targets unstable neighbours', () => {
    const state = createInitialGameState('rome', 303)
    const medes = state.nations.medes
    medes.archetype = 'Opportunistic'
    state.nations.akkad.stats.stability = 45
    const actions = decideActions(state, medes, new RandomGenerator(4))
    expect(actions[0].type === 'MoveArmy' || actions[0].type === 'DiplomacyOffer').toBe(true)
  })
})
