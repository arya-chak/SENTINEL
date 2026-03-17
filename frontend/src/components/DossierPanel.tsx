import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSentinelStore } from '../store'
import { api } from '../api'
import ClassifierResult from './ClassifierResult'
import LLMExplainer from './LLMExplainer'
import ActionBar from './ActionBar'

const TYPE_COLOR_HEX: Record<string, string> = {
  hostile:   '#E24B4A',
  ambiguous: '#EF9F27',
  friendly:  '#378ADD',
  civilian:  '#888780',
}

export default function DossierPanel() {
  const selectedEntityId = useSentinelStore(s => s.selectedEntityId)
  const entities         = useSentinelStore(s => s.entities)
  const setSelected      = useSentinelStore(s => s.setSelected)

  const entity = entities.find(e => e.id === selectedEntityId) ?? null

  const { data: scoreData, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', selectedEntityId],
    queryFn:  () => api.getScore(selectedEntityId!),
    enabled:  !!selectedEntityId,
  })

  const entityColor = TYPE_COLOR_HEX[entity?.entity_type ?? ''] ?? '#888780'

  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          key={entity.id}
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: 200, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            height: 'var(--dossier-max-height)',
            background: 'var(--color-bg-surface)',
            borderTop: `2px solid ${entityColor}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Dossier header bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-lg)',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>

            {/* Entity type badge */}
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              color: entityColor,
              background: entityColor + '22',
              border: `1px solid ${entityColor}44`,
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontFamily: 'var(--font-hud)',
            }}>
              {entity.entity_type.toUpperCase()}
            </span>

            {/* Entity name / ID */}
            <span style={{
              fontSize: 'var(--text-heading)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.5px',
            }}>
              {entity.unit_name ?? entity.id.slice(0, 8).toUpperCase()}
            </span>

            {/* Status */}
            <span style={{
              fontSize: 'var(--text-label)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.5px',
            }}>
              {entity.status.replace(/_/g, ' ').toUpperCase()}
            </span>

            {/* Coordinates */}
            <span style={{
              fontSize: 'var(--text-data)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-data)',
              marginLeft: 'var(--space-xs)',
            }}>
              {entity.lat.toFixed(4)}°N&nbsp;&nbsp;{entity.lon.toFixed(4)}°E
            </span>

            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--space-xs)',
                borderRadius: 'var(--radius-sm)',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Three-column body */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <ClassifierResult scoreData={scoreData} loading={scoreLoading} />
            <LLMExplainer entityId={selectedEntityId!} />
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