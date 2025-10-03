import { useEffect, useMemo, useState } from 'react'
import type { ChangeEventHandler, FormEvent } from 'react'
import type { GameModPackage, GameOptions, HotkeyBindings, NationDefinition } from '../game/types'
import { scenarios as baseScenarios } from '../game/data'
import { parseModPayload } from '../game/mods'
import './NationSelect.css'

interface NationSelectProps {
  nations: NationDefinition[]
  initialHotkeys: HotkeyBindings
  onSelect: (nationId: string, options: Partial<GameOptions>) => void
}

export const NationSelect = ({ nations, initialHotkeys, onSelect }: NationSelectProps) => {
  const [hoveredNation, setHoveredNation] = useState<string | null>(null)
  const [mode, setMode] = useState<GameOptions['mode']>('sandbox')
  const [scenarioId, setScenarioId] = useState<string | undefined>(undefined)
  const [ironman, setIronman] = useState<boolean>(false)
  const [seed, setSeed] = useState<string>('')
  const [mods, setMods] = useState<GameModPackage[]>([])
  const [modError, setModError] = useState<string | null>(null)

  const orderedNations = useMemo(() => nations.slice().sort((a, b) => a.name.localeCompare(b.name)), [nations])
  const scenarios = useMemo(() => {
    const additional = mods.flatMap((mod) => mod.scenarios ?? [])
    return [...baseScenarios, ...additional]
  }, [mods])

  useEffect(() => {
    if (mode === 'scenario' && !scenarioId && scenarios.length > 0) {
      setScenarioId(scenarios[0].id)
    }
    if (mode === 'sandbox') {
      setScenarioId(undefined)
    }
  }, [mode, scenarioId, scenarios])

  const handleModUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const content = await file.text()
      const mod = parseModPayload(content)
      setMods((prev) => [...prev, mod])
      setModError(null)
    } catch (error) {
      setModError(error instanceof Error ? error.message : 'Failed to load mod file')
    }
  }

  const handleModPaste = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const raw = data.get('mod-json')
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const mod = parseModPayload(raw)
        setMods((prev) => [...prev, mod])
        setModError(null)
        event.currentTarget.reset()
      } catch (error) {
        setModError(error instanceof Error ? error.message : 'Failed to parse mod data')
      }
    }
  }

  const startGame = (nationId: string) => {
    const numericSeed = Number.parseInt(seed, 10)
    onSelect(nationId, {
      mode,
      scenarioId: mode === 'scenario' ? scenarioId : undefined,
      ironman,
      seed: Number.isFinite(numericSeed) ? numericSeed : undefined,
      mods: mods.length ? mods : undefined,
      hotkeys: initialHotkeys,
    })
  }

  return (
    <div className="nation-select">
      <header>
        <h1>Choose Your Civilization</h1>
        <p>Select a legendary nation and define the campaign parameters.</p>
      </header>
      <section className="nation-select__options">
        <div className="option-group">
          <label htmlFor="seed-entry">World Seed</label>
          <input
            id="seed-entry"
            type="number"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="Random"
          />
        </div>
        <div className="option-group">
          <label htmlFor="ironman-toggle">
            <input
              id="ironman-toggle"
              type="checkbox"
              checked={ironman}
              onChange={(event) => setIronman(event.target.checked)}
            />
            Ironman Mode
          </label>
        </div>
        <div className="option-group">
          <fieldset>
            <legend>Mode</legend>
            <label>
              <input
                type="radio"
                name="game-mode"
                value="sandbox"
                checked={mode === 'sandbox'}
                onChange={() => setMode('sandbox')}
              />
              Sandbox
            </label>
            <label>
              <input
                type="radio"
                name="game-mode"
                value="scenario"
                checked={mode === 'scenario'}
                onChange={() => setMode('scenario')}
              />
              Scenario
            </label>
            {mode === 'scenario' && (
              <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            )}
          </fieldset>
        </div>
        <div className="option-group option-group--mods">
          <label htmlFor="mod-upload">Load Mod (JSON)</label>
          <input id="mod-upload" type="file" accept="application/json" onChange={handleModUpload} />
          <form onSubmit={handleModPaste} className="mod-inline-form">
            <textarea name="mod-json" placeholder="Paste mod JSON" rows={3} />
            <button type="submit">Add Mod</button>
          </form>
          {modError && <p className="mod-error">{modError}</p>}
          {mods.length > 0 && (
            <ul className="mod-list">
              {mods.map((mod) => (
                <li key={mod.id}>
                  <strong>{mod.name}</strong> <span>v{mod.version}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <div className="nation-select__grid">
        {orderedNations.map((nation) => (
          <button
            key={nation.id}
            type="button"
            className="nation-card"
            onClick={() => startGame(nation.id)}
            onMouseEnter={() => setHoveredNation(nation.id)}
            onMouseLeave={() => setHoveredNation(null)}
          >
            <div className="nation-card__crest">{nation.name.slice(0, 2)}</div>
            <div className="nation-card__body">
              <h2>{nation.name}</h2>
              <p>{nation.description}</p>
              <div className="nation-card__tags">
                <span>{nation.territories.length} territories</span>
                <span>Stability {nation.stats.stability}</span>
              </div>
            </div>
            {hoveredNation === nation.id && (
              <div className="nation-card__tooltip">
                <strong>Advantages</strong>
                <ul>
                  {nation.advantages.map((advantage) => (
                    <li key={advantage}>{advantage}</li>
                  ))}
                </ul>
                <strong>Disadvantages</strong>
                <ul>
                  {nation.disadvantages.map((disadvantage) => (
                    <li key={disadvantage}>{disadvantage}</li>
                  ))}
                </ul>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default NationSelect
