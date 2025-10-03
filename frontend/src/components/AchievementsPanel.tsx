import { useMemo } from 'react'
import type { GameState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import type { TranslationKey } from '../i18n/translations'
import './AchievementsPanel.css'

interface AchievementsPanelProps {
  state: GameState
}

type AchievementId = 'first-blood' | 'strategist' | 'master-diplomat'

const achievementTranslationKeys: Record<AchievementId, TranslationKey> = {
  'first-blood': 'achievements.entry.first-blood',
  strategist: 'achievements.entry.strategist',
  'master-diplomat': 'achievements.entry.master-diplomat',
}

const achievementDefinitions: Array<{ id: AchievementId; threshold: number }> = [
  { id: 'first-blood', threshold: 1 },
  { id: 'strategist', threshold: 5 },
  { id: 'master-diplomat', threshold: 10 },
]

const AchievementsPanel = ({ state }: AchievementsPanelProps) => {
  const { t } = useTranslation()
  const entries = useMemo(() => {
    return achievementDefinitions.map((definition) => ({
      id: definition.id,
      unlocked: state.turn >= definition.threshold,
    }))
  }, [state.turn])

  return (
    <section className="panel achievements" aria-labelledby="achievements-title">
      <header className="panel__header">
        <h3 id="achievements-title">{t('achievements.title')}</h3>
      </header>
      {entries.length === 0 ? (
        <p className="achievements__empty">{t('achievements.none')}</p>
      ) : (
        <ul className="achievements__list">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.unlocked ? 'is-unlocked' : 'is-locked'}>
              <span>{t(achievementTranslationKeys[entry.id])}</span>
              <span>{entry.unlocked ? t('achievements.unlocked') : t('achievements.locked')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AchievementsPanel
