import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  advanceTurn,
  createInitialGameState,
  executePlayerAction,
  loadStateFromString,
  quickSaveState,
} from '../engine'
import { RandomGenerator } from '../random'
import { setBlockade } from '../utils'

const FIXED_DATE = new Date('2024-01-01T00:00:00Z')

const runReplay = () => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

  try {
    const state = createInitialGameState('rome', 512)
    const rng = new RandomGenerator(512)

    const actions = [
      { type: 'CollectTaxes' } as const,
      { type: 'DiplomacyOffer', targetNationId: 'carthage' } as const,
      { type: 'RecruitArmy', sourceTerritoryId: 'rome_latium' } as const,
    ]

    actions.forEach((action) => {
      executePlayerAction(state, action, rng)
    })

    advanceTurn(state, rng)
    return quickSaveState(state)
  } finally {
    randomSpy.mockRestore()
    vi.useRealTimers()
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('replay verification', () => {
  it('produces deterministic saves for identical seeds and actions', () => {
    const first = runReplay()
    const second = runReplay()
    expect(first).toBe(second)
  })
})

describe('save migration compatibility', () => {
  it('persists blockade data through saves', () => {
    const state = createInitialGameState('rome', 99)
    setBlockade(state.diplomacy, 'rome', 'carthage', 0.45)
    const payload = quickSaveState(state)
    const restored = loadStateFromString(payload)
    expect(restored.diplomacy.blockades).toMatchObject({ 'carthage|rome': 0.45 })
  })

  it('loads legacy saves without blockades or ironman flags', () => {
    const state = createInitialGameState('rome', 77)
    const payload = quickSaveState(state)
    const legacy = JSON.parse(payload)
    delete legacy.diplomacy.blockades
    delete legacy.ironman
    const restored = loadStateFromString(JSON.stringify(legacy))
    expect(restored.diplomacy.blockades).toEqual({})
    expect(restored.ironman).toBe(false)
  })
})
