import type { NationState, TerritoryState, VisibilityState } from '../game/types'
import './MapBoard.css'

interface MapBoardProps {
  territories: TerritoryState[]
  nations: Record<string, NationState>
  visibility: Record<string, VisibilityState>
  playerNationId: string
  selectedTerritoryId?: string
  onSelect: (territoryId: string) => void
  mode: 'political' | 'stability' | 'supply'
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

const supplyPalette = {
  supplied: '#4ec9b0',
  strained: '#f2b950',
  exhausted: '#f25d52',
} as const

export const MapBoard = ({
  territories,
  nations,
  visibility,
  playerNationId,
  selectedTerritoryId,
  onSelect,
  mode,
}: MapBoardProps) => {
  const { rows, cols } = territories.reduce(
    (acc, territory) => {
      const [row, col] = territory.coordinates
      return {
        rows: Math.max(acc.rows, row + 1),
        cols: Math.max(acc.cols, col + 1),
      }
    },
    { rows: 0, cols: 0 },
  )

  const gridRows = Math.max(1, rows)
  const gridCols = Math.max(1, cols)

  if (territories.length === 0) {
    return (
      <div className={`map-board map-board--${mode} map-board--empty`}>
        <span className="map-board__empty">No territories loaded.</span>
      </div>
    )
  }

  return (
    <div
      className={`map-board map-board--${mode}`}
      style={{ gridTemplateRows: `repeat(${gridRows}, 1fr)`, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
    >
      {territories.map((territory) => {
        const nation = nations[territory.ownerId]
        const color = nationPalette[territory.ownerId] ?? '#888'
        const stability = nation?.stats.stability ?? 50
        const stabilityOpacity = Math.min(0.85, Math.max(0.25, stability / 120))
        const tileVisibility = visibility[territory.id] ?? territory.visibility[playerNationId] ?? 'hidden'
        const isHidden = tileVisibility === 'hidden'
        const isFogged = tileVisibility === 'fogged'
        const supplyColor = supplyPalette[territory.supplyState] ?? '#6c8099'
        const baseBackground = `linear-gradient(135deg, ${color}aa, ${color})`
        const stabilityBackground = `linear-gradient(135deg, rgba(88, 134, 255, ${stabilityOpacity}), rgba(59, 84, 182, ${Math.min(1, stabilityOpacity + 0.15)}))`
        const supplyBackground = `linear-gradient(135deg, ${supplyColor}bb, ${supplyColor})`
        const hiddenBackground = 'linear-gradient(135deg, rgba(22, 24, 34, 0.95), rgba(9, 12, 18, 0.98))'
        const background = isHidden
          ? hiddenBackground
          : mode === 'stability'
          ? stabilityBackground
          : mode === 'supply'
          ? supplyBackground
          : baseBackground
        const tileClasses = [
          'map-tile',
          selectedTerritoryId === territory.id ? 'map-tile--selected' : '',
          isHidden ? 'map-tile--hidden' : '',
          isFogged ? 'map-tile--fogged' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const ownerName = isHidden ? 'Unknown' : nation?.name ?? 'Unclaimed'
        const unitLabel = isHidden ? '??' : territory.unitCount
        const moraleLabel = isHidden ? '??' : territory.morale
        const supplyLabel = isHidden ? '??' : `${territory.supplyState} (${territory.supply})`
        const siegeLabel = isHidden ? '??' : `${territory.siegeProgress}%`
        return (
          <button
            key={territory.id}
            type="button"
            className={tileClasses}
            style={{
              gridRow: territory.coordinates[0] + 1,
              gridColumn: territory.coordinates[1] + 1,
              background,
              borderColor: isHidden ? '#1f2533' : color,
              opacity: isHidden ? 0.9 : 1,
            }}
            onClick={() => onSelect(territory.id)}
          >
            <span className="map-tile__name">{territory.name}</span>
            <span className="map-tile__owner">{ownerName}</span>
            <div className="map-tile__meta">
              <span>Units {unitLabel}</span>
              <span>Morale {moraleLabel}</span>
            </div>
            <div className="map-tile__meta map-tile__meta--secondary">
              <span>Supply {supplyLabel}</span>
              <span>Siege {siegeLabel}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MapBoard
