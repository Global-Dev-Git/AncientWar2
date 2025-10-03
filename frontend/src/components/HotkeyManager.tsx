import { useCallback, useState } from 'react'
import { useSettings, type HotkeyAction } from '../contexts/SettingsContext'
import { useTranslation } from '../contexts/TranslationContext'
import './HotkeyManager.css'

const actionOrder: HotkeyAction[] = ['openMenu', 'toggleMap', 'endTurn', 'quickSave', 'openEconomy']

const HotkeyManager = () => {
  const { hotkeys, setHotkey } = useSettings()
  const { t } = useTranslation()
  const [pending, setPending] = useState<HotkeyAction | null>(null)

  const handleStartRebind = useCallback((action: HotkeyAction) => {
    setPending(action)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!pending) return
      event.preventDefault()
      const key = event.key.toLowerCase()
      setHotkey(pending, key)
      setPending(null)
    },
    [pending, setHotkey],
  )

  return (
    <section className="panel hotkey-manager" aria-labelledby="hotkey-manager-title">
      <header className="panel__header">
        <h3 id="hotkey-manager-title">{t('settings.hotkeys')}</h3>
      </header>
      <ul className="hotkey-manager__list">
        {actionOrder.map((action) => (
          <li key={action}>
            <span>{t(`hotkeys.${action}` as const)}</span>
            <button
              type="button"
              onClick={() => handleStartRebind(action)}
              onKeyDown={handleKeyDown}
              className={pending === action ? 'is-pending' : ''}
            >
              {pending === action ? t('settings.hotkey.press') : hotkeys[action].toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default HotkeyManager
