import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NationSelect from './components/NationSelect'
import HUD from './components/HUD'
import MapBoard from './components/MapBoard'
import ActionMenu from './components/ActionMenu'
import ActionModal from './components/ActionModal'
import DiplomacyPanel from './components/DiplomacyPanel'
import EventLog from './components/EventLog'
import NotificationStack from './components/NotificationStack'
import EconomyPanel from './components/EconomyPanel'
import CourtIntriguePanel from './components/CourtIntriguePanel'
import TechTree from './components/TechTree'
import MissionPanel from './components/MissionPanel'
import OverlayControls, { type OverlayKey } from './components/OverlayControls'
import MiniMap from './components/MiniMap'
import AchievementsPanel from './components/AchievementsPanel'
import HelpCodex from './components/HelpCodex'
import AudioControls from './components/AudioControls'
import ScreenshotExporter from './components/ScreenshotExporter'
import PerformanceStats from './components/PerformanceStats'
import HotkeyManager from './components/HotkeyManager'
import { useGameEngine } from './hooks/useGameEngine'
import { useHotkeys } from './hooks/useHotkeys'
import { gameConfig, nations as nationDefinitions } from './game/data'
import type { ActionType, NotificationEntry } from './game/types'
import { useSettings, type ThemeMode, type ColorPalette } from './contexts/SettingsContext'
import { useTranslation } from './contexts/TranslationContext'
import type { TranslationKey } from './i18n/translations'
import './App.css'

const STORAGE_KEY = 'ancient-war-save'
const AUTOSAVE_INTERVAL = 60_000
const overlayOrder: OverlayKey[] = ['political', 'stability', 'economic']
const overlayTranslationKeys: Record<OverlayKey, TranslationKey> = {
  political: 'overlays.map.political',
  stability: 'overlays.map.stability',
  economic: 'overlays.map.economic',
}

type SaveMode = 'manual' | 'auto' | 'quick'

function App() {
  const { state, initialise, performAction, endTurn, setSelectedTerritory, saveGame, loadGameFromPayload } = useGameEngine()
  const { theme, setTheme, colorPalette, setColorPalette, tooltipDepth, setTooltipDepth } = useSettings()
  const { t, locale, setLocale } = useTranslation()
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [overlay, setOverlay] = useState<OverlayKey>('political')
  const [systemNotifications, setSystemNotifications] = useState<NotificationEntry[]>([])
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState<number | undefined>()
  const [turnDurationMs, setTurnDurationMs] = useState(0)
  const economyRef = useRef<HTMLDivElement | null>(null)
  const turnStartRef = useRef<number>(performance.now())
  const notificationTimeouts = useRef<Record<string, number>>({})

  const playerNation = state ? state.nations[state.playerNationId] : null

  const territories = useMemo(() => (state ? Object.values(state.territories) : []), [state])
  const nations = useMemo(() => (state ? Object.values(state.nations) : []), [state])
  const playerTerritories = useMemo(
    () => territories.filter((territory) => territory.ownerId === state?.playerNationId),
    [territories, state?.playerNationId],
  )

  const pushSystemNotification = useCallback(
    (messageKey: Parameters<typeof t>[0], tone: NotificationEntry['tone'] = 'neutral') => {
      const entry: NotificationEntry = {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: t(messageKey),
        tone,
        timestamp: Date.now(),
      }
      setSystemNotifications((prev) => [...prev.slice(-4), entry])
      const timeout = window.setTimeout(() => {
        setSystemNotifications((prev) => prev.filter((item) => item.id !== entry.id))
      }, 4_000)
      notificationTimeouts.current[entry.id] = timeout
    },
    [t],
  )

  useEffect(() => () => {
    Object.values(notificationTimeouts.current).forEach((timeoutId) => window.clearTimeout(timeoutId))
  }, [])

  const handleSave = useCallback(
    (mode: SaveMode = 'manual') => {
      const payload = saveGame()
      if (!payload) return
      window.localStorage.setItem(STORAGE_KEY, payload)
      const now = Date.now()
      setLastSaveTimestamp(now)
      const messageKey =
        mode === 'auto'
          ? 'notifications.autosave'
          : mode === 'quick'
            ? 'notifications.quicksave'
            : 'notifications.manualsave'
      pushSystemNotification(messageKey, 'positive')
    },
    [pushSystemNotification, saveGame],
  )

  const handleQuickSave = useCallback(() => {
    pushSystemNotification('quicksave.prompt')
    handleSave('quick')
  }, [handleSave, pushSystemNotification])

  const handleLoad = useCallback(() => {
    const payload = window.localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
      turnStartRef.current = performance.now()
    }
  }, [loadGameFromPayload])

  useEffect(() => {
    const payload = window.localStorage.getItem(STORAGE_KEY)
    if (payload) {
      loadGameFromPayload(payload)
    }
  }, [loadGameFromPayload])

  useEffect(() => {
    if (!state) return
    const id = window.setInterval(() => {
      pushSystemNotification('autosave.prompt')
      handleSave('auto')
    }, AUTOSAVE_INTERVAL)
    return () => window.clearInterval(id)
  }, [state, handleSave, pushSystemNotification])

  useEffect(() => {
    if (!state) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = t('confirm.quit')
      return t('confirm.quit')
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state, t])

  useEffect(() => {
    if (!state) return
    const now = performance.now()
    setTurnDurationMs(now - turnStartRef.current)
    turnStartRef.current = now
  }, [state?.turn])

  const cycleOverlay = useCallback(() => {
    setOverlay((current) => {
      const nextIndex = (overlayOrder.indexOf(current) + 1) % overlayOrder.length
      return overlayOrder[nextIndex]
    })
  }, [])

  const handleConfirmAction = useCallback(
    (action: Parameters<typeof performAction>[0]) => {
      performAction(action)
    },
    [performAction],
  )

  useHotkeys(
    (action) => {
      if (!state || !playerNation) return
      switch (action) {
        case 'openMenu':
          setPendingAction('InvestInTech')
          break
        case 'toggleMap':
          cycleOverlay()
          break
        case 'endTurn':
          endTurn()
          break
        case 'quickSave':
          handleQuickSave()
          break
        case 'openEconomy':
          economyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          break
        default:
          break
      }
    },
    { disabled: !state },
  )

  const combinedNotifications = useMemo(
    () => [...(state?.notifications ?? []), ...systemNotifications],
    [state?.notifications, systemNotifications],
  )

  if (!state || !playerNation) {
    return <NationSelect nations={nationDefinitions} onSelect={(nationId) => initialise(nationId)} />
  }

  const actionsRemaining = Math.max(0, gameConfig.maxActionsPerTurn - state.actionsTaken)

  return (
    <div className={`app-shell tooltip-depth-${tooltipDepth}`}>
      <NotificationStack notifications={combinedNotifications} />
      <header className="app-toolbar">
        <div className="app-toolbar__group">
          <label>
            {t('settings.theme')}
            <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
              <option value="light">{t('settings.theme.light')}</option>
              <option value="dark">{t('settings.theme.dark')}</option>
            </select>
          </label>
          <label>
            {t('settings.colorblind')}
            <select value={colorPalette} onChange={(event) => setColorPalette(event.target.value as ColorPalette)}>
              <option value="standard">{t('settings.colorblind.standard')}</option>
              <option value="deuteranopia">{t('settings.colorblind.deuteranopia')}</option>
              <option value="protanopia">{t('settings.colorblind.protanopia')}</option>
              <option value="tritanopia">{t('settings.colorblind.tritanopia')}</option>
            </select>
          </label>
          <label>
            {t('settings.tooltips')}
            <select value={tooltipDepth} onChange={(event) => setTooltipDepth(event.target.value as 'basic' | 'deep')}>
              <option value="basic">{t('settings.tooltips.basic')}</option>
              <option value="deep">{t('settings.tooltips.deep')}</option>
            </select>
          </label>
          <label>
            {t('settings.language')}
            <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
              <option value="en">{t('language.en')}</option>
              <option value="sv-SE">{t('language.sv')}</option>
            </select>
          </label>
        </div>
        <div className="app-toolbar__group">
          <button type="button" onClick={() => handleSave('manual')}>
            {t('app.save')}
          </button>
          <button type="button" onClick={handleQuickSave}>
            {t('app.quickSave')}
          </button>
          <button type="button" onClick={handleLoad}>
            {t('app.load')}
          </button>
        </div>
      </header>
      <main className="app-layout">
        <aside className="app-column app-column--left">
          <ActionMenu actionsRemaining={actionsRemaining} onSelect={(action) => setPendingAction(action)} />
          <HotkeyManager />
          <AudioControls />
          <ScreenshotExporter />
        </aside>
        <section className="app-column app-column--center">
          <HUD nation={playerNation} treasury={playerNation.treasury} turn={state.turn} actionsRemaining={actionsRemaining} />
          <section className="map-panel">
            <div className="map-panel__header">
              <div>
                <h2>{t('app.map.strategic')}</h2>
                <OverlayControls value={overlay} onChange={setOverlay} />
              </div>
              <div className="map-panel__controls">
                <button type="button" onClick={cycleOverlay}>
                  {t('app.toggleMap')} ({t(overlayTranslationKeys[overlay])})
                </button>
                <button type="button" onClick={endTurn}>
                  {t('app.endTurn')}
                </button>
              </div>
            </div>
            <MapBoard
              territories={territories}
              nations={state.nations}
              selectedTerritoryId={state.selectedTerritoryId}
              mode={overlay}
              onSelect={(territoryId) => setSelectedTerritory(territoryId)}
            />
            <MiniMap
              territories={territories}
              nations={state.nations}
              selectedTerritoryId={state.selectedTerritoryId}
              onSelect={(territoryId) => setSelectedTerritory(territoryId)}
            />
          </section>
          <MissionPanel turn={state.turn} log={state.log} />
          <PerformanceStats turnDurationMs={turnDurationMs} lastSaveTimestamp={lastSaveTimestamp} />
          <EventLog entries={state.log} />
        </section>
        <aside className="app-column app-column--right">
          <div ref={economyRef}>
            <EconomyPanel nation={playerNation} territories={playerTerritories} />
          </div>
          <CourtIntriguePanel nation={playerNation} />
          <TechTree nation={playerNation} />
          <DiplomacyPanel playerNation={playerNation} nations={nations} diplomacy={state.diplomacy} />
          <AchievementsPanel state={state} />
          <HelpCodex />
        </aside>
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
