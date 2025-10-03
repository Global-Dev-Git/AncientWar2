import type {
  ActionType,
  CharacterState,
  GameConfig,
  NationState,
} from './types'
import { gameConfig } from './data'

const ACTION_FOCUS: Partial<Record<ActionType, CharacterState['expertise']>> = {
  BribeAdvisor: 'economy',
  Purge: 'intrigue',
  Assassinate: 'military',
  StealTech: 'intrigue',
  FomentRevolt: 'intrigue',
}

const DEFENSIVE_FOCUS: Partial<Record<ActionType, CharacterState['expertise']>> = {
  Assassinate: 'military',
  StealTech: 'intrigue',
  FomentRevolt: 'intrigue',
}

const TRAIT_SYNERGIES: Partial<Record<ActionType, CharacterState['traits'][number]>> = {
  BribeAdvisor: 'Cunning',
  Purge: 'Scholar',
  Assassinate: 'Brave',
  StealTech: 'Scholar',
  FomentRevolt: 'Cunning',
}

const getCharactersByFocus = (
  nation: NationState,
  focus: CharacterState['expertise'],
): CharacterState[] =>
  nation.characters.filter((character) => character.expertise === focus)

export const findSpecialist = (
  nation: NationState,
  focus: CharacterState['expertise'],
): CharacterState | undefined =>
  getCharactersByFocus(nation, focus).sort((a, b) => b.loyalty - a.loyalty)[0]

export const calculateIntrigueChance = (
  action: ActionType,
  actor: NationState,
  target?: NationState,
  config: GameConfig = gameConfig,
): number => {
  const focus = ACTION_FOCUS[action]
  let chance = config.intrigueBaseSuccess + actor.stats.influence / 200

  if (focus) {
    const specialist = findSpecialist(actor, focus)
    if (specialist) {
      chance += specialist.loyalty / 200
      const synergyTrait = TRAIT_SYNERGIES[action]
      if (synergyTrait && specialist.traits.includes(synergyTrait)) {
        chance += config.intrigueTraitBonus
      }
    }
  }

  if (target) {
    chance -= target.stats.stability / 250
    const defensiveFocus = DEFENSIVE_FOCUS[action]
    if (defensiveFocus) {
      const defender = findSpecialist(target, defensiveFocus)
      if (defender) {
        chance -= defender.loyalty / 300
        const synergyTrait = TRAIT_SYNERGIES[action]
        if (synergyTrait && defender.traits.includes(synergyTrait)) {
          chance -= config.intrigueTraitBonus / 2
        }
      }
    }
  }

  const upperBound = 0.85
  const lowerBound = 0.15
  return Math.max(lowerBound, Math.min(upperBound, Number(chance.toFixed(2))))
}

export const getIntrigueSpecialistName = (
  nation: NationState,
  action: ActionType,
): string | undefined => {
  const focus = ACTION_FOCUS[action]
  if (!focus) return undefined
  const specialist = findSpecialist(nation, focus)
  return specialist?.name
}

export const INTRIGUE_ACTIONS: ActionType[] = [
  'BribeAdvisor',
  'Purge',
  'Assassinate',
  'StealTech',
  'FomentRevolt',
]
