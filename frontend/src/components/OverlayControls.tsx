import { useTranslation } from '../contexts/TranslationContext'
import Tooltip from './Tooltip'
import './OverlayControls.css'

type OverlayKey = 'political' | 'stability' | 'economic'

interface OverlayControlsProps {
  value: OverlayKey
  onChange: (overlay: OverlayKey) => void
}

const OverlayControls = ({ value, onChange }: OverlayControlsProps) => {
  const { t } = useTranslation()
  const overlays: OverlayKey[] = ['political', 'stability', 'economic']

  return (
    <fieldset className="overlay-controls">
      <legend>{t('overlays.title')}</legend>
      <div className="overlay-controls__options">
        {overlays.map((overlay) => (
          <label key={overlay} className={value === overlay ? 'is-active' : ''}>
            <input
              type="radio"
              name="map-overlay"
              value={overlay}
              checked={value === overlay}
              onChange={() => onChange(overlay)}
            />
            <Tooltip
              content={
                <div>
                  <strong>{t(`overlays.map.${overlay}` as const)}</strong>
                  <p>{t('overlays.select')}</p>
                </div>
              }
            >
              <span>{t(`overlays.map.${overlay}` as const)}</span>
            </Tooltip>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export type { OverlayKey }
export default OverlayControls
