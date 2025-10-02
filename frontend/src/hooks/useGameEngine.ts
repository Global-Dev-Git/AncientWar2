import { useCallback, useMemo, useRef, useState } from 'react'
import { RandomGenerator } from '../game/random'
import {
  advanceTurn,
  createInitialGameState,
  executePlayerAction,
  loadStateFromString,
  quickSaveState,
} from '../game/engine'
import type { GameState, PlayerAction } from '../game/types'

const cloneState = (state: GameState): GameState => structuredClone(state)

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const rngRef = useRef<RandomGenerator | null>(null)
  const stateRef = useRef<GameState | null>(null)

  const initialise = useCallback((nationId: string) => {
    const seed = Date.now()
    const rng = new RandomGenerator(seed)
    rngRef.current = rng
    const initial = createInitialGameState(nationId, seed)
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
    }),
    [gameState, initialise, performAction, endTurn, setSelectedTerritory, saveGame, loadGameFromPayload],
  )
}
