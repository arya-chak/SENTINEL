import { useNavigate } from 'react-router-dom'
import { useSentinelStore } from '../store'

export default function Header() {
  const simState = useSentinelStore(s => s.simState)
  const navigate = useNavigate()

  const dot = (color: string, label: string, count: number) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-label)' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-hud)', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontFamily: 'var(--font-hud)' }}>{count}</span>
    </span>
  )

  return (
    <div style={{
      height: 'var(--header-height)',
      background: 'var(--color-bg-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--space-lg)',
      gap: 'var(--space-xl)',
      flexShrink: 0,
    }}>

      {/* Wordmark */}
      <span style={{
        color: 'var(--color-accent)',
        fontFamily: 'var(--font-hud)',
        fontSize: 'var(--text-wordmark)',
        fontWeight: 700,
        letterSpacing: 3,
      }}>
        SENTINEL
      </span>

      {/* Subtitle */}
      <span style={{
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        fontSize: 10,
        letterSpacing: '0.5px',
      }}>
        Simulated ENtity Threat Intelligence &amp; Engagement Layer
      </span>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
        {simState ? (
          <>
            {dot('var(--color-hostile)',   'HOSTILE',   simState.hostile_count)}
            {dot('var(--color-ambiguous)', 'AMBIGUOUS', simState.ambiguous_count)}
            {dot('var(--color-friendly)',  'FRIENDLY',  simState.friendly_count)}
            {dot('var(--color-civilian)',  'CIVILIAN',  simState.civilian_count)}

            <span style={{
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
              fontSize: 'var(--text-label)',
              marginLeft: 'var(--space-xs)',
              letterSpacing: '0.5px',
            }}>
              T+{Math.floor(simState.sim_time)}s
            </span>

            {/* LIVE / PAUSED indicator */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
              fontFamily: 'var(--font-hud)',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              letterSpacing: 1,
              color: simState.running ? 'var(--color-status-live)' : 'var(--color-status-danger)',
            }}>
              {simState.running
                ? <><span className="sentinel-live-dot" />LIVE</>
                : <>○ PAUSED</>
              }
            </span>
          </>
        ) : (
          <span style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-hud)',
            fontSize: 'var(--text-label)',
            letterSpacing: 1,
          }}>
            CONNECTING...
          </span>
        )}

        <button
          onClick={() => navigate('/debrief')}
          style={{
            background: 'var(--color-bg-overlay)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 12px',
            fontFamily: 'var(--font-hud)',
            fontSize: 'var(--text-label)',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'border-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
          }}
        >
          DEBRIEF
        </button>
      </div>
    </div>
  )
}