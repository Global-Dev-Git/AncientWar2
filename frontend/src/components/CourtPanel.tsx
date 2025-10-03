import { useMemo } from 'react'
import { Crown, UsersThree, Star, Lightning, FlagBanner } from '@phosphor-icons/react'
import type { ActionType, NationState } from '../game/types'
import { ACTION_LABELS } from '../game/constants'
import { INTRIGUE_ACTIONS, getIntrigueSpecialistName } from '../game/intrigue'
import './CourtPanel.css'

interface CourtPanelProps {
  nation: NationState
  onClose: () => void
  onSelectAction: (action: ActionType) => void
}

const roleIconMap = {
  Leader: <Crown weight="duotone" />,
  Advisor: <UsersThree weight="duotone" />,
  General: <FlagBanner weight="duotone" />,
} as const

const actionHints: Partial<Record<ActionType, string>> = {
  BribeAdvisor: 'Boost the loyalty of your shakiest advisor.',
  Purge: 'Remove a disloyal courtier and steady factions.',
  Assassinate: 'Attempt to eliminate a rival leader.',
  StealTech: 'Steal scientific knowledge from foes.',
  FomentRevolt: 'Incite unrest within another nation.',
} as const

const loyaltyGradient = (value: number) => `linear-gradient(90deg, #20c997 ${value}%, rgba(32, 201, 151, 0.2) ${value}%)`

const CourtPanel = ({ nation, onClose, onSelectAction }: CourtPanelProps) => {
  const intrigueSpecialists = useMemo(() => {
    const hints: Record<string, string> = {}
    INTRIGUE_ACTIONS.forEach((action) => {
      const name = getIntrigueSpecialistName(nation, action)
      if (name) {
        hints[action] = name
      }
    })
    return hints
  }, [nation])

  return (
    <div className="court-panel" role="dialog" aria-modal>
      <header>
        <div>
          <h3>{nation.name} Court</h3>
          <p>Characters and factions shaping your stability and intrigue.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close court screen">
          ✕
        </button>
      </header>

      <section className="court-panel__characters" aria-label="Characters">
        {nation.characters.map((character) => (
          <article key={character.id} className="court-card">
            <div className="court-card__avatar">{roleIconMap[character.role]}</div>
            <div className="court-card__body">
              <header>
                <h4>{character.name}</h4>
                <span className="pill">{character.role}</span>
              </header>
              <p className="court-card__traits">
                {character.traits.map((trait) => (
                  <span key={trait} className="trait-chip">
                    {trait}
                  </span>
                ))}
              </p>
              <div className="court-card__loyalty">
                <span>Loyalty</span>
                <div className="loyalty-bar" style={{ backgroundImage: loyaltyGradient(character.loyalty) }}>
                  <span>{character.loyalty}</span>
                </div>
              </div>
              <div className="court-card__meta">
                <Star weight="fill" />
                <small>{character.expertise.charAt(0).toUpperCase() + character.expertise.slice(1)}</small>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="court-panel__factions" aria-label="Faction standings">
        {nation.factions.map((faction) => (
          <div key={faction.id} className="faction-row">
            <div className="faction-row__label">
              <Lightning weight="bold" />
              <span>{faction.id}</span>
            </div>
            <div className="faction-row__meter">
              <div style={{ width: `${faction.support}%` }} />
            </div>
            <strong>{faction.support}</strong>
          </div>
        ))}
      </section>

      <section className="court-panel__actions" aria-label="Intrigue actions">
        <h4>Intrigue</h4>
        <div className="court-panel__action-grid">
          {INTRIGUE_ACTIONS.map((action) => (
            <button key={action} type="button" onClick={() => onSelectAction(action)}>
              <span>{ACTION_LABELS[action]}</span>
              <small>
                {intrigueSpecialists[action] ? `Led by ${intrigueSpecialists[action]}` : actionHints[action]}
              </small>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default CourtPanel
