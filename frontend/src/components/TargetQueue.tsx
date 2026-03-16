import { useState } from 'react'
import { useSentinelStore } from '../store'
import type { Entity } from '../types'

const TYPE_COLOR: Record<string, string> = {
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

const COMMAND_META: Record<string, { label: string; color: string; icon: string }> = {
  hold:           { label: 'HOLD',     color: '#94a3b8', icon: '◼' },
  fall_back:      { label: 'FALL BACK', color: '#EF9F27', icon: '↩' },
  advance_clear:  { label: 'ADVANCE',  color: '#E24B4A', icon: '↗' },
  request_status: { label: 'STATUS',   color: '#888780', icon: '⟳' },
}

const STATUS_COLOR: Record<string, string> = {
  active:        '#22c55e',
  holding:       '#94a3b8',
  advancing:     '#E24B4A',
  falling_back:  '#EF9F27',
  neutralized:   '#E24B4A',
  incapacitated: '#E24B4A',
}

function CommandBadge({ command }: { command: string }) {
  const meta = COMMAND_META[command]
  if (!meta) return null
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      color: meta.color,
      background: meta.color + '18',
      border: `1px solid ${meta.color}44`,
      borderRadius: 3, padding: '1px 5px',
      letterSpacing: 0.5,
      display: 'flex', alignItems: 'center', gap: 3,
    }}>
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  )
}

function QueueRow({ entity }: { entity: Entity }) {
  const selectedId = useSentinelStore(s => s.selectedEntityId)
  const setSelected = useSentinelStore(s => s.setSelected)
  const color = TYPE_COLOR[entity.entity_type]
  const isSelected = selectedId === entity.id
  const isFriendly = entity.entity_type === 'friendly'
  const isIncapacitated = entity.status === 'incapacitated'

  return (
    <div
      onClick={() => setSelected(entity.id)}
      style={{
        borderLeft: `3px solid ${isIncapacitated ? '#E24B4A' : color}`,
        background: isSelected ? color + '18' : 'transparent',
        padding: '8px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid #1a1a2e',
        transition: 'background 0.15s',
        opacity: entity.status === 'neutralized' ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = '#ffffff08'
      }}
      onMouseLeave={e => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Row 1: type badge + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color,
          background: color + '22', borderRadius: 2,
          padding: '1px 4px', letterSpacing: 1,
        }}>
          {TYPE_LABEL[entity.entity_type]}
        </span>
        <span style={{
          fontSize: 11, color: '#e2e8f0',
          fontFamily: 'monospace', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entity.unit_name ?? entity.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Row 2: status + command (friendly) or time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        {isFriendly ? (
          <>
            {isIncapacitated ? (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#E24B4A',
                background: '#E24B4A18', border: '1px solid #E24B4A33',
                borderRadius: 3, padding: '1px 5px', letterSpacing: 0.5,
              }}>
                ✕ INCAPACITATED
              </span>
            ) : (
              entity.command && <CommandBadge command={entity.command} />
            )}
            <span style={{ fontSize: 10, color: '#4a5568', marginLeft: 'auto' }}>
              {Math.floor(entity.time_alive)}s
            </span>
          </>
        ) : (
          <>
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: STATUS_COLOR[entity.status] ?? '#888780',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              {entity.status.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 10, color: '#4a5568' }}>
              {Math.floor(entity.time_alive)}s
            </span>
          </>
        )}
      </div>

      {/* Row 3: advancing target info (friendly only) */}
      {isFriendly && entity.command === 'advance_clear' && entity.assigned_target_id && (
        <div style={{
          marginTop: 4, fontSize: 9, color: '#E24B4A88',
          fontFamily: 'monospace', letterSpacing: 0.5,
        }}>
          TGT: {entity.assigned_target_id.slice(0, 8).toUpperCase()}
        </div>
      )}

      {/* Row 3: status for advancing/falling back */}
      {isFriendly && !isIncapacitated && entity.status !== 'holding' && (
        <div style={{
          marginTop: 3,
          fontSize: 9,
          color: STATUS_COLOR[entity.status] ?? '#888780',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
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

  const filterBtn = (label: string, value: FilterType, color?: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      style={{
        background: filter === value ? (color ? color + '33' : '#ffffff18') : 'transparent',
        border: `1px solid ${filter === value ? (color ?? '#ffffff44') : '#1e2035'}`,
        color: filter === value ? (color ?? '#e2e8f0') : '#4a5568',
        borderRadius: 3, padding: '2px 6px',
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: '#0d0d18',
      borderRight: '1px solid #1e2035',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid #1e2035',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: '#4a5568', marginBottom: 6,
        }}>
          TARGET QUEUE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
          {filterBtn('ALL', 'all')}
          {filterBtn('HST', 'hostile',   '#E24B4A')}
          {filterBtn('AMB', 'ambiguous', '#EF9F27')}
          {filterBtn('FRN', 'friendly',  '#378ADD')}
          {filterBtn('CVL', 'civilian',  '#888780')}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {(['type', 'time'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                background: sortBy === s ? '#ffffff18' : 'transparent',
                border: `1px solid ${sortBy === s ? '#ffffff44' : '#1e2035'}`,
                color: sortBy === s ? '#e2e8f0' : '#4a5568',
                borderRadius: 3, padding: '2px 6px',
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                cursor: 'pointer',
              }}
            >
              {s === 'type' ? 'BY TYPE' : 'BY TIME'}
            </button>
          ))}
        </div>
      </div>

      {/* Entity list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 16, textAlign: 'center',
            color: '#2d3748', fontSize: 11,
          }}>
            No entities
          </div>
        ) : (
          filtered.map(e => <QueueRow key={e.id} entity={e} />)
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 10px',
        borderTop: '1px solid #1e2035',
        fontSize: 10, color: '#4a5568',
        flexShrink: 0,
      }}>
        {filtered.length} entities
      </div>
    </div>
  )
}
