import { useCallback, useMemo, useRef, useState } from 'react'
import { RandomGenerator } from '../game/random'
import {
  advanceTurn,
  createInitialGameState,
  executePlayerAction,
  loadStateFromString,
  quickSaveState,
} from '../game/engine'
import { adoptTradition as adoptTraditionMutation, setTechFocus as setTechFocusMutation } from '../game/tech'
import type { GameOptions, GameState, HotkeyBindings, PlayerAction } from '../game/types'

const cloneState = (state: GameState): GameState => structuredClone(state)

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const rngRef = useRef<RandomGenerator | null>(null)
  const stateRef = useRef<GameState | null>(null)

  const initialise = useCallback((nationId: string, options: Partial<GameOptions> = {}) => {
    const seed = options.seed ?? Date.now()
    const rng = new RandomGenerator(seed)
    rngRef.current = rng
    const initial = createInitialGameState(nationId, seed, options)
    stateRef.current = initial
    setGameState(cloneState(initial))
  }, [])

  const updateState = useCallback((mutator: (state: GameState, rng: RandomGenerator) => void) => {
    const current = stateRef.current
    const rng = rngRef.current
    if (!current || !rng) return
    mutator(current, rng)
    setGameState(cloneState(current))
  }, [])

  const setTechFocus = useCallback(
    (techId: string | null) => {
      updateState((state) => {
        setTechFocusMutation(state.tech, techId)
      })
    },
    [updateState],
  )

  const adoptTradition = useCallback(
    (traditionId: string) => {
      let adopted = false
      updateState((state) => {
        adopted = adoptTraditionMutation(state, traditionId, state.playerNationId)
      })
      return adopted
    },
    [updateState],
  )

  const updateHotkeys = useCallback(
    (bindings: Partial<HotkeyBindings>) => {
      updateState((state) => {
        state.hotkeys = { ...state.hotkeys, ...bindings }
        state.options.hotkeys = { ...state.hotkeys }
      })
    },
    [updateState],
  )

  const saveReplayLog = useCallback(() => {
    if (!stateRef.current) return null
    return JSON.stringify(stateRef.current.replay)
  }, [])

  const loadReplayLog = useCallback((payload: string) => {
    if (!stateRef.current) return
    try {
      const parsed = JSON.parse(payload)
      if (parsed && Array.isArray(parsed.entries)) {
        stateRef.current.replay = {
          seed: parsed.seed ?? Date.now(),
          entries: parsed.entries,
        }
        setGameState(cloneState(stateRef.current))
      }
    } catch (error) {
      console.warn('Failed to load replay payload', error)
    }
  }, [])

  const performAction = useCallback(
    (action: PlayerAction) => {
      let success = false
      updateState((state, rng) => {
        success = executePlayerAction(state, action, rng)
      })
      return success
    },
    [updateState],
  )

  const endTurn = useCallback(() => {
    updateState((state, rng) => {
      advanceTurn(state, rng)
    })
  }, [updateState])

  const setSelectedTerritory = useCallback((territoryId: string | undefined) => {
    updateState((state) => {
      state.selectedTerritoryId = territoryId
    })
  }, [updateState])

  const saveGame = useCallback(() => {
    if (!stateRef.current) return null
    return quickSaveState(stateRef.current)
  }, [])

  const loadGameFromPayload = useCallback((payload: string) => {
    const restored = loadStateFromString(payload)
    stateRef.current = restored
    rngRef.current = new RandomGenerator(Date.now())
    setGameState(cloneState(restored))
  }, [])

  return useMemo(
    () => ({
      state: gameState,
      initialise,
      performAction,
      endTurn,
      setSelectedTerritory,
      saveGame,
      loadGameFromPayload,
      setTechFocus,
      adoptTradition,
      updateHotkeys,
      saveReplayLog,
      loadReplayLog,
    }),
    [
      gameState,
      initialise,
      performAction,
      endTurn,
      setSelectedTerritory,
      saveGame,
      loadGameFromPayload,
      setTechFocus,
      adoptTradition,
      updateHotkeys,
      saveReplayLog,
      loadReplayLog,
    ],
  )
}
