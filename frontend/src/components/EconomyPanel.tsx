import { useMemo } from 'react'
import type { NationState, TerritoryState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import Tooltip from './Tooltip'
import './EconomyPanel.css'

interface EconomyPanelProps {
  nation: NationState
  territories: TerritoryState[]
}

const EconomyPanel = ({ nation, territories }: EconomyPanelProps) => {
  const { t } = useTranslation()
  const tradeRoutes = useMemo(() => {
    const totalRoutes = territories.reduce((sum, territory) => sum + territory.neighbors.length, 0)
    const coastal = territories.filter((territory) => territory.terrain === 'coastal').length
    return {
      total: totalRoutes,
      maritime: coastal,
      land: totalRoutes - coastal,
    }
  }, [territories])

  const economyScore = nation.stats.economy ?? 0
  const upkeep = nation.armies.length * 5
  const income = economyScore * 8 + territories.length * 3
  const balance = income - upkeep

  return (
    <section className="panel economy-panel" aria-labelledby="economy-panel-title">
      <header className="panel__header">
        <h3 id="economy-panel-title">{t('economy.title')}</h3>
      </header>
      <div className="economy-panel__grid">
        <div className="economy-panel__stat">
          <Tooltip
            content={
              <p>
                {t('economy.income')} {income.toFixed(1)} — {t('economy.expenses')} {upkeep.toFixed(1)}
              </p>
            }
          >
            <span className="economy-panel__label">{t('economy.income')}</span>
            <strong className="economy-panel__value">{income.toFixed(1)}</strong>
          </Tooltip>
        </div>
        <div className="economy-panel__stat">
          <Tooltip
            content={
              <p>
                {t('economy.expenses')} {upkeep.toFixed(1)} — {t('economy.trade.agreements')} {tradeRoutes.total}
              </p>
            }
          >
            <span className="economy-panel__label">{t('economy.expenses')}</span>
            <strong className="economy-panel__value">{upkeep.toFixed(1)}</strong>
          </Tooltip>
        </div>
        <div className={`economy-panel__balance economy-panel__balance--${balance >= 0 ? 'positive' : 'negative'}`}>
          <span>{balance >= 0 ? '+' : '−'}</span>
          <strong>{Math.abs(balance).toFixed(1)}</strong>
        </div>
      </div>
      <div className="economy-panel__routes">
        <h4>{t('economy.tradeRoutes')}</h4>
        {tradeRoutes.total === 0 ? (
          <p className="economy-panel__empty">{t('economy.noRoutes')}</p>
        ) : (
          <ul>
            <li>
              <span>{t('economy.trade.agreements')}</span>
              <strong>{tradeRoutes.total}</strong>
            </li>
            <li>
              <span>{t('economy.trade.maritime')}</span>
              <strong>{tradeRoutes.maritime}</strong>
            </li>
            <li>
              <span>{t('economy.trade.land')}</span>
              <strong>{tradeRoutes.land}</strong>
            </li>
          </ul>
        )}
      </div>
    </section>
  )
}

export default EconomyPanel
