import { useEffect, useMemo, useState } from 'react'
import type { ActionType, NationState, PlayerAction, TerritoryState } from '../game/types'
import { ACTION_LABELS } from '../game/constants'
import { calculateIntrigueChance, isIntrigueAction } from '../game/intrigue'
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

const needsTargetNation: ActionType[] = [
  'Spy',
  'DiplomacyOffer',
  'DeclareWar',
  'FormAlliance',
  'Bribe',
  'Assassinate',
  'StealTech',
  'FomentRevolt',
]
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
      return 'Buy influence and destabilise a rival court.'
    case 'Purge':
      return 'Remove disloyal courtiers to restore internal order.'
    case 'Assassinate':
      return 'Attempt to eliminate a powerful figure within another nation.'
    case 'StealTech':
      return 'Deploy agents to steal cutting-edge discoveries.'
    case 'FomentRevolt':
      return 'Encourage unrest in a rival territory to sap their stability.'
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

  const playerNation = useMemo(
    () => nations.find((nation) => nation.id === playerNationId),
    [nations, playerNationId],
  )

  const targetNation = useMemo(
    () => (targetNationId ? nations.find((nation) => nation.id === targetNationId) : undefined),
    [nations, targetNationId],
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
  const intriguePreview = useMemo(() => {
    if (!playerNation || !isIntrigueAction(actionType)) return null
    if (requiresNation && !targetNation) return null
    const targetForRoll = actionType === 'Purge' ? playerNation : targetNation
    return calculateIntrigueChance(actionType, playerNation, targetForRoll)
  }, [actionType, playerNation, targetNation, requiresNation])

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

        {isIntrigueAction(actionType) && intriguePreview !== null && (
          <div className="action-modal__odds">
            <strong>Success chance:</strong>
            <span>{Math.round(intriguePreview * 100)}%</span>
          </div>
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
