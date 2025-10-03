import type {
  NationEconomySummary,
  NationState,
  ResourceType,
} from '../game/types'
import StatBar from './StatBar'
import './HUD.css'

interface HUDProps {
  nation: NationState
  treasury: number
  turn: number
  actionsRemaining: number
  economySummary: NationEconomySummary | null
  marketPrices: Record<ResourceType, number> | null
  priceHistory: Record<ResourceType, number[]> | null
}

const statConfig = [
  { key: 'stability', label: 'Stability' },
  { key: 'military', label: 'Military' },
  { key: 'tech', label: 'Technology' },
  { key: 'economy', label: 'Economy' },
  { key: 'crime', label: 'Crime', invert: true },
  { key: 'influence', label: 'Influence' },
  { key: 'support', label: 'Support' },
  { key: 'science', label: 'Science' },
  { key: 'laws', label: 'Laws' },
] as const

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

const RESOURCE_LABELS: Record<ResourceType, string> = {
  grain: 'Grain',
  timber: 'Timber',
  ore: 'Ore',
  luxury: 'Luxury',
}

const formatHistory = (series: number[]): string => {
  if (!series.length) return 'n/a'
  const lastSamples = series.slice(-6)
  return lastSamples.map((value) => value.toFixed(1)).join(' → ')
}

export const HUD = ({
  nation,
  treasury,
  turn,
  actionsRemaining,
  economySummary,
  marketPrices,
  priceHistory,
}: HUDProps) => (
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
          tone={toneFor(nation.stats[stat.key], stat.invert) as any}
        />
      ))}
    </div>
    {economySummary && marketPrices && priceHistory && (
      <section className="hud__economy">
        <header className="hud__economy-header">
          <h2>Economic Outlook</h2>
          <div className="hud__economy-metrics">
            <span>Tariffs {economySummary.tariffRevenue.toFixed(1)}</span>
            <span>Maintenance {economySummary.maintenanceCost.toFixed(1)}</span>
            <span>Net {economySummary.tradeIncome.toFixed(1)}</span>
            <span>Blockade {(economySummary.blockadePressure * 100).toFixed(0)}%</span>
          </div>
        </header>
        <div className="hud__economy-grid">
          {(Object.keys(RESOURCE_LABELS) as ResourceType[]).map((resource) => (
            <article key={resource} className="hud__economy-card">
              <h3>
                {RESOURCE_LABELS[resource]}
                <span className="hud__economy-price">{marketPrices[resource].toFixed(1)}</span>
              </h3>
              <p className="hud__economy-history">{formatHistory(priceHistory[resource])}</p>
            </article>
          ))}
        </div>
      </section>
    )}
  </section>
)

export default HUD
