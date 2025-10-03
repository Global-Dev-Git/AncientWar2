import { useEffect, useState } from 'react'
import './ReplayControls.css'

interface ReplayControlsProps {
  onSave: () => string | null
  onLoad: (payload: string) => void
  initialValue?: string
}

export const ReplayControls = ({ onSave, onLoad, initialValue = '' }: ReplayControlsProps) => {
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleSave = () => {
    const payload = onSave()
    if (payload) {
      setValue(payload)
      localStorage.setItem('ancient-war-replay', payload)
      setStatus('Replay saved to local storage.')
    }
  }

  const handleLoad = () => {
    if (value.trim()) {
      onLoad(value)
      setStatus('Replay loaded.')
    }
  }

  return (
    <div className="replay-controls">
      <h3>Replays</h3>
      <div className="replay-controls__actions">
        <button type="button" onClick={handleSave}>
          Save Replay
        </button>
        <button type="button" onClick={handleLoad}>
          Load Replay
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Replay JSON will appear here."
        rows={4}
      />
      {status && <p className="replay-controls__status">{status}</p>}
    </div>
  )
}

export default ReplayControls
