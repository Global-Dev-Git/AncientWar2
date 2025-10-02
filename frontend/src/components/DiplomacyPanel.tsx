import type { DiplomacyMatrix, NationState } from '../game/types'
import './DiplomacyPanel.css'

interface DiplomacyPanelProps {
  playerNation: NationState
  nations: NationState[]
  diplomacy: DiplomacyMatrix
}

const relationTone = (score: number): 'ally' | 'neutral' | 'hostile' => {
  if (score >= 40) return 'ally'
  if (score <= -20) return 'hostile'
  return 'neutral'
}

export const DiplomacyPanel = ({ playerNation, nations, diplomacy }: DiplomacyPanelProps) => (
  <div className="diplomacy-panel">
    <h3>Diplomacy</h3>
    <ul>
      {nations
        .filter((nation) => nation.id !== playerNation.id)
        .map((nation) => {
          const score = diplomacy.relations[playerNation.id]?.[nation.id] ?? 0
          const tone = relationTone(score)
          const key = [playerNation.id, nation.id].sort().join('|')
          const atWar = diplomacy.wars.has(key)
          const allied = diplomacy.alliances.has(key)
          return (
            <li key={nation.id} className={`diplomacy-row diplomacy-row--${tone}`}>
              <div>
                <strong>{nation.name}</strong>
                <span>{nation.description}</span>
              </div>
              <div className="diplomacy-row__status">
                <span className="diplomacy-score">{score}</span>
                {atWar && <span className="tag tag--war">War</span>}
                {allied && <span className="tag tag--ally">Alliance</span>}
              </div>
            </li>
          )
        })}
    </ul>
  </div>
)

export default DiplomacyPanel
