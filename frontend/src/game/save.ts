import type {
  GameState,
  NotificationEntry,
  PlayerAction,
  TurnLogEntry,
  NationState,
  TerritoryState,
} from './types'

export const SAVE_VERSION = 2
const LEGACY_VERSION = 1

interface SerializedDiplomacy {
  relations: GameState['diplomacy']['relations']
  wars: string[]
  alliances: string[]
}

interface SerializedGameState {
  turn: number
  currentPhase: GameState['currentPhase']
  playerNationId: string
  nations: Record<string, NationState>
  territories: Record<string, TerritoryState>
  diplomacy: SerializedDiplomacy
  selectedTerritoryId?: string
  pendingAction?: PlayerAction
  log: TurnLogEntry[]
  notifications: NotificationEntry[]
  queuedEvents: string[]
  winner?: string
  defeated?: boolean
  actionsTaken: number
  saveVersion?: number
}

interface MigrationResult {
  state: GameState
  warnings: string[]
  migratedFrom: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toNumber = (value: unknown, fallback: number, field: string, warnings: string[]): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  warnings.push(`Field "${field}" was invalid; defaulting to ${fallback}.`)
  return fallback
}

const toStringField = (value: unknown, fallback: string, field: string, warnings: string[]): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  warnings.push(`Field "${field}" was invalid; defaulting to "${fallback}".`)
  return fallback
}

const toOptionalString = (
  value: unknown,
): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined)

const toBoolean = (value: unknown, fallback: boolean, field: string, warnings: string[]): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  warnings.push(`Field "${field}" was invalid; defaulting to ${fallback}.`)
  return fallback
}

const toStringArray = (value: unknown, field: string, warnings: string[]): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }
  warnings.push(`Field "${field}" was invalid; defaulting to an empty list.`)
  return []
}

const toRecord = <T extends Record<string, unknown>>(
  value: unknown,
  field: string,
  warnings: string[],
  fallback: T,
): T => {
  if (isRecord(value)) {
    return value as T
  }
  warnings.push(`Field "${field}" was invalid; defaulting to an empty record.`)
  return fallback
}

const toArray = <T>(value: unknown, field: string, warnings: string[]): T[] => {
  if (Array.isArray(value)) {
    return value as T[]
  }
  warnings.push(`Field "${field}" was invalid; defaulting to an empty list.`)
  return []
}

const VALID_PHASES: GameState['currentPhase'][] = ['selection', 'player', 'ai', 'events', 'gameover']

const toPhase = (
  value: unknown,
  fallback: GameState['currentPhase'],
  warnings: string[],
): GameState['currentPhase'] => {
  if (typeof value === 'string' && (VALID_PHASES as string[]).includes(value)) {
    return value as GameState['currentPhase']
  }
  warnings.push(`Field "currentPhase" was invalid; defaulting to "${fallback}".`)
  return fallback
}

const normalise = (raw: SerializedGameState): MigrationResult => {
  const warnings: string[] = []

  const turn = toNumber(raw.turn, 1, 'turn', warnings)
  const currentPhase = toPhase(raw.currentPhase, 'player', warnings)
  const playerNationId = toStringField(raw.playerNationId, 'rome', 'playerNationId', warnings)
  const nations = toRecord(raw.nations, 'nations', warnings, {})
  const territories = toRecord(raw.territories, 'territories', warnings, {})

  const diplomacyRaw = toRecord(raw.diplomacy, 'diplomacy', warnings, {
    relations: {},
    wars: [],
    alliances: [],
  })
  const relations = toRecord(
    diplomacyRaw.relations,
    'diplomacy.relations',
    warnings,
    {},
  )
  const wars = toStringArray(diplomacyRaw.wars, 'diplomacy.wars', warnings)
  const alliances = toStringArray(diplomacyRaw.alliances, 'diplomacy.alliances', warnings)

  const log = toArray<TurnLogEntry>(raw.log, 'log', warnings)
  const notifications = toArray<NotificationEntry>(raw.notifications, 'notifications', warnings)
  const queuedEvents = toStringArray(raw.queuedEvents, 'queuedEvents', warnings)
  const pendingAction = isRecord(raw.pendingAction) ? (raw.pendingAction as PlayerAction) : undefined
  const winner = toOptionalString(raw.winner)
  const defeated = raw.defeated !== undefined ? toBoolean(raw.defeated, false, 'defeated', warnings) : undefined
  const actionsTaken = toNumber(raw.actionsTaken, 0, 'actionsTaken', warnings)

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    turn,
    currentPhase,
    playerNationId,
    nations,
    territories,
    diplomacy: {
      relations,
      wars: new Set(wars),
      alliances: new Set(alliances),
    },
    selectedTerritoryId: toOptionalString(raw.selectedTerritoryId),
    pendingAction,
    log,
    notifications,
    queuedEvents,
    winner,
    defeated,
    actionsTaken,
  }

  const migratedFrom = typeof raw.saveVersion === 'number' ? raw.saveVersion : null

  return { state, warnings, migratedFrom }
}

const applyMigrations = (raw: unknown): MigrationResult => {
  if (!isRecord(raw)) {
    throw new Error('Save payload was not a valid object.')
  }

  const version = typeof raw.saveVersion === 'number' ? raw.saveVersion : LEGACY_VERSION
  const result = normalise(raw as SerializedGameState)

  if (version > SAVE_VERSION) {
    result.warnings.unshift(
      `Save version v${version} is newer than supported v${SAVE_VERSION}; attempting best-effort load.`,
    )
  }
  if (version < SAVE_VERSION) {
    result.warnings.unshift(
      `Loaded legacy save v${version}; applied default values introduced in v${SAVE_VERSION}.`,
    )
  }

  if (version < SAVE_VERSION) {
    result.migratedFrom = version
  }

  return result
}

export const quickSaveState = (state: GameState): string => {
  const serialisable: SerializedGameState & { saveVersion: number } = {
    ...state,
    saveVersion: SAVE_VERSION,
    diplomacy: {
      relations: state.diplomacy.relations,
      wars: Array.from(state.diplomacy.wars),
      alliances: Array.from(state.diplomacy.alliances),
    },
  }
  return JSON.stringify(serialisable)
}

export const loadStateFromString = (payload: string): GameState => {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch (error) {
    throw new Error('Failed to parse save payload: invalid JSON.')
  }

  const { state, warnings, migratedFrom } = applyMigrations(parsed)
  warnings.forEach((warning) => {
    console.warn(`[AncientWar2] ${warning}`)
  })

  if (migratedFrom !== null && migratedFrom < SAVE_VERSION) {
    console.info(
      `[AncientWar2] Save upgraded from v${migratedFrom} to v${SAVE_VERSION}; future saves will persist the new schema.`,
    )
  }

  return state
}
