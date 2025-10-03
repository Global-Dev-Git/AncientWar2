import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import './PerformanceStats.css'

interface PerformanceStatsProps {
  turnDurationMs: number
  lastSaveTimestamp?: number
}

const PerformanceStats = ({ turnDurationMs, lastSaveTimestamp }: PerformanceStatsProps) => {
  const { t } = useTranslation()
  const [fps, setFps] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useEffect(() => {
    let frameId: number
    const loop = (time: number) => {
      frameCount.current += 1
      const delta = time - lastTime.current
      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta))
        frameCount.current = 0
        lastTime.current = time
      }
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [])

  const lastSave = lastSaveTimestamp ? new Date(lastSaveTimestamp).toLocaleTimeString() : '—'

  return (
    <section className="panel performance" aria-labelledby="performance-title">
      <header className="panel__header">
        <h3 id="performance-title">{t('performance.title')}</h3>
      </header>
      <ul className="performance__metrics">
        <li>
          <span>{t('performance.fps')}</span>
          <strong>{fps}</strong>
        </li>
        <li>
          <span>{t('performance.turnTime')}</span>
          <strong>{turnDurationMs.toFixed(0)} ms</strong>
        </li>
        <li>
          <span>{t('performance.lastSave')}</span>
          <strong>{lastSave}</strong>
        </li>
      </ul>
    </section>
  )
}

export default PerformanceStats
