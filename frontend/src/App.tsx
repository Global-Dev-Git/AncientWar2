import { useEffect, useMemo, useState } from 'react'
import NationSelect from './components/NationSelect'
import HUD from './components/HUD'
import MapBoard from './components/MapBoard'
import ActionMenu from './components/ActionMenu'
import ActionModal from './components/ActionModal'
import DiplomacyPanel from './components/DiplomacyPanel'
import EventLog from './components/EventLog'
import NotificationStack from './components/NotificationStack'
import TechTreePanel from './components/TechTreePanel'
import MissionTracker from './components/MissionTracker'
import AchievementsPanel from './components/AchievementsPanel'
import HotkeyManager from './components/HotkeyManager'
import ReplayControls from './components/ReplayControls'
import { useGameEngine } from './hooks/useGameEngine'
import { gameConfig, nations as nationDefinitions } from './game/data'
import type { ActionType, HotkeyBindings } from './game/types'
import { DEFAULT_HOTKEYS } from './game/constants'
import {
  getMergedAchievements,
  getMergedMissions,
  getMergedTechTree,
  getMergedTraditions,
} from './game/tech'
import './App.css'

const STORAGE_KEY = 'ancient-war-save'
const HOTKEY_STORAGE_KEY = 'ancient-war-hotkeys'
const REPLAY_STORAGE_KEY = 'ancient-war-replay'

function App() {
  const {
    state,
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
  } = useGameEngine()
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [mapMode, setMapMode] = useState<'political' | 'stability'>('political')
  const [hotkeyOverrides] = useState<Partial<HotkeyBindings>>(() => {
    const stored = localStorage.getItem(HOTKEY_STORAGE_KEY)
    if (!stored) return {}
    try {
      return JSON.parse(stored) as Partial<HotkeyBindings>
    } catch (error) {
      console.warn('Failed to parse stored hotkeys', error)
      return {}
    }
  })
  const [storedReplay, setStoredReplay] = useState<string>(() => localStorage.getItem(REPLAY_STORAGE_KEY) ?? '')

  const playerNation = state ? state.nations[state.playerNationId] : null
  const hotkeys = useMemo(
    () => state?.hotkeys ?? { ...DEFAULT_HOTKEYS, ...hotkeyOverrides },
    [state?.hotkeys, hotkeyOverrides],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!state || !playerNation) return
      const key = event.key.toLowerCase()
      if (key === hotkeys.endTurn.toLowerCase()) {
        event.preventDefault()
        endTurn()
      }
      if (key === hotkeys.toggleMapMode.toLowerCase()) {
        event.preventDefault()
        setMapMode((prev) => (prev === 'political' ? 'stability' : 'political'))
      }
      if (key === hotkeys.openActions.toLowerCase()) {
        event.preventDefault()
        setPendingAction('InvestInTech')
      }
      if (key === hotkeys.openDiplomacy.toLowerCase()) {
        event.preventDefault()
        document.getElementById('diplomacy-panel')?.scrollIntoView({ behavior: 'smooth' })
      }
      if (hotkeys.openTech && key === hotkeys.openTech.toLowerCase()) {
        event.preventDefault()
        document.getElementById('tech-panel')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, playerNation, endTurn, hotkeys])

  const handleConfirmAction = (action: Parameters<typeof performAction>[0]) => {
    performAction(action)
  }

  const handleSave = () => {
    const payload = saveGame()
    if (payload) {
      localStorage.setItem(STORAGE_KEY, payload)
      const replay = saveReplayLog()
      if (replay) {
        localStorage.setItem(REPLAY_STORAGE_KEY, replay)
        setStoredReplay(replay)
      }
    }
  }

  const handleLoad = () => {
    const payload = localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
    }
    const replay = localStorage.getItem(REPLAY_STORAGE_KEY)
    if (replay) {
      loadReplayLog(replay)
      setStoredReplay(replay)
    }
  }

  useEffect(() => {
    const payload = localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
    }
    const replay = localStorage.getItem(REPLAY_STORAGE_KEY)
    if (replay) {
      loadReplayLog(replay)
      setStoredReplay(replay)
    }
  }, [loadGameFromPayload, loadReplayLog])

  useEffect(() => {
    if (state) {
      localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(state.hotkeys))
    }
  }, [state?.hotkeys])

  const territories = useMemo(() => (state ? Object.values(state.territories) : []), [state])
  const nations = useMemo(() => (state ? Object.values(state.nations) : []), [state])

  if (!state || !playerNation) {
    return (
      <NationSelect
        nations={nationDefinitions}
        initialHotkeys={{ ...DEFAULT_HOTKEYS, ...hotkeyOverrides }}
        onSelect={(nationId, options) => initialise(nationId, options)}
      />
    )
  }

  const techNodes = useMemo(() => getMergedTechTree(state.options.mods), [state.options.mods])
  const traditionDefinitions = useMemo(
    () => getMergedTraditions(state.options.mods),
    [state.options.mods],
  )
  const missionDefinitions = useMemo(() => getMergedMissions(state.options.mods), [state.options.mods])
  const achievementDefinitions = useMemo(
    () => getMergedAchievements(state.options.mods),
    [state.options.mods],
  )

  const actionsRemaining = Math.max(0, gameConfig.maxActionsPerTurn - state.actionsTaken)

  const handleHotkeyUpdate = (bindings: Partial<HotkeyBindings>) => {
    updateHotkeys(bindings)
  }

  const handleHotkeyReset = () => {
    updateHotkeys(DEFAULT_HOTKEYS)
  }

  const handleReplaySave = () => {
    const payload = saveReplayLog()
    if (payload) {
      localStorage.setItem(REPLAY_STORAGE_KEY, payload)
      setStoredReplay(payload)
    }
    return payload
  }

  const handleReplayLoad = (payload: string) => {
    loadReplayLog(payload)
    localStorage.setItem(REPLAY_STORAGE_KEY, payload)
    setStoredReplay(payload)
  }

  return (
    <div className="app-shell">
      <NotificationStack notifications={state.notifications} />
      <main className="app-main">
        <HUD nation={playerNation} treasury={playerNation.treasury} turn={state.turn} actionsRemaining={actionsRemaining} />
        <section className="app-content">
          <div className="map-panel">
            <div className="map-panel__header">
              <h2>Strategic Map</h2>
              <div className="map-panel__controls">
                <button type="button" onClick={() => setMapMode(mapMode === 'political' ? 'stability' : 'political')}>
                  Toggle Map ({mapMode})
                </button>
                <button type="button" onClick={handleSave}>
                  Save
                </button>
                <button type="button" onClick={handleLoad}>
                  Load
                </button>
                <button type="button" onClick={endTurn}>
                  End Turn ({hotkeys.endTurn.toUpperCase()})
                </button>
              </div>
            </div>
            <MapBoard
              territories={territories}
              nations={state.nations}
              selectedTerritoryId={state.selectedTerritoryId}
              mode={mapMode}
              onSelect={(territoryId) => setSelectedTerritory(territoryId)}
            />
          </div>
          <aside className="sidebar">
            <ActionMenu actionsRemaining={actionsRemaining} onSelect={(action) => setPendingAction(action)} />
            <div id="tech-panel">
              <TechTreePanel
                techNodes={techNodes}
                techState={state.tech}
                traditions={state.traditions}
                traditionDefinitions={traditionDefinitions}
                onSelectTech={(techId) => setTechFocus(techId)}
                onAdoptTradition={(traditionId) => adoptTradition(traditionId)}
              />
            </div>
            <MissionTracker missions={missionDefinitions} progress={state.missionProgress} scenario={state.scenario} />
            <div id="diplomacy-panel">
              <DiplomacyPanel playerNation={playerNation} nations={nations} diplomacy={state.diplomacy} />
            </div>
            <AchievementsPanel achievements={achievementDefinitions} state={state.achievements} />
            <HotkeyManager hotkeys={hotkeys} onUpdate={handleHotkeyUpdate} onReset={handleHotkeyReset} />
            <ReplayControls onSave={handleReplaySave} onLoad={handleReplayLoad} initialValue={storedReplay} />
          </aside>
        </section>
        <EventLog entries={state.log} />
      </main>
      {pendingAction && (
        <ActionModal
          actionType={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmAction}
          nations={nations}
          territories={territories}
          playerNationId={state.playerNationId}
          selectedTerritoryId={state.selectedTerritoryId}
        />
      )}
    </div>
  )
}

export default App
