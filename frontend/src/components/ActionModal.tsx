import { useEffect, useMemo, useState } from 'react'
import type { ActionType, NationState, PlayerAction, TerritoryState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
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

export const ActionModal = ({
  actionType,
  onClose,
  onConfirm,
  nations,
  territories,
  playerNationId,
  selectedTerritoryId,
}: ActionModalProps) => {
  const { t } = useTranslation()
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
          <h3>{t(`actions.label.${actionType}` as const)}</h3>
          <button type="button" onClick={onClose} aria-label={t('help.close')}>
            ✕
          </button>
        </header>
        <p className="action-modal__description">{t(`actions.description.${actionType}` as const)}</p>

        {requiresSource && (
          <label className="action-modal__field">
            <span>{t('actions.sourceTerritory')}</span>
            <select
              value={sourceTerritoryId ?? ''}
              onChange={(event) => setSourceTerritoryId(event.target.value || undefined)}
            >
              <option value="">{t('actions.selectTerritory')}</option>
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
            <span>{t('actions.targetTerritory')}</span>
            <select value={targetTerritoryId} onChange={(event) => setTargetTerritoryId(event.target.value)}>
              <option value="">{t('actions.selectTarget')}</option>
              {neighborOptions.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name} —{' '}
                  {territory.ownerId === playerNationId
                    ? t('actions.ownership.friendly')
                    : t('actions.ownership.enemy')}
                </option>
              ))}
            </select>
          </label>
        )}

        {requiresNation && (
          <label className="action-modal__field">
            <span>{t('actions.targetNation')}</span>
            <select value={targetNationId} onChange={(event) => setTargetNationId(event.target.value)}>
              <option value="">{t('actions.chooseNation')}</option>
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
            {t('actionModal.cancel')}
          </button>
          <button type="button" onClick={confirm} disabled={!canConfirm()}>
            {t('actionModal.confirm')}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ActionModal
