import type {
  BilateralDiplomacyStatus,
  DiplomacyMatrix,
  GameState,
  NationState,
  TerritoryState,
  TreatyType,
} from './types'

export const relationKey = (a: string, b: string): string =>
  [a, b].sort().join('|')

export const createBilateralStatus = (): BilateralDiplomacyStatus => ({
  score: 0,
  treaties: [],
  reputation: 0,
  casusBelli: null,
  treatyPenalty: 0,
  lastUpdated: Date.now(),
})

export const cloneRelations = (relations: DiplomacyMatrix['relations']): DiplomacyMatrix['relations'] => {
  const copy: DiplomacyMatrix['relations'] = {}
  Object.entries(relations).forEach(([from, targets]) => {
    copy[from] = {}
    Object.entries(targets).forEach(([to, status]) => {
      copy[from][to] = { ...status, treaties: [...status.treaties] }
    })
  })
  return copy
}

export const updateStats = (nation: NationState, key: keyof NationState['stats'], delta: number): void => {
  const value = nation.stats[key] + delta
  nation.stats[key] = Math.max(0, Math.min(100, value))
}

export const adjustTerritoryGarrison = (
  territory: TerritoryState,
  delta: number,
): void => {
  territory.garrison = Math.max(0, territory.garrison + delta)
}

export const ensureRelationMatrix = (
  diplomacy: DiplomacyMatrix,
  nations: Record<string, NationState>,
): void => {
  Object.keys(nations).forEach((id) => {
    if (!diplomacy.relations[id]) {
      diplomacy.relations[id] = {}
    }
    Object.keys(nations).forEach((other) => {
      if (id !== other && diplomacy.relations[id][other] === undefined) {
        diplomacy.relations[id][other] = createBilateralStatus()
      }
    })
  })
}

export const modifyRelation = (
  diplomacy: DiplomacyMatrix,
  from: string,
  to: string,
  delta: number,
): void => {
  ensureRelationMatrix(diplomacy, { [from]: {} as NationState, [to]: {} as NationState })
  const current = diplomacy.relations[from][to] ?? createBilateralStatus()
  const updatedScore = Math.max(-100, Math.min(100, current.score + delta))
  const updatedStatus = {
    ...current,
    score: updatedScore,
    lastUpdated: Date.now(),
  }
  diplomacy.relations[from][to] = { ...updatedStatus }
  diplomacy.relations[to][from] = { ...updatedStatus }
}

export const addTreaty = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  treaty: TreatyType,
): void => {
  ensureRelationMatrix(diplomacy, { [a]: {} as NationState, [b]: {} as NationState })
  const statusAB = diplomacy.relations[a][b]
  if (!statusAB.treaties.includes(treaty)) {
    statusAB.treaties.push(treaty)
  }
  const statusBA = diplomacy.relations[b][a]
  if (!statusBA.treaties.includes(treaty)) {
    statusBA.treaties.push(treaty)
  }
}

export const removeTreaty = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  treaty: TreatyType,
): void => {
  ensureRelationMatrix(diplomacy, { [a]: {} as NationState, [b]: {} as NationState })
  diplomacy.relations[a][b].treaties = diplomacy.relations[a][b].treaties.filter((item) => item !== treaty)
  diplomacy.relations[b][a].treaties = diplomacy.relations[b][a].treaties.filter((item) => item !== treaty)
}

export const setCasusBelli = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  reason: string | null,
): void => {
  ensureRelationMatrix(diplomacy, { [a]: {} as NationState, [b]: {} as NationState })
  diplomacy.relations[a][b].casusBelli = reason
  diplomacy.relations[b][a].casusBelli = reason
}

export const applyTreatyPenalty = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  amount: number,
): void => {
  ensureRelationMatrix(diplomacy, { [a]: {} as NationState, [b]: {} as NationState })
  diplomacy.relations[a][b].treatyPenalty += amount
  diplomacy.relations[b][a].treatyPenalty += amount
}

export const isAtWar = (diplomacy: DiplomacyMatrix, a: string, b: string): boolean =>
  diplomacy.wars.has(relationKey(a, b))

export const toggleWar = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  atWar: boolean,
): void => {
  const key = relationKey(a, b)
  if (atWar) {
    diplomacy.wars.add(key)
    diplomacy.alliances.delete(key)
  } else {
    diplomacy.wars.delete(key)
  }
}

export const toggleAlliance = (
  diplomacy: DiplomacyMatrix,
  a: string,
  b: string,
  allied: boolean,
): void => {
  const key = relationKey(a, b)
  if (allied) {
    diplomacy.alliances.add(key)
    diplomacy.wars.delete(key)
  } else {
    diplomacy.alliances.delete(key)
  }
}

export const getControlledTerritories = (
  state: GameState,
  nationId: string,
): TerritoryState[] =>
  Object.values(state.territories).filter((territory) => territory.ownerId === nationId)

export const pushLog = (
  state: GameState,
  entry: Omit<GameState['log'][number], 'id'>,
): void => {
  state.log = [
    { id: `${state.turn}-${state.log.length + 1}-${Date.now()}`, ...entry },
    ...state.log.slice(0, 99),
  ]
}

export const pushNotification = (
  state: GameState,
  notification: Omit<GameState['notifications'][number], 'id' | 'timestamp'>,
): void => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: Date.now(),
    ...notification,
  }
  state.notifications = [entry, ...state.notifications].slice(0, 5)
}
