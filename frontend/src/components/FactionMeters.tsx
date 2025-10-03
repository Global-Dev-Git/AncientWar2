import type { FactionState } from '../game/types'
import './FactionMeters.css'

interface FactionMetersProps {
  factions: FactionState[]
}

const focusTag: Record<FactionState['focus'], string> = {
  stability: 'Stability bloc',
  economy: 'Economic bloc',
  diplomacy: 'Diplomatic bloc',
}

const supportTone = (support: number) => {
  if (support >= 70) return 'support-strong'
  if (support >= 45) return 'support-steady'
  return 'support-fragile'
}

export const FactionMeters = ({ factions }: FactionMetersProps) => (
  <section className="faction-meters">
    <header>
      <h3>Faction Influence</h3>
      <p>Support levels affect stability, economy and diplomacy each turn.</p>
    </header>
    <ul>
      {factions.map((faction) => (
        <li key={faction.id} className={`faction-meter ${supportTone(faction.support)}`}>
          <div className="faction-meter__heading">
            <div>
              <strong>{faction.name}</strong>
              <span>{focusTag[faction.focus]}</span>
            </div>
            <span>{faction.support}%</span>
          </div>
          <div className="faction-meter__track">
            <div style={{ width: `${faction.support}%` }} />
          </div>
          <p>{faction.description}</p>
        </li>
      ))}
    </ul>
  </section>
)

export default FactionMeters
