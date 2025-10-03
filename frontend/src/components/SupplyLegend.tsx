import './SupplyLegend.css'

const entries = [
  { state: 'Supplied', description: 'Abundant stockpiles ensure peak readiness.', tone: 'supplied' },
  { state: 'Strained', description: 'Logistics are thin; combat power is reduced.', tone: 'strained' },
  { state: 'Exhausted', description: 'Armies risk collapse without resupply.', tone: 'exhausted' },
]

export const SupplyLegend = () => (
  <aside className="supply-legend">
    <h4>Supply Overlay</h4>
    <ul>
      {entries.map((entry) => (
        <li key={entry.tone} className={`supply-legend__entry supply-legend__entry--${entry.tone}`}>
          <span className="supply-legend__swatch" />
          <div>
            <strong>{entry.state}</strong>
            <p>{entry.description}</p>
          </div>
        </li>
      ))}
    </ul>
  </aside>
)

export default SupplyLegend
