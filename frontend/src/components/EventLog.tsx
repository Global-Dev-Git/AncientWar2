import type { TurnLogEntry } from '../game/types'
import './EventLog.css'

interface EventLogProps {
  entries: TurnLogEntry[]
}

export const EventLog = ({ entries }: EventLogProps) => (
  <div className="event-log">
    <h3>Chronicles</h3>
    <div className="event-log__items">
      {entries.slice(0, 10).map((entry) => (
        <article key={entry.id} className={`event-log__item event-log__item--${entry.tone}`}>
          <header>
            <span>Turn {entry.turn}</span>
            <strong>{entry.summary}</strong>
          </header>
          {entry.details && <p>{entry.details}</p>}
        </article>
      ))}
    </div>
  </div>
)

export default EventLog
