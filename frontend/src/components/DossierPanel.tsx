import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSentinelStore } from '../store'
import { api } from '../api'
import ClassifierResult from './ClassifierResult'
import LLMExplainer from './LLMExplainer'
import ActionBar from './ActionBar'

export default function DossierPanel() {
  const selectedEntityId = useSentinelStore(s => s.selectedEntityId)
  const entities = useSentinelStore(s => s.entities)
  const setSelected = useSentinelStore(s => s.setSelected)

  const entity = entities.find(e => e.id === selectedEntityId) ?? null

  const [llmResult, setLlmResult] = useState<any>(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmError, setLlmError] = useState<string | null>(null)

  // Reset LLM state whenever selected entity changes
  useEffect(() => {
    setLlmResult(null)
    setLlmLoading(false)
    setLlmError(null)
  }, [selectedEntityId])

  const { data: scoreData, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', selectedEntityId],
    queryFn: () => api.getScore(selectedEntityId!),
    enabled: !!selectedEntityId,
  })

  async function handleExplain() {
    if (!selectedEntityId) return
    setLlmLoading(true)
    setLlmError(null)
    try {
      const result = await api.getExplain(selectedEntityId)
      setLlmResult(result)
    } catch {
      setLlmError('Failed to fetch explanation')
    } finally {
      setLlmLoading(false)
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    hostile:   '#E24B4A',
    ambiguous: '#EF9F27',
    friendly:  '#378ADD',
    civilian:  '#888780',
  }

  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          key={entity.id}
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            height: 300,
            background: '#0d0d18',
            borderTop: `2px solid ${TYPE_COLOR[entity.entity_type] ?? '#888780'}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Dossier header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid #1e2035',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1,
              color: TYPE_COLOR[entity.entity_type],
              background: TYPE_COLOR[entity.entity_type] + '22',
              border: `1px solid ${TYPE_COLOR[entity.entity_type]}44`,
              borderRadius: 3, padding: '2px 6px',
            }}>
              {entity.entity_type.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>
              {entity.unit_name ?? entity.id.slice(0, 8).toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>
              {entity.status.replace('_', ' ').toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 8 }}>
              {entity.lat.toFixed(4)}°N {entity.lon.toFixed(4)}°E
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                marginLeft: 'auto', background: 'transparent',
                border: 'none', color: '#4a5568', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Three-column body */}
          <div style={{
            display: 'flex', flex: 1, overflow: 'hidden',
          }}>
            <ClassifierResult scoreData={scoreData} loading={scoreLoading} />
            <LLMExplainer
              llmResult={llmResult}
              loading={llmLoading}
              error={llmError}
              onExplain={handleExplain}
            />
            <ActionBar
              entity={entity}
              classifierScore={scoreData?.threat_score ?? 0}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
