import { useMemo } from 'react'
import type { NationState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import Tooltip from './Tooltip'
import './CourtIntriguePanel.css'

interface CourtIntriguePanelProps {
  nation: NationState
}

const factionNames = ['Senate', 'Merchant Guild', 'War Council', 'Scholars']

const CourtIntriguePanel = ({ nation }: CourtIntriguePanelProps) => {
  const { t } = useTranslation()
  const factions = useMemo(() => {
    if (!nation.stats.influence) return []
    return factionNames.map((name, index) => ({
      id: name,
      influence: Math.max(10, (nation.stats.influence ?? 0) - index * 5),
      risk: Math.min(100, 30 + index * 12),
    }))
  }, [nation.stats.influence])

  return (
    <section className="panel court-panel" aria-labelledby="court-panel-title">
      <header className="panel__header">
        <h3 id="court-panel-title">{t('court.title')}</h3>
      </header>
      {factions.length === 0 ? (
        <p className="court-panel__empty">{t('court.noFactions')}</p>
      ) : (
        <ul className="court-panel__list">
          {factions.map((faction) => (
            <li key={faction.id} className="court-panel__item">
              <div>
                <strong>{faction.id}</strong>
                <p className="court-panel__meta">
                  {t('court.influence')}: {faction.influence}%
                </p>
              </div>
              <Tooltip
                align="right"
                content={
                  <p>
                    {t('court.risks')}: {faction.risk}% — {t('court.influence')}: {faction.influence}%
                  </p>
                }
              >
                <div className="court-panel__risk" aria-label={`${t('court.risks')} ${faction.risk}%`}>
                  <span style={{ width: `${faction.risk}%` }} />
                </div>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CourtIntriguePanel
