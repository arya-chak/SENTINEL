import { useState } from 'react'
import { useSentinelStore } from '../store'
import type { Entity } from '../types'

const TYPE_COLOR: Record<string, string> = {
  hostile:   'var(--color-hostile)',
  ambiguous: 'var(--color-ambiguous)',
  friendly:  'var(--color-friendly)',
  civilian:  'var(--color-civilian)',
}

const TYPE_COLOR_HEX: Record<string, string> = {
  hostile:   '#E24B4A',
  ambiguous: '#EF9F27',
  friendly:  '#378ADD',
  civilian:  '#888780',
}

const TYPE_LABEL: Record<string, string> = {
  hostile:   'HST',
  ambiguous: 'AMB',
  friendly:  'FRN',
  civilian:  'CVL',
}

const COMMAND_META: Record<string, { label: string; color: string }> = {
  hold:           { label: 'HOLD',      color: 'var(--color-text-secondary)' },
  fall_back:      { label: 'FALL BACK', color: 'var(--color-ambiguous)' },
  advance_clear:  { label: 'ADVANCE',   color: 'var(--color-hostile)' },
  request_status: { label: 'STATUS',    color: 'var(--color-civilian)' },
}

const STATUS_COLOR: Record<string, string> = {
  active:        'var(--color-text-secondary)',
  holding:       'var(--color-text-secondary)',
  advancing:     'var(--color-hostile)',
  falling_back:  'var(--color-ambiguous)',
  neutralized:   'var(--color-hostile)',
  incapacitated: 'var(--color-hostile)',
}

function CommandBadge({ command }: { command: string }) {
  const meta = COMMAND_META[command]
  if (!meta) return null
  const hex = {
    'var(--color-text-secondary)': '#94a3b8',
    'var(--color-ambiguous)':      '#EF9F27',
    'var(--color-hostile)':        '#E24B4A',
    'var(--color-civilian)':       '#888780',
  }[meta.color] ?? '#94a3b8'

  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      color: meta.color,
      background: hex + '18',
      border: `1px solid ${hex}44`,
      borderRadius: 'var(--radius-sm)',
      padding: '1px 5px',
      letterSpacing: 0.5,
      fontFamily: 'var(--font-hud)',
      display: 'inline-flex', alignItems: 'center',
    }}>
      {meta.label}
    </span>
  )
}

function QueueRow({ entity }: { entity: Entity }) {
  const selectedId = useSentinelStore(s => s.selectedEntityId)
  const setSelected = useSentinelStore(s => s.setSelected)
  const colorVar = TYPE_COLOR[entity.entity_type]
  const colorHex = TYPE_COLOR_HEX[entity.entity_type]
  const isSelected = selectedId === entity.id
  const isFriendly = entity.entity_type === 'friendly'
  const isIncapacitated = entity.status === 'incapacitated'
  const borderColor = isIncapacitated ? '#E24B4A' : colorHex

  return (
    <div
      onClick={() => setSelected(entity.id)}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: isSelected ? colorHex + '18' : 'transparent',
        padding: 'var(--space-sm) var(--space-md)',
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-border-subtle)',
        transition: `background var(--transition-fast)`,
        opacity: entity.status === 'neutralized' ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-elevated)'
      }}
      onMouseLeave={e => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Row 1: type badge + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: colorVar,
          background: colorHex + '22',
          borderRadius: 'var(--radius-sm)',
          padding: '1px 4px',
          letterSpacing: 1,
          fontFamily: 'var(--font-hud)',
        }}>
          {TYPE_LABEL[entity.entity_type]}
        </span>
        <span style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-hud)',
          flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '0.5px',
        }}>
          {entity.unit_name ?? entity.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Row 2: status + time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-xs)' }}>
        {isFriendly ? (
          <>
            {isIncapacitated ? (
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: 'var(--color-hostile)',
                background: '#E24B4A18',
                border: '1px solid #E24B4A33',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 5px',
                letterSpacing: 0.5,
                fontFamily: 'var(--font-hud)',
              }}>
                INCAPACITATED
              </span>
            ) : (
              entity.command && <CommandBadge command={entity.command} />
            )}
            <span style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
              marginLeft: 'auto',
            }}>
              {Math.floor(entity.time_alive)}s
            </span>
          </>
        ) : (
          <>
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: STATUS_COLOR[entity.status] ?? 'var(--color-civilian)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontFamily: 'var(--font-hud)',
            }}>
              {entity.status.replace(/_/g, ' ')}
            </span>
            <span style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
            }}>
              {Math.floor(entity.time_alive)}s
            </span>
          </>
        )}
      </div>

      {/* Row 3: advance target info */}
      {isFriendly && entity.command === 'advance_clear' && entity.assigned_target_id && (
        <div style={{
          marginTop: 'var(--space-xs)',
          fontSize: 9,
          color: '#E24B4A88',
          fontFamily: 'var(--font-hud)',
          letterSpacing: 0.5,
        }}>
          TGT: {entity.assigned_target_id.slice(0, 8).toUpperCase()}
        </div>
      )}

      {/* Row 3: movement status */}
      {isFriendly && !isIncapacitated && entity.status !== 'holding' && (
        <div style={{
          marginTop: 3,
          fontSize: 9,
          color: STATUS_COLOR[entity.status] ?? 'var(--color-civilian)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-hud)',
        }}>
          {entity.status.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  )
}

type FilterType = 'all' | 'hostile' | 'ambiguous' | 'friendly' | 'civilian'

export default function TargetQueue() {
  const entities = useSentinelStore(s => s.entities)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'type' | 'time'>('type')

  const filtered = entities
    .filter(e => filter === 'all' || e.entity_type === filter)
    .filter(e => e.status !== 'neutralized')
    .sort((a, b) => {
      if (sortBy === 'time') return b.time_alive - a.time_alive
      const order = { hostile: 0, ambiguous: 1, friendly: 2, civilian: 3 }
      return (order[a.entity_type as keyof typeof order] ?? 4) -
             (order[b.entity_type as keyof typeof order] ?? 4)
    })

  const filterBtn = (label: string, value: FilterType, colorHex?: string) => {
    const isActive = filter === value
    return (
      <button
        key={value}
        onClick={() => setFilter(value)}
        style={{
          background: isActive ? (colorHex ? colorHex + '28' : 'var(--color-bg-overlay)') : 'transparent',
          border: `1px solid ${isActive ? (colorHex ?? 'var(--color-border)') : 'var(--color-border)'}`,
          color: isActive ? (colorHex ?? 'var(--color-text-primary)') : 'var(--color-text-muted)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          fontFamily: 'var(--font-hud)',
          cursor: 'pointer',
          transition: `color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast)`,
        }}
      >
        {label}
      </button>
    )
  }

  const sortBtn = (label: string, value: 'type' | 'time') => {
    const isActive = sortBy === value
    return (
      <button
        key={value}
        onClick={() => setSortBy(value)}
        style={{
          background: isActive ? 'var(--color-bg-overlay)' : 'transparent',
          border: `1px solid ${isActive ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          fontFamily: 'var(--font-hud)',
          cursor: 'pointer',
          transition: `color var(--transition-fast), border-color var(--transition-fast)`,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{
      width: 'var(--queue-width)',
      flexShrink: 0,
      background: 'var(--color-bg-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Panel header */}
      <div style={{
        padding: 'var(--space-sm) var(--space-md)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-hud)',
          marginBottom: 'var(--space-sm)',
        }}>
          TARGET QUEUE
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
          {filterBtn('ALL', 'all')}
          {filterBtn('HST', 'hostile',   '#E24B4A')}
          {filterBtn('AMB', 'ambiguous', '#EF9F27')}
          {filterBtn('FRN', 'friendly',  '#378ADD')}
          {filterBtn('CVL', 'civilian',  '#888780')}
        </div>

        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: 3 }}>
          {sortBtn('BY TYPE', 'type')}
          {sortBtn('BY TIME', 'time')}
        </div>
      </div>

      {/* Entity list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-hud)',
            fontSize: 'var(--text-label)',
          }}>
            No entities
          </div>
        ) : (
          filtered.map(e => <QueueRow key={e.id} entity={e} />)
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px var(--space-md)',
        borderTop: '1px solid var(--color-border)',
        fontSize: 'var(--text-label)',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}>
        {filtered.length} entities
      </div>
    </div>
  )
}