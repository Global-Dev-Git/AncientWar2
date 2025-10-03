import type { NationState, TerritoryState, TradeRoute } from '../game/types'
import './MapBoard.css'

interface MapBoardProps {
  territories: TerritoryState[]
  nations: Record<string, NationState>
  selectedTerritoryId?: string
  onSelect: (territoryId: string) => void
  mode: 'political' | 'stability'
  economyOverlay?: {
    blockadedTerritories: Set<string>
    tradeRoutes: TradeRoute[]
  }
}

const nationPalette: Record<string, string> = {
  rome: '#f25d52',
  carthage: '#f2b950',
  egypt: '#f2d479',
  minoa: '#6fc2ff',
  hittites: '#b77cf2',
  assyria: '#ff8ab5',
  akkad: '#ff9a62',
  medes: '#8bd88f',
  harappa: '#4ec9b0',
  shang: '#8aa5ff',
  scythia: '#4c90ff',
}

export const MapBoard = ({ territories, nations, selectedTerritoryId, onSelect, mode, economyOverlay }: MapBoardProps) => {
  const rows = Math.max(...territories.map((territory) => territory.coordinates[0])) + 1
  const cols = Math.max(...territories.map((territory) => territory.coordinates[1])) + 1

  return (
    <div className={`map-board map-board--${mode}`} style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {territories.map((territory) => {
        const nation = nations[territory.ownerId]
        const color = nationPalette[territory.ownerId] ?? '#888'
        const stability = nation?.stats.stability ?? 50
        const stabilityOpacity = Math.min(0.85, Math.max(0.25, stability / 120))
        const isBlockaded = economyOverlay?.blockadedTerritories.has(territory.id)
        const linkedRoutes = economyOverlay
          ? economyOverlay.tradeRoutes.filter((route) => route.from === territory.id || route.to === territory.id)
          : []
        return (
          <button
            key={territory.id}
            type="button"
            className={`map-tile ${selectedTerritoryId === territory.id ? 'map-tile--selected' : ''} ${
              isBlockaded ? 'map-tile--blockaded' : ''
            }`}
            style={{
              gridRow: territory.coordinates[0] + 1,
              gridColumn: territory.coordinates[1] + 1,
              background: mode === 'political' ? `linear-gradient(135deg, ${color}aa, ${color})` : `linear-gradient(135deg, rgba(88, 134, 255, ${stabilityOpacity}), rgba(59, 84, 182, ${stabilityOpacity + 0.15}))`,
              borderColor: color,
            }}
            onClick={() => onSelect(territory.id)}
          >
            {isBlockaded && <span className="map-tile__badge">Blockaded</span>}
            <span className="map-tile__name">{territory.name}</span>
            <span className="map-tile__owner">{nation?.name ?? 'Unclaimed'}</span>
            <div className="map-tile__meta">
              <span>Garrison {territory.garrison}</span>
              <span>Dev {territory.development}</span>
            </div>
            {linkedRoutes.length > 0 && (
              <div className="map-tile__trade">Routes {linkedRoutes.length}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default MapBoard
