import { useQueryClient } from '@tanstack/react-query'
import { useSentinelStore } from '../store'
import { api } from '../api'
import type { Entity } from '../types'

interface Props {
  entity: Entity
  classifierScore: number
}

function ActionButton({
  label, colorHex, onClick, disabled = false
}: {
  label: string
  colorHex: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'var(--color-bg-elevated)' : colorHex + '18',
        border: `1px solid ${disabled ? 'var(--color-border)' : colorHex + '66'}`,
        color: disabled ? 'var(--color-text-muted)' : colorHex,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-sm) var(--space-md)',
        fontSize: 'var(--text-label)',
        fontWeight: 700,
        letterSpacing: 0.5,
        fontFamily: 'var(--font-hud)',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: `all var(--transition-fast)`,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = colorHex + '28'
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = colorHex + '18'
        }
      }}
    >
      {label}
    </button>
  )
}

export default function ActionBar({ entity, classifierScore }: Props) {
  const setSelected  = useSentinelStore(s => s.setSelected)
  const entities     = useSentinelStore(s => s.entities)
  const queryClient  = useQueryClient()

  async function decide(decision: string) {
    await api.decide(entity.id, decision, classifierScore)
    queryClient.invalidateQueries({ queryKey: ['entities'] })
    setSelected(null)
  }

  async function command(cmd: string, targetId?: string) {
    await api.command(entity.id, cmd, targetId)
    queryClient.invalidateQueries({ queryKey: ['entities'] })
  }

  const isFriendly      = entity.entity_type === 'friendly'
  const isIncapacitated = entity.status === 'incapacitated'

  const hostileTargets = entities.filter(
    e => (e.entity_type === 'hostile' || e.entity_type === 'ambiguous')
      && e.status !== 'neutralized'
  )

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      padding: 'var(--space-sm) var(--space-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-xs)',
      overflowY: 'auto',
    }}>

      {/* Section heading */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        marginBottom: 'var(--space-xs)',
      }}>
        ACTIONS
      </div>

      {/* Non-friendly: engagement decisions */}
      {!isFriendly && (
        <>
          <ActionButton
            label="APPROVE ENGAGEMENT"
            colorHex="#E24B4A"
            onClick={() => decide('approve')}
          />
          <ActionButton
            label="DENY ENGAGEMENT"
            colorHex="#22c55e"
            onClick={() => decide('deny')}
          />
          <ActionButton
            label="REQUEST MORE INTEL"
            colorHex="#EF9F27"
            onClick={() => decide('more_intel')}
          />
        </>
      )}

      {/* Friendly: tactical commands */}
      {isFriendly && (
        <>
          <ActionButton
            label="FALL BACK"
            colorHex="#EF9F27"
            onClick={() => command('fall_back')}
            disabled={isIncapacitated}
          />
          <ActionButton
            label="HOLD POSITION"
            colorHex="#378ADD"
            onClick={() => command('hold')}
            disabled={isIncapacitated}
          />
          <ActionButton
            label="REQUEST STATUS"
            colorHex="#888780"
            onClick={() => command('request_status')}
            disabled={isIncapacitated}
          />

          {/* Advance & Clear target selector */}
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-hud)',
            marginTop: 'var(--space-sm)',
            marginBottom: 2,
          }}>
            ADVANCE & CLEAR
          </div>

          {hostileTargets.length === 0 ? (
            <span style={{
              fontSize: 'var(--text-label)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
            }}>
              No targets available
            </span>
          ) : (
            hostileTargets.slice(0, 4).map(t => (
              <ActionButton
                key={t.id}
                label={t.unit_name ?? t.id.slice(0, 6).toUpperCase()}
                colorHex="#E24B4A"
                onClick={() => command('advance_clear', t.id)}
                disabled={isIncapacitated}
              />
            ))
          )}

          {/* Incapacitated warning */}
          {isIncapacitated && (
            <div style={{
              fontSize: 'var(--text-label)',
              color: 'var(--color-hostile)',
              fontFamily: 'var(--font-hud)',
              marginTop: 'var(--space-xs)',
              background: '#E24B4A18',
              border: '1px solid #E24B4A33',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-sm)',
              letterSpacing: '0.5px',
              lineHeight: 1.4,
            }}>
              UNIT INCAPACITATED — cannot receive commands
            </div>
          )}
        </>
      )}
    </div>
  )
}