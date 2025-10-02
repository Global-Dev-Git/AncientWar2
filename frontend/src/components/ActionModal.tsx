import { useEffect, useMemo, useState } from 'react'
import type { ActionType, NationState, PlayerAction, TerritoryState } from '../game/types'
import { ACTION_LABELS } from '../game/constants'
import './ActionModal.css'

interface ActionModalProps {
  actionType: ActionType | null
  onClose: () => void
  onConfirm: (action: PlayerAction) => void
  nations: NationState[]
  territories: TerritoryState[]
  playerNationId: string
  selectedTerritoryId?: string
}

const needsTargetNation: ActionType[] = ['Spy', 'DiplomacyOffer', 'DeclareWar', 'FormAlliance', 'Bribe']
const needsSourceTerritory: ActionType[] = ['RecruitArmy', 'MoveArmy']

const describeEffect = (action: ActionType): string => {
  switch (action) {
    case 'InvestInTech':
      return 'Spend coin to gain technology and science.'
    case 'RecruitArmy':
      return 'Raise garrison strength in the selected territory.'
    case 'MoveArmy':
      return 'Shift troops to friendly lands or attack adjacent enemies.'
    case 'CollectTaxes':
      return 'Gain treasury income, but crime will rise.'
    case 'PassLaw':
      return 'Improve laws and stability, with cultural side effects.'
    case 'Spy':
      return 'Destabilise a rival and raise their crime.'
    case 'DiplomacyOffer':
      return 'Improve relations; special bonuses for maritime deals.'
    case 'DeclareWar':
      return 'Begin open conflict. Stability will drop.'
    case 'FormAlliance':
      return 'Form a mutual defense pact and boost relations.'
    case 'Bribe':
      return 'Buy influence at the cost of coin and their integrity.'
    case 'SuppressCrime':
      return 'Reduce crime but lose a little support.'
    default:
      return ''
  }
}

export const ActionModal = ({
  actionType,
  onClose,
  onConfirm,
  nations,
  territories,
  playerNationId,
  selectedTerritoryId,
}: ActionModalProps) => {
  const [targetNationId, setTargetNationId] = useState<string>('')
  const [sourceTerritoryId, setSourceTerritoryId] = useState<string | undefined>(selectedTerritoryId)
  const [targetTerritoryId, setTargetTerritoryId] = useState<string>('')

  useEffect(() => {
    setTargetNationId('')
    setTargetTerritoryId('')
    setSourceTerritoryId(selectedTerritoryId)
  }, [actionType, selectedTerritoryId])

  const availableNationTargets = useMemo(
    () => nations.filter((nation) => nation.id !== playerNationId),
    [nations, playerNationId],
  )

  const controlledTerritories = useMemo(
    () => territories.filter((territory) => territory.ownerId === playerNationId),
    [territories, playerNationId],
  )

  const neighborOptions = useMemo(() => {
    if (!sourceTerritoryId) return []
    const source = territories.find((territory) => territory.id === sourceTerritoryId)
    if (!source) return []
    return source.neighbors.map((id) => territories.find((territory) => territory.id === id)).filter(Boolean) as TerritoryState[]
  }, [sourceTerritoryId, territories])

  if (!actionType) return null

  const requiresNation = needsTargetNation.includes(actionType)
  const requiresSource = needsSourceTerritory.includes(actionType)
  const requiresTargetTerritory = actionType === 'MoveArmy'

  const canConfirm = () => {
    if (requiresNation && !targetNationId) return false
    if (requiresSource && !sourceTerritoryId) return false
    if (requiresTargetTerritory && !targetTerritoryId) return false
    return true
  }

  const confirm = () => {
    if (!canConfirm()) return
    const payload: PlayerAction = {
      type: actionType,
      targetNationId: targetNationId || undefined,
      sourceTerritoryId,
      targetTerritoryId: targetTerritoryId || undefined,
    }
    onConfirm(payload)
    onClose()
  }

  return (
    <div className="action-modal__backdrop" role="dialog" aria-modal>
      <div className="action-modal">
        <header>
          <h3>{ACTION_LABELS[actionType]}</h3>
          <button type="button" onClick={onClose} aria-label="Close action dialog">
            ✕
          </button>
        </header>
        <p className="action-modal__description">{describeEffect(actionType)}</p>

        {requiresSource && (
          <label className="action-modal__field">
            <span>Source Territory</span>
            <select
              value={sourceTerritoryId ?? ''}
              onChange={(event) => setSourceTerritoryId(event.target.value || undefined)}
            >
              <option value="">Select territory</option>
              {controlledTerritories.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {requiresTargetTerritory && (
          <label className="action-modal__field">
            <span>Target Territory</span>
            <select value={targetTerritoryId} onChange={(event) => setTargetTerritoryId(event.target.value)}>
              <option value="">Select target</option>
              {neighborOptions.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name} — {territory.ownerId === playerNationId ? 'Friendly' : 'Enemy'}
                </option>
              ))}
            </select>
          </label>
        )}

        {requiresNation && (
          <label className="action-modal__field">
            <span>Target Nation</span>
            <select value={targetNationId} onChange={(event) => setTargetNationId(event.target.value)}>
              <option value="">Choose nation</option>
              {availableNationTargets.map((nation) => (
                <option key={nation.id} value={nation.id}>
                  {nation.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!canConfirm()}>
            Confirm
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ActionModal
