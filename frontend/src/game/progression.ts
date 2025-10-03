import type { GameState, MissionDefinition, MissionProgress, MissionReward, NationState } from './types'
import {
  getMergedAchievements,
  getMergedMissions,
  getMergedScenarios,
} from './tech'
import { getControlledTerritories, pushNotification, updateStats } from './utils'

const cloneMissionProgress = (definition: MissionDefinition): MissionProgress => ({
  missionId: definition.id,
  completedObjectives: 0,
  complete: false,
})

const missionEligible = (
  state: GameState,
  definition: MissionDefinition,
): boolean =>
  definition.prerequisites.every((missionId) => state.missionProgress.completed.has(missionId))

export const initialiseScenarioProgression = (state: GameState): void => {
  if (state.options.mode !== 'scenario' || !state.options.scenarioId) {
    state.missionProgress = {
      activeMissions: [],
      completed: new Set<string>(),
    }
    state.scenario = undefined
    return
  }
  const scenario = getMergedScenarios(state.options.mods).find(
    (entry) => entry.id === state.options.scenarioId,
  )
  if (!scenario) {
    state.missionProgress = {
      activeMissions: [],
      completed: new Set<string>(),
    }
    state.scenario = undefined
    return
  }
  state.scenario = scenario
  if (scenario.modifiers) {
    Object.entries(scenario.modifiers).forEach(([stat, value]) => {
      updateStats(
        state.nations[state.playerNationId],
        stat as keyof NationState['stats'],
        value ?? 0,
      )
    })
  }
  const definitions = getMergedMissions(state.options.mods)
  const starting = scenario.startingMissions
    .map((missionId) => definitions.find((mission) => mission.id === missionId))
    .filter((mission): mission is MissionDefinition => Boolean(mission))
  state.missionProgress = {
    activeMissions: starting.map((mission) => cloneMissionProgress(mission)),
    completed: new Set<string>(),
  }
}

const grantMissionReward = (
  state: GameState,
  reward: MissionReward,
): void => {
  const nation = state.nations[state.playerNationId]
  switch (reward.type) {
    case 'stat':
      if (reward.target) {
        updateStats(nation, reward.target, reward.amount)
      }
      break
    case 'treasury':
      nation.treasury += reward.amount
      break
    case 'reputation':
      state.diplomacy.reputations[nation.id] =
        (state.diplomacy.reputations[nation.id] ?? 0) + reward.amount
      break
    default:
      break
  }
}

export const evaluateMissions = (state: GameState): void => {
  if (!state.missionProgress.activeMissions.length) return
  const definitions = getMergedMissions(state.options.mods)
  const player = state.nations[state.playerNationId]
  const territoriesOwned = getControlledTerritories(state, state.playerNationId).length

  state.missionProgress.activeMissions.forEach((progress) => {
    if (progress.complete) return
    const definition = definitions.find((mission) => mission.id === progress.missionId)
    if (!definition) return
    let completedObjectives = 0
    definition.objectives.forEach((objective) => {
      switch (objective.type) {
        case 'controlTerritories': {
          const requirement = Number(objective.value)
          if (territoriesOwned >= requirement) {
            completedObjectives += 1
          }
          break
        }
        case 'statThreshold': {
          if (objective.stat && player.stats[objective.stat] >= Number(objective.value)) {
            completedObjectives += 1
          }
          break
        }
        case 'techResearched': {
          const techs = Array.isArray(objective.value) ? objective.value : [String(objective.value)]
          if (techs.every((techId) => state.tech.researched.has(techId))) {
            completedObjectives += 1
          }
          break
        }
        default:
          break
      }
    })
    progress.completedObjectives = completedObjectives
    if (completedObjectives >= definition.objectives.length) {
      progress.complete = true
      state.missionProgress.completed.add(progress.missionId)
      definition.rewards.forEach((reward) => grantMissionReward(state, reward))
      pushNotification(state, {
        message: `Mission completed: ${definition.name}`,
        tone: 'positive',
      })
    }
  })

  const availableDefinitions = definitions.filter((definition) =>
    !state.missionProgress.completed.has(definition.id) &&
    !state.missionProgress.activeMissions.some((mission) => mission.missionId === definition.id),
  )

  availableDefinitions.forEach((definition) => {
    if (missionEligible(state, definition)) {
      state.missionProgress.activeMissions.push(cloneMissionProgress(definition))
      pushNotification(state, {
        message: `New mission available: ${definition.name}`,
        tone: 'neutral',
      })
    }
  })
}

export const recordAchievement = (state: GameState, achievementId: string): void => {
  if (state.achievements.unlocked.has(achievementId)) return
  state.achievements.unlocked.add(achievementId)
  const definition = getMergedAchievements(state.options.mods).find((entry) => entry.id === achievementId)
  const name = definition ? definition.name : achievementId
  pushNotification(state, {
    message: `Achievement unlocked: ${name}`,
    tone: 'positive',
  })
}

export const evaluateAchievementTriggers = (state: GameState): void => {
  const definitions = getMergedAchievements(state.options.mods)
  const playerTechCount = state.tech.researched.size
  definitions.forEach((achievement) => {
    if (state.achievements.unlocked.has(achievement.id)) return
    switch (achievement.trigger.type) {
      case 'techCount': {
        const threshold = achievement.trigger.threshold ?? 1
        if (playerTechCount >= threshold) {
          recordAchievement(state, achievement.id)
        }
        break
      }
      case 'scenarioWin': {
        if (state.winner === state.playerNationId && state.options.mode === 'scenario') {
          recordAchievement(state, achievement.id)
        }
        break
      }
      default:
        break
    }
  })
}

export const triggerFirstWarAchievement = (state: GameState): void => {
  const definitions = getMergedAchievements(state.options.mods)
  const firstWar = definitions.find((achievement) => achievement.trigger.type === 'firstWar')
  if (firstWar) {
    recordAchievement(state, firstWar.id)
  }
}
