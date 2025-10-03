import type { TerrainType } from './types'

export const TERRAIN_MODIFIERS: Record<TerrainType, number> = {
  plains: 1,
  hills: 1.05,
  mountain: 1.1,
  river: 1.08,
  coastal: 0.95,
  steppe: 1,
  desert: 0.9,
}

export const TERRAIN_MOVEMENT_COST: Record<TerrainType, number> = {
  plains: 1,
  hills: 2,
  mountain: 3,
  river: 2,
  coastal: 1,
  steppe: 1,
  desert: 2,
}

export const ZOC_SUPPLY_PENALTY = 8

export const SUPPLY_STATE_THRESHOLDS = {
  supplied: 70,
  strained: 40,
}

export const ACTION_LABELS = {
  InvestInTech: 'Invest in Technology',
  RecruitArmy: 'Recruit Army',
  MoveArmy: 'Move Army',
  CollectTaxes: 'Collect Taxes',
  PassLaw: 'Pass Law',
  Spy: 'Conduct Espionage',
  DiplomacyOffer: 'Diplomacy Offer',
  DeclareWar: 'Declare War',
  FormAlliance: 'Form Alliance',
  Bribe: 'Bribe Officials',
  SuppressCrime: 'Suppress Crime',
} as const

export const ARMY_MIN_STRENGTH = 1

export const ACTION_SHORTCUTS: Record<string, string> = {
  endTurn: 'e',
  toggleMapMode: 'm',
  openActions: 'a',
  openDiplomacy: 'd',
}
