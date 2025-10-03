import type { AchievementDefinition, AchievementState } from '../game/types'
import './AchievementsPanel.css'

interface AchievementsPanelProps {
  achievements: AchievementDefinition[]
  state: AchievementState
}

export const AchievementsPanel = ({ achievements, state }: AchievementsPanelProps) => (
  <div className="achievements-panel">
    <h3>Achievements</h3>
    <ul>
      {achievements.map((achievement) => {
        const unlocked = state.unlocked.has(achievement.id)
        return (
          <li key={achievement.id} className={unlocked ? 'achievement achievement--unlocked' : 'achievement'}>
            <div>
              <strong>{achievement.name}</strong>
              <p>{achievement.description}</p>
            </div>
            <span className="achievement__status">{unlocked ? 'Unlocked' : 'Locked'}</span>
          </li>
        )
      })}
    </ul>
  </div>
)

export default AchievementsPanel
