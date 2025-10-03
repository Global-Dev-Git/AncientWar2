import type { TechNode, TechState, TraditionDefinition, TraditionState } from '../game/types'
import './TechTreePanel.css'

interface TechTreePanelProps {
  techNodes: TechNode[]
  techState: TechState
  traditions: TraditionState
  traditionDefinitions: TraditionDefinition[]
  onSelectTech: (techId: string | null) => void
  onAdoptTradition: (traditionId: string) => void
}

const RESEARCH_THRESHOLD = 100

const statusClass = (techState: TechState, nodeId: string): 'researched' | 'available' | 'locked' => {
  if (techState.researched.has(nodeId)) return 'researched'
  if (techState.available.has(nodeId)) return 'available'
  return 'locked'
}

const tierGroups = (nodes: TechNode[]): Record<number, TechNode[]> => {
  return nodes.reduce<Record<number, TechNode[]>>((acc, node) => {
    const tier = node.tier ?? 1
    if (!acc[tier]) {
      acc[tier] = []
    }
    acc[tier].push(node)
    return acc
  }, {})
}

export const TechTreePanel = ({
  techNodes,
  techState,
  traditions,
  traditionDefinitions,
  onSelectTech,
  onAdoptTradition,
}: TechTreePanelProps) => {
  const grouped = tierGroups(techNodes)
  return (
    <div className="tech-tree-panel">
      <header>
        <h3>Technologies &amp; Traditions</h3>
        <p>Select a technology to focus research or adopt available traditions.</p>
      </header>
      <div className="tech-tree">
        {Object.keys(grouped)
          .map((tier) => Number(tier))
          .sort((a, b) => a - b)
          .map((tier) => (
            <div key={tier} className="tech-tier">
              <h4>Tier {tier}</h4>
              <div className="tech-tier__nodes">
                {grouped[tier]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((node) => {
                    const status = statusClass(techState, node.id)
                    const progress = techState.progress[node.id] ?? 0
                    const isFocused = techState.focus === node.id
                    return (
                      <button
                        type="button"
                        key={node.id}
                        className={`tech-node tech-node--${status} ${isFocused ? 'tech-node--focused' : ''}`}
                        onClick={() => onSelectTech(isFocused ? null : node.id)}
                        disabled={status === 'locked'}
                        title={node.description}
                      >
                        <span className="tech-node__name">{node.name}</span>
                        <span className="tech-node__status">{status.toUpperCase()}</span>
                        {status !== 'researched' && (
                          <span className="tech-node__progress">
                            {Math.min(RESEARCH_THRESHOLD, progress)}/{RESEARCH_THRESHOLD}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
      </div>
      <section className="traditions">
        <h4>Traditions</h4>
        <div className="traditions__list">
          {traditionDefinitions.map((tradition) => {
            const adopted = traditions.adopted.has(tradition.id)
            const available = traditions.available.has(tradition.id)
            return (
              <button
                key={tradition.id}
                type="button"
                className={`tradition-card ${adopted ? 'tradition-card--adopted' : available ? 'tradition-card--available' : 'tradition-card--locked'}`}
                onClick={() => {
                  if (available && !adopted) {
                    onAdoptTradition(tradition.id)
                  }
                }}
                disabled={!available || adopted}
              >
                <strong>{tradition.name}</strong>
                <span>{tradition.description}</span>
                <span className="tradition-card__status">
                  {adopted ? 'Adopted' : available ? 'Available' : 'Locked'}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default TechTreePanel
