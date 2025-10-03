import type { CharacterState, TraitKey } from '../game/types'
import './CourtRoster.css'

interface CourtRosterProps {
  court: CharacterState[]
}

const traitLabels: Record<TraitKey, string> = {
  schemer: 'Schemer',
  loyalist: 'Loyalist',
  administrator: 'Administrator',
  charismatic: 'Charismatic',
  spymaster: 'Spymaster',
  assassin: 'Assassin',
  zealot: 'Zealot',
  merchant: 'Merchant',
  ironGuard: 'Iron Guard',
}

const valueTone = (value: number) => {
  if (value >= 70) return 'high'
  if (value >= 40) return 'medium'
  return 'low'
}

export const CourtRoster = ({ court }: CourtRosterProps) => (
  <section className="court-roster">
    <header>
      <h3>The Court</h3>
      <p>Key figures whose loyalty and intrigue shape your fate.</p>
    </header>
    <ul>
      {court.map((character) => (
        <li key={character.id} className="court-roster__entry">
          <div className="court-roster__heading">
            <div>
              <strong>{character.name}</strong>
              <span>{character.role}</span>
            </div>
            <span className={`court-roster__loyalty court-roster__loyalty--${valueTone(character.loyalty)}`}>
              Loyalty {character.loyalty}
            </span>
          </div>
          <div className="court-roster__bars">
            <div className="court-roster__bar">
              <span>Influence</span>
              <div className="court-roster__bar-track">
                <div style={{ width: `${character.influence}%` }} />
              </div>
            </div>
            <div className="court-roster__bar">
              <span>Intrigue</span>
              <div className="court-roster__bar-track">
                <div style={{ width: `${character.intrigue}%` }} />
              </div>
            </div>
          </div>
          <div className="court-roster__traits">
            {character.traits.map((trait) => (
              <span key={trait} className="court-roster__trait">
                {traitLabels[trait]}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  </section>
)

export default CourtRoster
