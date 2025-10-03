import { describe, expect, it } from 'vitest'
import { createInitialGameState, executePlayerAction } from '../engine'
import { calculateIntrigueChance } from '../intrigue'
import { RandomGenerator } from '../random'

class FixedRng extends RandomGenerator {
  constructor(private readonly fixed: number) {
    super(1)
  }

  override next(): number {
    return this.fixed
  }
}

describe('Intrigue systems', () => {
  it('rewards specialist traits when calculating intrigue chance', () => {
    const state = createInitialGameState('rome', 11)
    const rome = state.nations.rome
    const carthage = state.nations.carthage
    const intrigue = rome.characters.find((character) => character.expertise === 'intrigue')
    expect(intrigue).toBeDefined()
    if (!intrigue) return
    intrigue.loyalty = 48
    rome.stats.influence = 50
    carthage.stats.stability = 80
    const withTrait = calculateIntrigueChance('StealTech', rome, carthage)
    intrigue.traits = []
    const withoutTrait = calculateIntrigueChance('StealTech', rome, carthage)
    expect(withTrait).toBeGreaterThan(withoutTrait)
  })

  it('bribe advisor raises loyalty on success', () => {
    const state = createInitialGameState('rome', 22)
    const rome = state.nations.rome
    const lowest = rome.characters
      .filter((character) => character.role === 'Advisor')
      .sort((a, b) => a.loyalty - b.loyalty)[0]
    const before = lowest.loyalty
    executePlayerAction(state, { type: 'BribeAdvisor' }, new FixedRng(0.01))
    const after = rome.characters.find((character) => character.id === lowest.id)?.loyalty ?? 0
    expect(after).toBeGreaterThan(before)
  })

  it('failed assassination penalises stability', () => {
    const state = createInitialGameState('rome', 33)
    const before = state.nations.rome.stats.stability
    executePlayerAction(
      state,
      { type: 'Assassinate', targetNationId: 'carthage' },
      new FixedRng(0.99),
    )
    expect(state.nations.rome.stats.stability).toBeLessThan(before)
  })
})
