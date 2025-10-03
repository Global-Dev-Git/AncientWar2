import type { TurnLogEntry } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import './EventLog.css'

interface EventLogProps {
  entries: TurnLogEntry[]
}

export const EventLog = ({ entries }: EventLogProps) => {
  const { t } = useTranslation()
  const latest = entries.slice(0, 10)
  return (
    <div className="event-log">
      <h3>{t('eventLog.title')}</h3>
      <div className="event-log__items">
        {latest.length === 0 ? (
          <p className="event-log__empty">{t('eventLog.empty')}</p>
        ) : (
          latest.map((entry) => (
            <article key={entry.id} className={`event-log__item event-log__item--${entry.tone}`}>
              <header>
                <span>
                  {t('app.turn')} {entry.turn}
                </span>
                <strong>{entry.summary}</strong>
              </header>
              {entry.details && <p>{entry.details}</p>}
            </article>
          ))
        )}
      </div>
    </div>
  )
}

export default EventLog
