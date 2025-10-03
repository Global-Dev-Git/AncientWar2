import { useMemo } from 'react'
import type { TurnLogEntry } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import './MissionPanel.css'

interface MissionPanelProps {
  turn: number
  log: TurnLogEntry[]
}

const MissionPanel = ({ turn, log }: MissionPanelProps) => {
  const { t } = useTranslation()
  const missions = useMemo(() => {
    const active = log.slice(-3).map((entry) => ({
      id: entry.id,
      title: entry.summary,
      status: 'active' as const,
      turnAssigned: entry.turn,
    }))
    if (active.length === 0) {
      return { active: [], completed: [] as typeof active }
    }
    const completed = active.filter((mission) => mission.turnAssigned < turn - 2)
    const current = active.filter((mission) => mission.turnAssigned >= turn - 2)
    return { active: current, completed }
  }, [log, turn])

  return (
    <section className="panel mission-panel" aria-labelledby="mission-panel-title">
      <header className="panel__header">
        <h3 id="mission-panel-title">{t('missions.title')}</h3>
      </header>
      <div className="mission-panel__section">
        <h4>{t('missions.active')}</h4>
        {missions.active.length === 0 ? (
          <p className="mission-panel__empty">{t('missions.none')}</p>
        ) : (
          <ul>
            {missions.active.map((mission) => (
              <li key={mission.id}>
                <strong>{mission.title}</strong>
                <span>
                  {t('app.turn')} {mission.turnAssigned}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mission-panel__section">
        <h4>{t('missions.completed')}</h4>
        {missions.completed.length === 0 ? (
          <p className="mission-panel__empty">{t('missions.none')}</p>
        ) : (
          <ul>
            {missions.completed.map((mission) => (
              <li key={mission.id}>
                <strong>{mission.title}</strong>
                <span>{t('missions.completed')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default MissionPanel
