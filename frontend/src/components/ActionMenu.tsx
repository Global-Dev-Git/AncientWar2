import { useMemo, type ReactNode } from 'react'
import { Lightning, Coins, Scroll, Sword, UsersThree, ShieldCheck, ArrowsCounterClockwise, Handshake, Target, Eye, Barricade } from '@phosphor-icons/react'
import type { ActionType } from '../game/types'
import { ACTION_LABELS } from '../game/constants'
import { useTranslation } from '../contexts/TranslationContext'
import './ActionMenu.css'

interface ActionMenuProps {
  onSelect: (action: ActionType) => void
  actionsRemaining: number
}

const actionIcons: Record<ActionType, ReactNode> = {
  InvestInTech: <Lightning weight="bold" />,
  RecruitArmy: <ShieldCheck weight="bold" />,
  MoveArmy: <ArrowsCounterClockwise weight="bold" />,
  CollectTaxes: <Coins weight="bold" />,
  PassLaw: <Scroll weight="bold" />,
  Spy: <Eye weight="bold" />,
  DiplomacyOffer: <Handshake weight="bold" />,
  DeclareWar: <Sword weight="bold" />,
  FormAlliance: <UsersThree weight="bold" />,
  Bribe: <Target weight="bold" />,
  SuppressCrime: <Barricade weight="bold" />,
}

export const ActionMenu = ({ onSelect, actionsRemaining }: ActionMenuProps) => {
  const { t } = useTranslation()
  const actionList = useMemo(() => Object.keys(ACTION_LABELS) as ActionType[], [])

  return (
    <div className="action-menu">
      <header>
        <h3>{t('actionMenu.title')}</h3>
        <span>
          {actionsRemaining} {t('actionMenu.remaining')}
        </span>
      </header>
      <div className="action-menu__grid">
        {actionList.map((actionType) => (
          <button
            key={actionType}
            type="button"
            className="action-card"
            onClick={() => onSelect(actionType)}
          >
            <div className="action-card__icon">{actionIcons[actionType]}</div>
            <div className="action-card__body">
              <strong>{t(`actions.label.${actionType}` as const)}</strong>
              <p>{t(`actions.description.${actionType}` as const)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ActionMenu
