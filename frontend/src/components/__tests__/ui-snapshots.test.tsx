import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ActionModal from '../ActionModal'
import DiplomacyPanel from '../DiplomacyPanel'
import HUD from '../HUD'
import NotificationStack from '../NotificationStack'
import StatBar from '../StatBar'
import type { DiplomacyMatrix, NationState, NotificationEntry, TerritoryState } from '../../game/types'

const sampleNation = (): NationState => ({
  id: 'rome',
  name: 'Roman Republic',
  description: 'Legions prepared for campaigns across the Mediterranean.',
  territories: ['rome_latium', 'rome_etruria'],
  stats: {
    stability: 72,
    military: 85,
    tech: 63,
    economy: 58,
    crime: 22,
    influence: 48,
    support: 71,
    science: 54,
    laws: 60,
  },
  advantages: ['Disciplined Legions'],
  disadvantages: ['Senatorial Intrigue'],
  armies: [
    { id: 'rome-army-1', territoryId: 'rome_latium', strength: 7 },
    { id: 'rome-army-2', territoryId: 'rome_etruria', strength: 5 },
  ],
  treasury: 90,
})

const rivalNation = (): NationState => ({
  id: 'carthage',
  name: 'Carthage',
  description: 'Maritime traders contesting sea lanes.',
  territories: ['carthage_carthage'],
  stats: {
    stability: 65,
    military: 70,
    tech: 59,
    economy: 80,
    crime: 28,
    influence: 62,
    support: 60,
    science: 50,
    laws: 55,
  },
  advantages: ['Naval Supremacy'],
  disadvantages: ['Mercenary Reliance'],
  armies: [{ id: 'carthage-army-1', territoryId: 'carthage_carthage', strength: 6 }],
  treasury: 85,
})

const sampleTerritories = (): TerritoryState[] => [
  {
    id: 'rome_latium',
    name: 'Latium',
    coordinates: [0, 0],
    terrain: 'plains',
    neighbors: ['rome_etruria', 'carthage_carthage'],
    ownerId: 'rome',
    garrison: 7,
    development: 60,
    unrest: 10,
  },
  {
    id: 'rome_etruria',
    name: 'Etruria',
    coordinates: [1, 0],
    terrain: 'hills',
    neighbors: ['rome_latium', 'carthage_carthage'],
    ownerId: 'rome',
    garrison: 5,
    development: 55,
    unrest: 12,
  },
  {
    id: 'carthage_carthage',
    name: 'Carthage',
    coordinates: [2, 1],
    terrain: 'coastal',
    neighbors: ['rome_latium', 'rome_etruria'],
    ownerId: 'carthage',
    garrison: 6,
    development: 65,
    unrest: 18,
  },
]

const sampleDiplomacy = (): DiplomacyMatrix => ({
  relations: {
    rome: { carthage: -35 },
    carthage: { rome: -35 },
  },
  wars: new Set(['carthage|rome']),
  alliances: new Set<string>(),
  blockades: { 'carthage|rome': 0.4 },
})

const sampleNotifications = (): NotificationEntry[] => [
  { id: '1', message: 'Latium celebrates a festival.', tone: 'positive', timestamp: 1 },
  { id: '2', message: 'Carthaginian corsairs harass traders.', tone: 'negative', timestamp: 2 },
]

describe('UI snapshot coverage', () => {
  it('renders stat bar snapshot', () => {
    const { asFragment } = render(<StatBar label="Military" value={85} tone="stable" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders HUD stat panel snapshot', () => {
    const nation = sampleNation()
    const { asFragment } = render(<HUD nation={nation} treasury={nation.treasury} turn={5} actionsRemaining={2} />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders diplomacy treaty rows snapshot', () => {
    const { asFragment } = render(
      <DiplomacyPanel
        playerNation={sampleNation()}
        nations={[sampleNation(), rivalNation()]}
        diplomacy={sampleDiplomacy()}
      />,
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders army inspector modal snapshot', () => {
    const territories = sampleTerritories()
    const { asFragment } = render(
      <ActionModal
        actionType="MoveArmy"
        onClose={() => undefined}
        onConfirm={() => undefined}
        nations={[sampleNation(), rivalNation()]}
        territories={territories}
        playerNationId="rome"
        selectedTerritoryId="rome_latium"
      />,
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders notification panel snapshot', () => {
    const { asFragment } = render(<NotificationStack notifications={sampleNotifications()} />)
    expect(asFragment()).toMatchSnapshot()
  })
})
