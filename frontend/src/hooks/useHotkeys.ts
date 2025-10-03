import { useEffect } from 'react'
import { useSettings, type HotkeyAction } from '../contexts/SettingsContext'

type HotkeyHandler = (action: HotkeyAction) => void

type Options = {
  disabled?: boolean
}

export const useHotkeys = (handler: HotkeyHandler, options: Options = {}) => {
  const { hotkeys } = useSettings()

  useEffect(() => {
    if (options.disabled) return
    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const action = (Object.keys(hotkeys) as HotkeyAction[]).find((candidate) => hotkeys[candidate] === key)
      if (!action) return
      event.preventDefault()
      handler(action)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [hotkeys, handler, options.disabled])
}
