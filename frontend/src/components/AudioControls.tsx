import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../contexts/TranslationContext'
import './AudioControls.css'

const TRACK_ID = 'audio.track.ancientEchoes'

const AudioControls = () => {
  const { audioVolume, setAudioVolume, isAudioMuted, toggleMute } = useSettings()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)

  useEffect(() => {
    const context = audioContextRef.current
    const gain = gainNodeRef.current
    if (context && gain) {
      gain.gain.value = isAudioMuted ? 0 : audioVolume
    }
  }, [audioVolume, isAudioMuted])

  useEffect(() => () => {
    oscillatorRef.current?.stop()
    oscillatorRef.current?.disconnect()
    gainNodeRef.current?.disconnect()
    audioContextRef.current?.close()
  }, [])

  const ensureContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
  }

  const startPlayback = async () => {
    await ensureContext()
    const context = audioContextRef.current
    const gain = gainNodeRef.current
    if (!context || !gain) return
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 220
    oscillator.connect(gain)
    oscillator.start()
    oscillatorRef.current = oscillator
    gain.gain.value = isAudioMuted ? 0 : audioVolume
    setIsPlaying(true)
  }

  const stopPlayback = () => {
    oscillatorRef.current?.stop()
    oscillatorRef.current = null
    setIsPlaying(false)
  }

  return (
    <section className="panel audio-controls" aria-labelledby="audio-controls-title">
      <header className="panel__header">
        <h3 id="audio-controls-title">{t('settings.audio')}</h3>
      </header>
      <div className="audio-controls__status">
        <p>
          {t('audio.nowPlaying')}: <strong>{isPlaying ? t(TRACK_ID) : '—'}</strong>
        </p>
        <div className="audio-controls__buttons">
          <button type="button" onClick={() => (isPlaying ? stopPlayback() : startPlayback())}>
            {isPlaying ? t('settings.audio.mute') : t('settings.audio.unmute')}
          </button>
          <button type="button" onClick={() => toggleMute()}>
            {isAudioMuted ? t('settings.audio.unmute') : t('settings.audio.mute')}
          </button>
        </div>
      </div>
      <label className="audio-controls__slider">
        <span>{t('settings.audio.volume')}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audioVolume}
          onChange={(event) => setAudioVolume(Number(event.target.value))}
        />
      </label>
    </section>
  )
}

export default AudioControls
