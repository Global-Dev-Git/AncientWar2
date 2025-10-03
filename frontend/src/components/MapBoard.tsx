import type { CSSProperties } from 'react'
import type { NationState, TerritoryState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import './MapBoard.css'

interface MapBoardProps {
  territories: TerritoryState[]
  nations: Record<string, NationState>
  selectedTerritoryId?: string
  onSelect: (territoryId: string) => void
  mode: 'political' | 'stability' | 'economic'
}

type CSSCustomProperties = CSSProperties & Record<`--${string}`, string | number>

export const MapBoard = ({ territories, nations, selectedTerritoryId, onSelect, mode }: MapBoardProps) => {
  const { t } = useTranslation()
  const rows = Math.max(...territories.map((territory) => territory.coordinates[0])) + 1
  const cols = Math.max(...territories.map((territory) => territory.coordinates[1])) + 1

  const boardStyle: CSSProperties = {
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  }

  return (
    <div className={`map-board map-board--${mode}`} style={boardStyle}>
      {territories.map((territory) => {
        const nation = nations[territory.ownerId]
        const stability = nation?.stats.stability ?? 50
        const stabilityOpacity = Math.min(0.85, Math.max(0.25, stability / 120))
        const development = Math.min(100, Math.max(0, territory.development))
        const tileStyle: CSSCustomProperties = {
          gridRow: territory.coordinates[0] + 1,
          gridColumn: territory.coordinates[1] + 1,
          '--tile-color': `var(--nation-${territory.ownerId ?? 'neutral'})`,
          '--stability-opacity': stabilityOpacity,
          '--economic-strength': development / 100,
        }
        return (
          <button
            key={territory.id}
            type="button"
            className={`map-tile ${selectedTerritoryId === territory.id ? 'map-tile--selected' : ''}`}
            style={tileStyle}
            onClick={() => onSelect(territory.id)}
          >
            <span className="map-tile__name">{territory.name}</span>
            <span className="map-tile__owner">{nation?.name ?? t('map.unclaimed')}</span>
            <div className="map-tile__meta">
              <span>
                {t('map.garrison')} {territory.garrison}
              </span>
              <span>
                {t('map.development')} {territory.development}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MapBoard
