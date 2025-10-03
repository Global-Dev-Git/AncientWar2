import type { NationState, StatKey } from '../game/types'
import type { TranslationKey } from '../i18n/translations'
import { useTranslation } from '../contexts/TranslationContext'
import StatBar from './StatBar'
import './HUD.css'

interface HUDProps {
  nation: NationState
  treasury: number
  turn: number
  actionsRemaining: number
}

const statConfig: Array<{ key: StatKey; translation: TranslationKey; invert?: boolean }> = [
  { key: 'stability', translation: 'stats.stability' },
  { key: 'military', translation: 'stats.military' },
  { key: 'tech', translation: 'stats.tech' },
  { key: 'economy', translation: 'stats.economy' },
  { key: 'crime', translation: 'stats.crime', invert: true },
  { key: 'influence', translation: 'stats.influence' },
  { key: 'support', translation: 'stats.support' },
  { key: 'science', translation: 'stats.science' },
  { key: 'laws', translation: 'stats.laws' },
]

const toneFor = (value: number, invert?: boolean) => {
  if (invert) {
    if (value <= 25) return 'stable'
    if (value <= 60) return 'risky'
    return 'critical'
  }
  if (value >= 70) return 'stable'
  if (value >= 40) return 'risky'
  return 'critical'
}

export const HUD = ({ nation, treasury, turn, actionsRemaining }: HUDProps) => {
  const { t } = useTranslation()
  return (
    <section className="hud">
      <header className="hud__header">
        <div>
          <h1>{nation.name}</h1>
          <p>{nation.description}</p>
        </div>
        <div className="hud__meta">
          <span>
            {t('app.turn')} {turn}
          </span>
          <span>
            {t('app.treasury')} {treasury}
          </span>
          <span>
            {t('hud.actionsLeft')} {actionsRemaining}
          </span>
        </div>
      </header>
      <div className="hud__stats">
        {statConfig.map((stat) => (
          <StatBar
            key={stat.key}
            label={t(stat.translation)}
            value={nation.stats[stat.key]}
            tone={toneFor(nation.stats[stat.key], stat.invert) as any}
          />
        ))}
      </div>
    </section>
  )
}

export default HUD
