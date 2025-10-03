import { useMemo, useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import type { TranslationKey } from '../i18n/translations'
import './HelpCodex.css'

interface CodexEntry {
  id: string
  section: 'economy' | 'military' | 'politics' | 'technology' | 'diplomacy'
  titleKey: TranslationKey
  bodyKey: TranslationKey
}

const entries: CodexEntry[] = [
  {
    id: 'economy-1',
    section: 'economy',
    titleKey: 'codex.entry.tradeEfficiency.title',
    bodyKey: 'codex.entry.tradeEfficiency.body',
  },
  {
    id: 'military-1',
    section: 'military',
    titleKey: 'codex.entry.armyComposition.title',
    bodyKey: 'codex.entry.armyComposition.body',
  },
  {
    id: 'politics-1',
    section: 'politics',
    titleKey: 'codex.entry.senateSupport.title',
    bodyKey: 'codex.entry.senateSupport.body',
  },
  {
    id: 'technology-1',
    section: 'technology',
    titleKey: 'codex.entry.researchPriorities.title',
    bodyKey: 'codex.entry.researchPriorities.body',
  },
  {
    id: 'diplomacy-1',
    section: 'diplomacy',
    titleKey: 'codex.entry.allianceWeb.title',
    bodyKey: 'codex.entry.allianceWeb.body',
  },
]

const HelpCodex = () => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null)

  const localisedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        title: t(entry.titleKey as Parameters<typeof t>[0]),
        body: t(entry.bodyKey as Parameters<typeof t>[0]),
      })),
    [t],
  )

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return localisedEntries
    return localisedEntries.filter(
      (entry) => entry.title.toLowerCase().includes(normalized) || entry.body.toLowerCase().includes(normalized),
    )
  }, [query, localisedEntries])

  const visibleSelected = filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null

  return (
    <section className="panel help-codex" aria-labelledby="help-codex-title">
      <header className="panel__header">
        <h3 id="help-codex-title">{t('codex.title')}</h3>
      </header>
      <div className="help-codex__layout">
        <aside className="help-codex__sidebar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('codex.searchPlaceholder')}
            aria-label={t('codex.searchPlaceholder')}
          />
          <nav>
            <ul>
              {filteredEntries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={visibleSelected?.id === entry.id ? 'is-active' : ''}
                  >
                    {t(`codex.section.${entry.section}` as const)} — {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="help-codex__content">
          {visibleSelected ? (
            <>
              <header>
                <p className="help-codex__section">{t(`codex.section.${visibleSelected.section}` as const)}</p>
                <h4>{visibleSelected.title}</h4>
              </header>
              <p>{visibleSelected.body}</p>
              <button type="button" onClick={() => setSelectedId(null)} className="help-codex__back">
                {t('codex.back')}
              </button>
            </>
          ) : (
            <p className="help-codex__empty">{t('achievements.none')}</p>
          )}
        </article>
      </div>
    </section>
  )
}

export default HelpCodex
