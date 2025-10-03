import { useMemo } from 'react'
import type { NationState } from '../game/types'
import { useTranslation } from '../contexts/TranslationContext'
import Tooltip from './Tooltip'
import './TechTree.css'

interface TechTreeProps {
  nation: NationState
}

const TECHNOLOGY_BRANCHES = ['Engineering', 'Strategy', 'Civic', 'Alchemy']

const TechTree = ({ nation }: TechTreeProps) => {
  const { t } = useTranslation()
  const techLevel = nation.stats.tech ?? 0
  const projects = useMemo(() => {
    if (techLevel === 0) return []
    return TECHNOLOGY_BRANCHES.map((branch, index) => ({
      id: branch,
      progress: Math.min(100, techLevel * 15 - index * 10),
      completed: techLevel * 15 > 100 + index * 20,
    }))
  }, [techLevel])

  return (
    <section className="panel tech-tree" aria-labelledby="tech-tree-title">
      <header className="panel__header">
        <h3 id="tech-tree-title">{t('tech.title')}</h3>
      </header>
      {projects.length === 0 ? (
        <p className="tech-tree__empty">{t('tech.none')}</p>
      ) : (
        <ul className="tech-tree__branches">
          {projects.map((project) => (
            <li key={project.id} className={`tech-tree__branch ${project.completed ? 'is-complete' : ''}`}>
              <div className="tech-tree__branchHeader">
                <strong>{project.id}</strong>
                <span>{project.completed ? t('tech.completed') : t('tech.progress')}</span>
              </div>
              <Tooltip
                content={
                  <p>
                    {t('tech.progress')}: {Math.max(0, Math.min(100, project.progress)).toFixed(0)}%
                  </p>
                }
              >
                <div className="tech-tree__progress" aria-label={`${project.id} ${project.progress}%`}>
                  <span style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }} />
                </div>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default TechTree
