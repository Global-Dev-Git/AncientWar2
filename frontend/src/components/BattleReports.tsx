import type { CombatResult, NationState, TerritoryState } from '../game/types'
import './BattleReports.css'

interface BattleReportsProps {
  reports: CombatResult[]
  nations: Record<string, NationState>
  territories: Record<string, TerritoryState>
}

const outcomeLabel: Record<CombatResult['outcome'], string> = {
  attackerVictory: 'Attacker Victory',
  defenderHolds: 'Defender Holds',
  stalemate: 'Stalemate',
}

export const BattleReports = ({ reports, nations, territories }: BattleReportsProps) => (
  <section className="battle-reports">
    <header>
      <h3>Battle Reports</h3>
      <span>{reports.length > 0 ? `${reports.length} recent` : 'No engagements'}</span>
    </header>
    {reports.length === 0 ? (
      <p className="battle-reports__placeholder">No battles recorded this campaign yet.</p>
    ) : (
      <ul>
        {reports.map((report) => {
          const attacker = nations[report.attackerId]
          const defender = nations[report.defenderId]
          const territory = territories[report.territoryId]
          const territoryName = territory?.name ?? report.territoryId
          return (
            <li key={`${report.territoryId}-${report.attackerLoss}-${report.defenderLoss}`} className={`battle-reports__item battle-reports__item--${report.outcome}`}>
              <div className="battle-reports__combatants">
                <strong>{attacker?.name ?? report.attackerId}</strong>
                <span>vs</span>
                <strong>{defender?.name ?? report.defenderId}</strong>
              </div>
              <div className="battle-reports__details">
                <span className="battle-reports__location">{territoryName}</span>
                <span className="battle-reports__outcome">{outcomeLabel[report.outcome]}</span>
              </div>
              <div className="battle-reports__stats">
                <span>{`Losses A: ${report.attackerLoss}`}</span>
                <span>{`Losses D: ${report.defenderLoss}`}</span>
                <span>{`Siege ${report.siegeProgress}%`}</span>
              </div>
              <div className="battle-reports__stats battle-reports__stats--secondary">
                <span>{`Supply Δ A: ${-report.attackerSupplyPenalty}`}</span>
                <span>{`Supply Δ D: ${-report.defenderSupplyPenalty}`}</span>
              </div>
            </li>
          )
        })}
      </ul>
    )}
  </section>
)

export default BattleReports
