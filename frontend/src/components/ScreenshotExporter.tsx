import { useState } from 'react'
import { toPng } from 'html-to-image'
import { useTranslation } from '../contexts/TranslationContext'
import './ScreenshotExporter.css'

const ScreenshotExporter = () => {
  const { t } = useTranslation()
  const [isCapturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCapture = async () => {
    const target = document.querySelector('.app-shell') as HTMLElement | null
    if (!target) return
    try {
      setCapturing(true)
      setError(null)
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: window.devicePixelRatio * 1.2,
      })
      const link = document.createElement('a')
      link.download = `ancient-war-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (captureError) {
      setError((captureError as Error).message)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <section className="panel screenshot-exporter" aria-labelledby="screenshot-exporter-title">
      <header className="panel__header">
        <h3 id="screenshot-exporter-title">{t('screenshot.title')}</h3>
      </header>
      <button type="button" onClick={handleCapture} disabled={isCapturing}>
        {isCapturing ? t('autosave.prompt') : t('screenshot.capture')}
      </button>
      {error && <p className="screenshot-exporter__error">{error}</p>}
    </section>
  )
}

export default ScreenshotExporter
