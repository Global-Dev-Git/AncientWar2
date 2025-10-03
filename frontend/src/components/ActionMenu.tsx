import { useMemo, type ReactElement } from 'react'
import { Lightning, Coins, Scroll, Sword, UsersThree, ShieldCheck, ArrowsCounterClockwise, Handshake, Target, Eye, Barricade } from '@phosphor-icons/react'
import type { ActionType } from '../game/types'
import { ACTION_LABELS } from '../game/constants'
import './ActionMenu.css'

interface ActionMenuProps {
  onSelect: (action: ActionType) => void
  actionsRemaining: number
}

const actionIcons: Record<ActionType, ReactElement> = {
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

const actionDescriptions: Record<ActionType, string> = {
  InvestInTech: 'Boost science and technology at the cost of coin.',
  RecruitArmy: 'Raise fresh troops within a controlled territory.',
  MoveArmy: 'Redeploy armies or assault a neighboring region.',
  CollectTaxes: 'Extract revenues and risk growing unrest.',
  PassLaw: 'Stabilize society through new legislation.',
  Spy: 'Disrupt an opponent with covert agents.',
  DiplomacyOffer: 'Improve relations via gifts and emissaries.',
  DeclareWar: 'Begin open conflict with a rival state.',
  FormAlliance: 'Bind another nation in mutual defense.',
  Bribe: 'Influence leaders through clandestine payments.',
  SuppressCrime: 'Deploy forces internally to lower crime.',
}

export const ActionMenu = ({ onSelect, actionsRemaining }: ActionMenuProps) => {
  const actionList = useMemo(() => Object.keys(ACTION_LABELS) as ActionType[], [])

  return (
    <div className="action-menu">
      <header>
        <h3>Actions</h3>
        <span>{actionsRemaining} left</span>
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
              <strong>{ACTION_LABELS[actionType]}</strong>
              <p>{actionDescriptions[actionType]}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ActionMenu
