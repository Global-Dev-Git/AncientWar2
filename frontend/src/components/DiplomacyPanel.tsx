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

const formatTreaties = (treaties: string[]): string => (treaties.length ? treaties.join(', ') : 'None')

export const DiplomacyPanel = ({ playerNation, nations, diplomacy }: DiplomacyPanelProps) => (
  <div className="diplomacy-panel">
    <h3>Diplomacy</h3>
    <table>
      <thead>
        <tr>
          <th>Nation</th>
          <th>Relation</th>
          <th>Reputation</th>
          <th>Treaties</th>
          <th>Casus Belli</th>
          <th>Penalties</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {nations
          .filter((nation) => nation.id !== playerNation.id)
          .map((nation) => {
            const status =
              diplomacy.relations[playerNation.id]?.[nation.id] ??
              {
                score: 0,
                treaties: [],
                casusBelli: null,
                treatyPenalty: 0,
              }
            const tone = relationTone(status.score)
            const key = [playerNation.id, nation.id].sort().join('|')
            const atWar = diplomacy.wars.has(key)
            const allied = diplomacy.alliances.has(key)
            const reputation = diplomacy.reputations[nation.id] ?? 0
            return (
              <tr key={nation.id} className={`diplomacy-row diplomacy-row--${tone}`}>
                <td>
                  <div className="diplomacy-row__nation">
                    <strong>{nation.name}</strong>
                    <span>{nation.description}</span>
                  </div>
                </td>
                <td className="diplomacy-score">{status.score}</td>
                <td>{reputation}</td>
                <td>{formatTreaties(status.treaties)}</td>
                <td>{status.casusBelli ?? 'None'}</td>
                <td>{status.treatyPenalty}</td>
                <td className="diplomacy-row__badges">
                  {atWar && <span className="tag tag--war">War</span>}
                  {allied && <span className="tag tag--ally">Alliance</span>}
                </td>
              </tr>
            )
          })}
      </tbody>
    </table>
  </div>
)

export default DiplomacyPanel
