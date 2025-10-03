import type { MissionDefinition, MissionProgressState, ScenarioDefinition } from '../game/types'
import './MissionTracker.css'

interface MissionTrackerProps {
  missions: MissionDefinition[]
  progress: MissionProgressState
  scenario?: ScenarioDefinition
}

export const MissionTracker = ({ missions, progress, scenario }: MissionTrackerProps) => {
  const missionMap = new Map(missions.map((mission) => [mission.id, mission]))
  const activeMissions = progress.activeMissions.map((entry) => missionMap.get(entry.missionId))

  return (
    <div className="mission-tracker">
      <header>
        <h3>Mission Objectives</h3>
        {scenario ? <p>{scenario.name}: {scenario.description}</p> : <p>No scenario selected.</p>}
      </header>
      <ul>
        {activeMissions.map((mission, index) => {
          if (!mission) return null
          const missionProgress = progress.activeMissions[index]
          const completed = missionProgress?.complete
          const totalObjectives = mission.objectives.length
          const completedObjectives = missionProgress?.completedObjectives ?? 0
          return (
            <li key={mission.id} className={`mission ${completed ? 'mission--complete' : ''}`}>
              <div>
                <strong>{mission.name}</strong>
                <p>{mission.description}</p>
              </div>
              <div className="mission__status">
                <span>
                  {completedObjectives}/{totalObjectives} objectives
                </span>
                {completed && <span className="mission__badge">Complete</span>}
              </div>
            </li>
          )
        })}
        {!activeMissions.length && <li className="mission mission--empty">No active missions.</li>}
      </ul>
    </div>
  )
}

export default MissionTracker
