import { useMemo, useState } from 'react'
import type { NationDefinition } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import './NationSelect.css'

interface NationSelectProps {
  nations: NationDefinition[]
  onSelect: (nationId: string) => void
}

export const NationSelect = ({ nations, onSelect }: NationSelectProps) => {
  const { t } = useTranslation()
  const [hoveredNation, setHoveredNation] = useState<string | null>(null)
  const orderedNations = useMemo(() => nations.slice().sort((a, b) => a.name.localeCompare(b.name)), [nations])

  return (
    <div className="nation-select">
      <header>
        <h1>{t('nationSelect.title')}</h1>
        <p>{t('nationSelect.subtitle')}</p>
      </header>
      <div className="nation-select__grid">
        {orderedNations.map((nation) => (
          <button
            key={nation.id}
            type="button"
            className="nation-card"
            onClick={() => onSelect(nation.id)}
            onMouseEnter={() => setHoveredNation(nation.id)}
            onMouseLeave={() => setHoveredNation(null)}
          >
            <div className="nation-card__crest">{nation.name.slice(0, 2)}</div>
            <div className="nation-card__body">
              <h2>{nation.name}</h2>
              <p>{nation.description}</p>
              <div className="nation-card__tags">
                <span>
                  {nation.territories.length} {t('nationSelect.territories')}
                </span>
                <span>
                  {t('nationSelect.stabilityLabel')} {nation.stats.stability}
                </span>
              </div>
            </div>
            {hoveredNation === nation.id && (
              <div className="nation-card__tooltip">
                <strong>{t('nationSelect.advantages')}</strong>
                <ul>
                  {nation.advantages.map((advantage) => (
                    <li key={advantage}>{advantage}</li>
                  ))}
                </ul>
                <strong>{t('nationSelect.disadvantages')}</strong>
                <ul>
                  {nation.disadvantages.map((disadvantage) => (
                    <li key={disadvantage}>{disadvantage}</li>
                  ))}
                </ul>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default NationSelect
