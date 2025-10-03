import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../engine'
import { loadStateFromString, quickSaveState, SAVE_VERSION } from '../save'
import type { GameState } from '../types'

const toLegacyPayload = (state: GameState): string => {
  const serialisable = {
    ...state,
    diplomacy: {
      relations: state.diplomacy.relations,
      wars: Array.from(state.diplomacy.wars),
      alliances: Array.from(state.diplomacy.alliances),
    },
  }
  delete (serialisable as Partial<GameState>).saveVersion
  return JSON.stringify(serialisable)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('save system migrations', () => {
  it('embeds the saveVersion marker in newly created saves', () => {
    const state = createInitialGameState('rome', 101)
    const payload = quickSaveState(state)
    const parsed = JSON.parse(payload)

    expect(parsed.saveVersion).toBe(SAVE_VERSION)
  })

  it('upgrades legacy v1 payloads and reports compatibility warnings', () => {
    const state = createInitialGameState('rome', 202)
    const legacyPayload = toLegacyPayload(state)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const migrated = loadStateFromString(legacyPayload)

    expect(migrated.saveVersion).toBe(SAVE_VERSION)
    expect(Array.from(migrated.diplomacy.wars)).toEqual(Array.from(state.diplomacy.wars))
    expect(Array.from(migrated.diplomacy.alliances)).toEqual(Array.from(state.diplomacy.alliances))
    expect(warnSpy).toHaveBeenCalled()
    expect(
      warnSpy.mock.calls.some(([message]) => typeof message === 'string' && message.includes('legacy save')),
    ).toBe(true)
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Save upgraded from v1 to v${SAVE_VERSION}`),
    )
  })
})
