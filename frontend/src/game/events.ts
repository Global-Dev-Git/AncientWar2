import type { GameState } from './types'
import { RandomGenerator } from './random'
import { pushLog, pushNotification, updateStats } from './utils'

interface EventTemplate {
  id: string
  description: (nationName: string) => string
  apply: (state: GameState, nationId: string, rng: RandomGenerator) => void
  weight: number
}

const eventPool: EventTemplate[] = [
  {
    id: 'bountifulHarvest',
    description: (name) => `Bountiful harvest boosts ${name}'s granaries`,
    weight: 3,
    apply: (state, nationId) => {
      const nation = state.nations[nationId]
      updateStats(nation, 'economy', 3)
      updateStats(nation, 'stability', 2)
    },
  },
  {
    id: 'drought',
    description: (name) => `Drought grips ${name}`,
    weight: 2,
    apply: (state, nationId) => {
      const nation = state.nations[nationId]
      updateStats(nation, 'economy', -4)
      updateStats(nation, 'stability', -2)
      if (nationId === 'harappa') {
        updateStats(nation, 'economy', -2)
      }
      if (nationId === 'shang') {
        updateStats(nation, 'crime', 1)
      }
    },
  },
  {
    id: 'borderRaid',
    description: (name) => `Border raid tests ${name}'s patrols`,
    weight: 3,
    apply: (state, nationId, rng) => {
      const nation = state.nations[nationId]
      updateStats(nation, 'stability', -3)
      const targetTiles = Object.values(state.territories).filter((t) => t.ownerId === nationId)
      if (targetTiles.length > 0) {
        const tile = targetTiles[Math.floor(rng.next() * targetTiles.length)]
        tile.unrest += 5
        tile.garrison = Math.max(1, tile.garrison - 1)
      }
    },
  },
  {
    id: 'festival',
    description: (name) => `${name} hosts lavish festivals`,
    weight: 2,
    apply: (state, nationId) => {
      const nation = state.nations[nationId]
      updateStats(nation, 'support', 4)
      updateStats(nation, 'stability', 2)
      nation.treasury = Math.max(0, nation.treasury - 3)
    },
  },
  {
    id: 'scholarFind',
    description: (name) => `A brilliant scholar advances ${name}'s sciences`,
    weight: 2,
    apply: (state, nationId) => {
      const nation = state.nations[nationId]
      updateStats(nation, 'science', 4)
      updateStats(nation, 'tech', 2)
    },
  },
]

const pickEvent = (rng: RandomGenerator): EventTemplate => {
  const total = eventPool.reduce((sum, event) => sum + event.weight, 0)
  const roll = rng.next() * total
  let acc = 0
  for (const event of eventPool) {
    acc += event.weight
    if (roll <= acc) {
      return event
    }
  }
  return eventPool[0]
}

export const applyTurnEvents = (state: GameState, rng: RandomGenerator): void => {
  Object.values(state.nations).forEach((nation) => {
    if (nation.id === state.playerNationId || rng.next() > 0.55) {
      const event = pickEvent(rng)
      event.apply(state, nation.id, rng)
      const description = event.description(nation.name)
      pushLog(state, {
        summary: description,
        tone: description.includes('drought') ? 'warning' : 'info',
        turn: state.turn,
      })
      if (nation.id === state.playerNationId) {
        pushNotification(state, {
          message: description,
          tone: description.includes('drought') ? 'negative' : 'positive',
        })
      }
    }
  })
}
