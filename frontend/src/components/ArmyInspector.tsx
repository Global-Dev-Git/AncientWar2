import type {
  DiplomacyMatrix,
  NationState,
  TerritoryState,
  VisibilityState,
} from '../game/types'
import { isAtWar } from '../game/utils'
import './ArmyInspector.css'

interface ArmyInspectorProps {
  territory?: TerritoryState
  owner?: NationState | null
  territories: Record<string, TerritoryState>
  playerNationId: string
  diplomacy: DiplomacyMatrix
  visibility: VisibilityState
}

const visibilityLabels: Record<VisibilityState, string> = {
  hidden: 'Hidden',
  fogged: 'Scouted',
  visible: 'Visible',
}

export const ArmyInspector = ({
  territory,
  owner,
  territories,
  playerNationId,
  diplomacy,
  visibility,
}: ArmyInspectorProps) => {
  if (!territory) {
    return (
      <section className="army-inspector">
        <header>
          <h3>Army Inspector</h3>
          <span className="army-inspector__status">No territory selected</span>
        </header>
        <p className="army-inspector__placeholder">Select a territory to review its garrison readiness.</p>
      </section>
    )
  }

  const isHidden = visibility === 'hidden'
  const isFogged = visibility === 'fogged'
  const ownerName = owner?.name ?? 'Unclaimed'
  const formatNumeric = (value: number | string): string => {
    if (isHidden) return 'Unknown'
    if (isFogged && typeof value === 'number') {
      return `~${value}`
    }
    return String(value)
  }

  const contested = territory.neighbors.some((neighborId) => {
    const neighbor = territories[neighborId]
    if (!neighbor) return false
    if (neighbor.ownerId === territory.ownerId) return false
    if (territory.ownerId === playerNationId) {
      return isAtWar(diplomacy, territory.ownerId, neighbor.ownerId)
    }
    if (neighbor.ownerId === playerNationId) {
      return isAtWar(diplomacy, playerNationId, territory.ownerId)
    }
    return false
  })

  const supplyTone = isHidden ? 'unknown' : territory.supplyState

  return (
    <section className="army-inspector">
      <header>
        <h3>{territory.name}</h3>
        <span className="army-inspector__status">{visibilityLabels[visibility]}</span>
      </header>
      <dl>
        <div>
          <dt>Owner</dt>
          <dd>{isHidden ? 'Unknown' : ownerName}</dd>
        </div>
        <div>
          <dt>Units</dt>
          <dd>{formatNumeric(territory.unitCount)}</dd>
        </div>
        <div>
          <dt>Combat Strength</dt>
          <dd>{formatNumeric(territory.garrison)}</dd>
        </div>
        <div>
          <dt>Morale</dt>
          <dd>{formatNumeric(territory.morale)}</dd>
        </div>
        <div className={`army-inspector__supply army-inspector__supply--${supplyTone}`}>
          <dt>Supply</dt>
          <dd>
            {isHidden ? 'Unknown' : `${territory.supplyState.toUpperCase()} (${territory.supply})`}
          </dd>
        </div>
        <div>
          <dt>Siege Progress</dt>
          <dd>{formatNumeric(`${territory.siegeProgress}%`)}</dd>
        </div>
        <div>
          <dt>Terrain</dt>
          <dd>{territory.terrain}</dd>
        </div>
        <div>
          <dt>Zone of Control</dt>
          <dd>{contested ? 'Contested' : 'Secure'}</dd>
        </div>
      </dl>
    </section>
  )
}

export default ArmyInspector
