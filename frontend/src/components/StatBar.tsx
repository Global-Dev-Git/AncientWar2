import './StatBar.css'

interface StatBarProps {
  label: string
  value: number
  tone?: 'stable' | 'risky' | 'critical'
}

const toneColors: Record<NonNullable<StatBarProps['tone']>, string> = {
  stable: 'var(--color-positive)',
  risky: 'var(--color-warning)',
  critical: 'var(--color-negative)',
}

export const StatBar = ({ label, value, tone = 'stable' }: StatBarProps) => (
  <div className="stat-bar">
    <div className="stat-bar__label">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <div className="stat-bar__meter">
      <div className="stat-bar__fill" style={{ width: `${value}%`, background: toneColors[tone] }} />
    </div>
  </div>
)

export default StatBar
