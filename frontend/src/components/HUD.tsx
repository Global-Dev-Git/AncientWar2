import type { NationState } from '../game/types'
import StatBar from './StatBar'
import './HUD.css'

interface HUDProps {
  nation: NationState
  treasury: number
  turn: number
  actionsRemaining: number
}

const statConfig: Array<{ key: keyof NationState['stats']; label: string; invert?: boolean }> = [
  { key: 'stability', label: 'Stability' },
  { key: 'military', label: 'Military' },
  { key: 'tech', label: 'Technology' },
  { key: 'economy', label: 'Economy' },
  { key: 'crime', label: 'Crime', invert: true },
  { key: 'influence', label: 'Influence' },
  { key: 'support', label: 'Support' },
  { key: 'science', label: 'Science' },
  { key: 'laws', label: 'Laws' },
]

const toneFor = (value: number, invert?: boolean) => {
  if (invert) {
    if (value <= 25) return 'stable'
    if (value <= 60) return 'risky'
    return 'critical'
  }
  if (value >= 70) return 'stable'
  if (value >= 40) return 'risky'
  return 'critical'
}

export const HUD = ({ nation, treasury, turn, actionsRemaining }: HUDProps) => (
  <section className="hud">
    <header className="hud__header">
      <div>
        <h1>{nation.name}</h1>
        <p>{nation.description}</p>
      </div>
      <div className="hud__meta">
        <span>Turn {turn}</span>
        <span>Treasury {treasury}</span>
        <span>Actions left {actionsRemaining}</span>
      </div>
    </header>
    <div className="hud__stats">
      {statConfig.map((stat) => (
        <StatBar
          key={stat.key}
          label={stat.label}
          value={nation.stats[stat.key]}
          tone={toneFor(nation.stats[stat.key], stat.invert)}
        />
      ))}
    </div>
  </section>
)

export default HUD
