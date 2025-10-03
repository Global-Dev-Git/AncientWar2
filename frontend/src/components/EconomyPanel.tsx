import type { NationState, TradeState } from '../game/types'
import { RESOURCE_TYPES } from '../game/trade'
import './EconomyPanel.css'

interface EconomyPanelProps {
  trade: TradeState
  nation: NationState
  onClose: () => void
}

const sparklinePath = (history: number[]): string => {
  if (history.length === 0) return ''
  const values = history.slice(-12)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const normalise = (value: number): number => {
    if (max === min) return 50
    return ((value - min) / (max - min)) * 80 + 10
  }
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 120 + 5
      const y = 100 - normalise(value)
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}

const formatNumber = (value: number | undefined): string =>
  typeof value === 'number' ? value.toFixed(1) : '0.0'

const EconomyPanel = ({ trade, nation, onClose }: EconomyPanelProps) => {
  const summary = nation.economySummary ?? {
    tradeIncome: 0,
    maintenance: 0,
    blockedRoutes: 0,
    smugglingFactor: 0,
  }

  return (
    <section className="economy-panel" aria-label="Economy and Trade overview">
      <header className="economy-panel__header">
        <div>
          <h2>Economy &amp; Trade</h2>
          <p className="economy-panel__subtitle">
            Monitoring regional prices, routes, and national balances.
          </p>
        </div>
        <button type="button" onClick={onClose} className="economy-panel__close">
          Close
        </button>
      </header>

      <div className="economy-panel__summary">
        <div>
          <h3>Last Turn Balance</h3>
          <p className="economy-panel__figure">+{formatNumber(summary.tradeIncome)}</p>
          <span className="economy-panel__caption">Trade Yield</span>
        </div>
        <div>
          <h3>Route Upkeep</h3>
          <p className="economy-panel__figure">-{formatNumber(summary.maintenance)}</p>
          <span className="economy-panel__caption">Maintenance</span>
        </div>
        <div>
          <h3>Blockades</h3>
          <p className="economy-panel__figure">{summary.blockedRoutes}</p>
          <span className="economy-panel__caption">Active Sea Disruptions</span>
        </div>
        <div>
          <h3>Smuggling</h3>
          <p className="economy-panel__figure">{(summary.smugglingFactor * 100).toFixed(0)}%</p>
          <span className="economy-panel__caption">Blockade Bypass Potential</span>
        </div>
      </div>

      <div className="economy-panel__table" role="table" aria-label="Resource price trends">
        <div className="economy-panel__row economy-panel__row--head" role="row">
          <span role="columnheader">Resource</span>
          <span role="columnheader">Price</span>
          <span role="columnheader">Trend</span>
        </div>
        {RESOURCE_TYPES.map((resource) => (
          <div key={resource} className="economy-panel__row" role="row">
            <span role="cell" className="economy-panel__resource-name">
              {resource}
            </span>
            <span role="cell">{trade.prices[resource]?.toFixed(2) ?? '1.00'}</span>
            <span role="cell" className="economy-panel__spark">
              <svg width="140" height="60" viewBox="0 0 140 100" aria-hidden="true">
                <path d={sparklinePath(trade.history[resource] ?? [])} />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default EconomyPanel
