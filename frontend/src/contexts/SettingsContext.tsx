import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export type ColorPalette = 'standard' | 'deuteranopia' | 'protanopia' | 'tritanopia'
export type HotkeyAction = 'openMenu' | 'toggleMap' | 'endTurn' | 'quickSave' | 'openEconomy'

interface SettingsContextValue {
  theme: ThemeMode
  colorPalette: ColorPalette
  hotkeys: Record<HotkeyAction, string>
  tooltipDepth: 'basic' | 'deep'
  audioVolume: number
  isAudioMuted: boolean
  setTheme: (theme: ThemeMode) => void
  setColorPalette: (palette: ColorPalette) => void
  setHotkey: (action: HotkeyAction, key: string) => void
  setTooltipDepth: (depth: 'basic' | 'deep') => void
  setAudioVolume: (volume: number) => void
  toggleMute: () => void
}

const DEFAULT_SETTINGS: Omit<SettingsContextValue, 'setTheme' | 'setColorPalette' | 'setHotkey' | 'setTooltipDepth' | 'setAudioVolume' | 'toggleMute'> = {
  theme: 'dark',
  colorPalette: 'standard',
  hotkeys: {
    openMenu: 'a',
    toggleMap: 'm',
    endTurn: 'e',
    quickSave: 'f5',
    openEconomy: 'f1',
  },
  tooltipDepth: 'deep',
  audioVolume: 0.5,
  isAudioMuted: false,
}

const STORAGE_KEY = 'ancient-war-settings'

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

type PersistedSettings = {
  theme: ThemeMode
  colorPalette: ColorPalette
  hotkeys: Record<HotkeyAction, string>
  tooltipDepth: 'basic' | 'deep'
  audioVolume: number
  isAudioMuted: boolean
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PersistedSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PersistedSettings
          return { ...DEFAULT_SETTINGS, ...parsed }
        } catch (error) {
          console.warn('Failed to parse settings', error)
        }
      }
    }
    return { ...DEFAULT_SETTINGS }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dataset.palette = settings.colorPalette
  }, [settings.colorPalette])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  }, [settings])

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const setColorPalette = useCallback((colorPalette: ColorPalette) => {
    setSettings((prev) => ({ ...prev, colorPalette }))
  }, [])

  const setHotkey = useCallback((action: HotkeyAction, key: string) => {
    setSettings((prev) => ({ ...prev, hotkeys: { ...prev.hotkeys, [action]: key.toLowerCase() } }))
  }, [])

  const setTooltipDepth = useCallback((tooltipDepth: 'basic' | 'deep') => {
    setSettings((prev) => ({ ...prev, tooltipDepth }))
  }, [])

  const setAudioVolume = useCallback((audioVolume: number) => {
    setSettings((prev) => ({ ...prev, audioVolume }))
  }, [])

  const toggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, isAudioMuted: !prev.isAudioMuted }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setTheme,
      setColorPalette,
      setHotkey,
      setTooltipDepth,
      setAudioVolume,
      toggleMute,
    }),
    [settings, setTheme, setColorPalette, setHotkey, setTooltipDepth, setAudioVolume, toggleMute],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
