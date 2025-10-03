import { useEffect, useState } from 'react'
import type { HotkeyBindings } from '../game/types'
import './HotkeyManager.css'

interface HotkeyManagerProps {
  hotkeys: HotkeyBindings
  onUpdate: (bindings: Partial<HotkeyBindings>) => void
  onReset: () => void
}

export const HotkeyManager = ({ hotkeys, onUpdate, onReset }: HotkeyManagerProps) => {
  const [local, setLocal] = useState<HotkeyBindings>(hotkeys)

  useEffect(() => {
    setLocal(hotkeys)
  }, [hotkeys])

  const handleChange = (key: keyof HotkeyBindings, value: string) => {
    const next = { ...local, [key]: value.slice(0, 1) }
    setLocal(next)
    onUpdate({ [key]: value.slice(0, 1).toLowerCase() } as Partial<HotkeyBindings>)
  }

  return (
    <div className="hotkey-manager">
      <h3>Hotkeys</h3>
      <div className="hotkey-grid">
        {Object.entries(local).map(([key, value]) => (
          <label key={key} className="hotkey-row">
            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            <input
              type="text"
              value={value}
              maxLength={1}
              onChange={(event) => handleChange(key as keyof HotkeyBindings, event.target.value)}
            />
          </label>
        ))}
      </div>
      <button type="button" onClick={onReset} className="hotkey-reset">
        Reset to defaults
      </button>
    </div>
  )
}

export default HotkeyManager
