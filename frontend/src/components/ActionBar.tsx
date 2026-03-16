import { useQueryClient } from '@tanstack/react-query'
import { useSentinelStore } from '../store'
import { api } from '../api'
import type { Entity } from '../types'

interface Props {
  entity: Entity
  classifierScore: number
}

function ActionButton({
  label, color, onClick, disabled = false
}: {
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#1a1a2e' : color + '18',
        border: `1px solid ${disabled ? '#1e2035' : color + '66'}`,
        color: disabled ? '#4a5568' : color,
        borderRadius: 4, padding: '8px 12px',
        fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        cursor: disabled ? 'default' : 'pointer',
        width: '100%', textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

export default function ActionBar({ entity, classifierScore }: Props) {
  const setSelected = useSentinelStore(s => s.setSelected)
  const entities = useSentinelStore(s => s.entities)
  const queryClient = useQueryClient()

  async function decide(decision: string) {
    await api.decide(entity.id, decision, classifierScore)
    queryClient.invalidateQueries({ queryKey: ['entities'] })
    setSelected(null)
  }

  async function command(cmd: string, targetId?: string) {
    await api.command(entity.id, cmd, targetId)
    queryClient.invalidateQueries({ queryKey: ['entities'] })
  }

  const isFriendly = entity.entity_type === 'friendly'
  const isIncapacitated = entity.status === 'incapacitated'

  // Find hostile targets for advance_clear
  const hostileTargets = entities.filter(
    e => (e.entity_type === 'hostile' || e.entity_type === 'ambiguous')
      && e.status !== 'neutralized'
  )

  return (
    <div style={{
      width: 200, flexShrink: 0, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#4a5568', marginBottom: 4 }}>
        ACTIONS
      </div>

      {!isFriendly && (
        <>
          <ActionButton
            label="✓ APPROVE ENGAGEMENT"
            color="#E24B4A"
            onClick={() => decide('approve')}
          />
          <ActionButton
            label="✕ DENY ENGAGEMENT"
            color="#22c55e"
            onClick={() => decide('deny')}
          />
          <ActionButton
            label="⟳ REQUEST MORE INTEL"
            color="#EF9F27"
            onClick={() => decide('more_intel')}
          />
        </>
      )}

      {isFriendly && (
        <>
          <ActionButton
            label="↩ FALL BACK"
            color="#EF9F27"
            onClick={() => command('fall_back')}
            disabled={isIncapacitated}
          />
          <ActionButton
            label="⟳ HOLD POSITION"
            color="#378ADD"
            onClick={() => command('hold')}
            disabled={isIncapacitated}
          />
          <ActionButton
            label="↗ REQUEST STATUS"
            color="#888780"
            onClick={() => command('request_status')}
            disabled={isIncapacitated}
          />

          {/* Advance & Clear — pick from hostile targets */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#4a5568', marginTop: 4 }}>
            ADVANCE & CLEAR
          </div>
          {hostileTargets.length === 0 ? (
            <span style={{ fontSize: 10, color: '#4a5568' }}>No targets available</span>
          ) : (
            hostileTargets.slice(0, 4).map(t => (
              <ActionButton
                key={t.id}
                label={`→ ${t.unit_name ?? t.id.slice(0, 6).toUpperCase()}`}
                color="#E24B4A"
                onClick={() => command('advance_clear', t.id)}
                disabled={isIncapacitated}
              />
            ))
          )}

          {isIncapacitated && (
            <div style={{
              fontSize: 10, color: '#E24B4A', marginTop: 4,
              background: '#E24B4A18', border: '1px solid #E24B4A33',
              borderRadius: 4, padding: '6px 8px',
            }}>
              UNIT INCAPACITATED — cannot receive commands
            </div>
          )}
        </>
      )}
    </div>
  )
}
