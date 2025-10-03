import { useEffect, useMemo, useState } from 'react'
import NationSelect from './components/NationSelect'
import HUD from './components/HUD'
import MapBoard from './components/MapBoard'
import ActionMenu from './components/ActionMenu'
import ActionModal from './components/ActionModal'
import DiplomacyPanel from './components/DiplomacyPanel'
import EventLog from './components/EventLog'
import NotificationStack from './components/NotificationStack'
import { useGameEngine } from './hooks/useGameEngine'
import { useEconomySelectors } from './hooks/useEconomySelectors'
import { gameConfig, nations as nationDefinitions } from './game/data'
import type { ActionType } from './game/types'
import { ACTION_SHORTCUTS } from './game/constants'
import './App.css'

const STORAGE_KEY = 'ancient-war-save'

function App() {
  const { state, initialise, performAction, endTurn, setSelectedTerritory, saveGame, loadGameFromPayload } =
    useGameEngine()
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [mapMode, setMapMode] = useState<'political' | 'stability'>('political')

  const playerNation = state ? state.nations[state.playerNationId] : null

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!state || !playerNation) return
      const key = event.key.toLowerCase()
      if (key === ACTION_SHORTCUTS.endTurn) {
        event.preventDefault()
        endTurn()
      }
      if (key === ACTION_SHORTCUTS.toggleMapMode) {
        event.preventDefault()
        setMapMode((prev) => (prev === 'political' ? 'stability' : 'political'))
      }
      if (key === ACTION_SHORTCUTS.openActions) {
        event.preventDefault()
        setPendingAction('InvestInTech')
      }
      if (key === ACTION_SHORTCUTS.openDiplomacy) {
        event.preventDefault()
        document.getElementById('diplomacy-panel')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, playerNation, endTurn])

  const handleConfirmAction = (action: Parameters<typeof performAction>[0]) => {
    performAction(action)
  }

  const handleSave = () => {
    const payload = saveGame()
    if (payload) {
      localStorage.setItem(STORAGE_KEY, payload)
    }
  }

  const handleLoad = () => {
    const payload = localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
    }
  }

  useEffect(() => {
    const payload = localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
    }
  }, [loadGameFromPayload])

  const territories = useMemo(() => (state ? Object.values(state.territories) : []), [state])
  const nations = useMemo(() => (state ? Object.values(state.nations) : []), [state])

  const { overlay: economyOverlay, summary: economySummary, priceHistory, marketPrices } = useEconomySelectors(
    state,
    state?.playerNationId,
  )

  if (!state || !playerNation) {
    return <NationSelect nations={nationDefinitions} onSelect={(nationId) => initialise(nationId)} />
  }

  const actionsRemaining = Math.max(0, gameConfig.maxActionsPerTurn - state.actionsTaken)

  return (
    <div className="app-shell">
      <NotificationStack notifications={state.notifications} />
      <main className="app-main">
        <HUD
          nation={playerNation}
          treasury={playerNation.treasury}
          turn={state.turn}
          actionsRemaining={actionsRemaining}
          economySummary={economySummary}
          marketPrices={marketPrices}
          priceHistory={priceHistory}
        />
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
                  End Turn (E)
                </button>
              </div>
            </div>
            <MapBoard
              territories={territories}
              nations={state.nations}
              selectedTerritoryId={state.selectedTerritoryId}
              mode={mapMode}
              onSelect={(territoryId) => setSelectedTerritory(territoryId)}
              economyOverlay={economyOverlay}
            />
          </div>
          <aside className="sidebar">
            <ActionMenu actionsRemaining={actionsRemaining} onSelect={(action) => setPendingAction(action)} />
            <div id="diplomacy-panel">
              <DiplomacyPanel playerNation={playerNation} nations={nations} diplomacy={state.diplomacy} />
            </div>
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
