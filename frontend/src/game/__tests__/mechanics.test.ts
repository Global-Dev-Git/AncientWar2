import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TECH_TREE,
  advanceSiegeProgress,
  applyBlockade,
  calculateFactionInfluence,
  calculateIntrigueOdds,
  calculateSupplyPenalty,
  calculateTradePrice,
  calculateTreatyPenalty,
  canResearchTech,
  getBlockadeLevel,
  getMissingTechPrerequisites,
  isIronmanActionAllowed,
} from '../mechanics'
import { RandomGenerator } from '../random'
import type { DiplomacyMatrix, Treaty } from '../types'
import { getBlockadeSeverity, setBlockade } from '../utils'

const createDiplomacy = (): DiplomacyMatrix => ({
  relations: {},
  wars: new Set(),
  alliances: new Set(),
  blockades: {},
})

describe('economy and logistics mechanics', () => {
  it('applies trade price adjustments from influence, treaties, supply and blockades', () => {
    const price = calculateTradePrice(100, {
      influence: 70,
      blockadeLevel: 0.5,
      supplyPenalty: 0.2,
      treatyModifier: -0.15,
      techLevel: 80,
      scarcity: 0.1,
    })
    expect(price).toBeCloseTo(62, 1)

    const cheaper = calculateTradePrice(100, {
      influence: 90,
      treatyModifier: -0.2,
      techLevel: 95,
    })
    expect(cheaper).toBeLessThan(price)
  })

  it('tracks blockade state and symmetry', () => {
    const diplomacy = createDiplomacy()
    expect(getBlockadeSeverity(diplomacy, 'rome', 'carthage')).toBe(0)
    applyBlockade(diplomacy, 'rome', 'carthage', 0.6)
    expect(getBlockadeLevel(diplomacy, 'rome', 'carthage')).toBeCloseTo(0.6, 5)
    expect(getBlockadeSeverity(diplomacy, 'carthage', 'rome')).toBeCloseTo(0.6, 5)
    applyBlockade(diplomacy, 'rome', 'carthage', 0)
    expect(getBlockadeSeverity(diplomacy, 'rome', 'carthage')).toBe(0)
  })

  it('calculates supply penalties from attrition factors', () => {
    const lightPenalty = calculateSupplyPenalty({ distance: 2, support: 80 })
    const heavyPenalty = calculateSupplyPenalty({
      distance: 5,
      support: 40,
      terrainDifficulty: 0.15,
      weatherSeverity: 0.2,
      blockadeLevel: 0.7,
    })
    expect(lightPenalty).toBeLessThan(heavyPenalty)
    expect(heavyPenalty).toBeCloseTo(0.75, 2)
  })

  it('advances siege progress with diminishing returns', () => {
    const firstTick = advanceSiegeProgress(0.25, 9, 6, 0.2)
    const stalledTick = advanceSiegeProgress(0.8, 4, 8, 0.7)
    expect(firstTick).toBeGreaterThan(0.25)
    expect(stalledTick).toBeLessThan(0.9)
  })
})

describe('intrigue and influence calculations', () => {
  it('derives intrigue odds from skills, relations and blockades', () => {
    const odds = calculateIntrigueOdds({
      spySkill: 65,
      targetSecurity: 45,
      relations: -20,
      support: 70,
      blockadeLevel: 0.3,
    })
    expect(odds).toBeGreaterThan(0.5)

    const difficult = calculateIntrigueOdds({
      spySkill: 30,
      targetSecurity: 70,
      relations: 40,
      support: 40,
    })
    expect(difficult).toBeLessThan(0.3)
  })

  it('aggregates faction influence from prestige, wonders and crises', () => {
    const influence = calculateFactionInfluence({
      baseInfluence: 35,
      prestige: 4,
      wonders: 1,
      treatyNetwork: 3,
      propaganda: 5,
      blockadesBroken: 2,
      intrigueVictories: 3,
      crises: 1,
    })
    expect(influence).toBeCloseTo(57.75, 2)
  })

  it('applies diplomacy treaty penalties with conflicts and rivalries', () => {
    const existing: Treaty[] = [
      { type: 'trade', partner: 'minoa', exclusivity: true },
      { type: 'defense', partner: 'egypt' },
    ]
    const penalty = calculateTreatyPenalty(existing, {
      type: 'trade',
      partner: 'carthage',
      exclusivity: true,
    }, {
      relationScore: -30,
      rivalPartners: ['carthage'],
      recentlyBrokeTreaty: true,
    })
    expect(penalty).toBeCloseTo(80, 0)

    const renewal = calculateTreatyPenalty(existing, {
      type: 'trade',
      partner: 'minoa',
      exclusivity: true,
    })
    expect(renewal).toBe(0)
  })
})

describe('technology prerequisites and ironman restrictions', () => {
  it('returns missing tech prerequisites transitively', () => {
    const owned = new Set(['BronzeWorking', 'Irrigation'])
    const missing = getMissingTechPrerequisites(owned, 'SiegeMasters', DEFAULT_TECH_TREE)
    expect(missing).toContain('SiegeEngineering')
    expect(missing).toContain('IronWorking')
    expect(canResearchTech(new Set([...owned, 'SiegeEngineering', 'IronWorking']), 'SiegeMasters')).toBe(true)
  })

  it('enforces ironman restrictions on manual saves and undo', () => {
    expect(
      isIronmanActionAllowed({ ironman: true, action: 'manualSave' }),
    ).toMatchObject({ allowed: false })
    expect(
      isIronmanActionAllowed({ ironman: true, action: 'reload', hasAutoSave: false }).allowed,
    ).toBe(false)
    expect(isIronmanActionAllowed({ ironman: true, action: 'autoSave' }).allowed).toBe(true)
    expect(isIronmanActionAllowed({ ironman: false, action: 'manualSave' }).allowed).toBe(true)
  })
})

describe('random seed determinism', () => {
  it('produces deterministic sequences for identical seeds', () => {
    const a = new RandomGenerator(42)
    const b = new RandomGenerator(42)
    const sequenceA = [a.next(), a.next(), a.nextInRange(0, 10)]
    const sequenceB = [b.next(), b.next(), b.nextInRange(0, 10)]
    expect(sequenceA).toEqual(sequenceB)

    const cloned = a.clone()
    expect(cloned.next()).toBeCloseTo(b.next(), 10)
  })
})

describe('legacy blockade helper compatibility', () => {
  it('retains compatibility with utils setBlockade helper', () => {
    const diplomacy = createDiplomacy()
    setBlockade(diplomacy, 'rome', 'carthage', 0.4)
    expect(getBlockadeLevel(diplomacy, 'rome', 'carthage')).toBeCloseTo(0.4, 5)
    setBlockade(diplomacy, 'rome', 'carthage', -1)
    expect(getBlockadeLevel(diplomacy, 'rome', 'carthage')).toBe(0)
  })
})
