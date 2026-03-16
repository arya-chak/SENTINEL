import { useNavigate } from 'react-router-dom'
import { useSentinelStore } from '../store'

export default function Header() {
  const simState = useSentinelStore(s => s.simState)
  const navigate = useNavigate()

  const dot = (color: string, label: string, count: number) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{count}</span>
    </span>
  )

  return (
    <div style={{
      height: 48,
      background: '#0f0f1a',
      borderBottom: '1px solid #1e2035',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 24,
      flexShrink: 0,
    }}>
      <span style={{ color: '#378ADD', fontWeight: 700, letterSpacing: 2, fontSize: 14 }}>
        SENTINEL
      </span>
      <span style={{ color: '#2d3748', fontSize: 12 }}>
        Simulated ENtity Threat Intelligence &amp; Engagement Layer
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
        {simState ? (
          <>
            {dot('#E24B4A', 'HOSTILE',   simState.hostile_count)}
            {dot('#EF9F27', 'AMBIGUOUS', simState.ambiguous_count)}
            {dot('#378ADD', 'FRIENDLY',  simState.friendly_count)}
            {dot('#888780', 'CIVILIAN',  simState.civilian_count)}
            <span style={{ color: '#4a5568', fontSize: 11, marginLeft: 8 }}>
              T+{Math.floor(simState.sim_time)}s
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 1,
              color: simState.running ? '#22c55e' : '#ef4444',
            }}>
              {simState.running ? '● LIVE' : '○ PAUSED'}
            </span>
          </>
        ) : (
          <span style={{ color: '#4a5568', fontSize: 11 }}>CONNECTING...</span>
        )}

        <button
          onClick={() => navigate('/debrief')}
          style={{
            background: '#1e2035',
            border: '1px solid #2d3748',
            color: '#94a3b8',
            borderRadius: 4, padding: '5px 12px',
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', letterSpacing: 0.5,
            marginLeft: 8,
          }}
        >
          DEBRIEF
        </button>
      </div>
    </div>
  )
}
