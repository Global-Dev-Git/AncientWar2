import type { CSSProperties } from 'react'
import type { NationState, TerritoryState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import './MiniMap.css'

interface MiniMapProps {
  territories: TerritoryState[]
  nations: Record<string, NationState>
  selectedTerritoryId?: string
  onSelect: (territoryId: string) => void
}

const MiniMap = ({ territories, nations, selectedTerritoryId, onSelect }: MiniMapProps) => {
  const { t } = useTranslation()

  return (
    <section className="panel minimap" aria-labelledby="minimap-title">
      <header className="panel__header">
        <h3 id="minimap-title">{t('minimap.title')}</h3>
      </header>
      <div className="minimap__grid" role="list">
        {territories.map((territory) => {
          const owner = nations[territory.ownerId]
          return (
            <button
              type="button"
              key={territory.id}
              className={`minimap__cell ${territory.id === selectedTerritoryId ? 'is-selected' : ''}`}
              style={{
                '--owner-color': `var(--nation-${owner?.id ?? 'neutral'})`,
              } as CSSProperties}
              onClick={() => onSelect(territory.id)}
            >
              <span className="sr-only">{territory.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default MiniMap
