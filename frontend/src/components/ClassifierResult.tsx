import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface Props {
  scoreData: any
  loading: boolean
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{
          fontSize: 'var(--text-label)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-hud)',
          letterSpacing: '0.5px',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 'var(--text-label)',
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-data)',
        }}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--color-bg-overlay)', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          borderRadius: 2,
          width: `${value * 100}%`,
          background: color,
          transition: `width var(--transition-slow)`,
        }} />
      </div>
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  padding: 'var(--space-lg)',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--text-label)',
  fontFamily: 'var(--font-hud)',
  borderRight: '1px solid var(--color-border)',
}

export default function ClassifierResult({ scoreData, loading }: Props) {
  if (loading) return <div style={emptyStyle}>Loading classifier...</div>
  if (!scoreData) return <div style={emptyStyle}>No score data</div>

  const threatColor =
    scoreData.threat_score > 0.7 ? 'var(--color-hostile)'   :
    scoreData.threat_score > 0.4 ? 'var(--color-ambiguous)' :
                                   'var(--color-status-live)'

  const threatColorHex =
    scoreData.threat_score > 0.7 ? '#E24B4A' :
    scoreData.threat_score > 0.4 ? '#EF9F27' : '#22c55e'

  const topFeatures = Object.entries(
    scoreData.feature_importance as Record<string, number>
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({
      name: name.replace(/^has_/, '').replace(/_/g, ' '),
      value: parseFloat((value * 100).toFixed(1)),
    }))

  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      padding: 'var(--space-sm) var(--space-md)',
      borderRight: '1px solid var(--color-border)',
      overflowY: 'auto',
    }}>

      {/* Section heading */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        marginBottom: 'var(--space-sm)',
      }}>
        CLASSIFIER
      </div>

      <ScoreBar label="THREAT SCORE" value={scoreData.threat_score} color={threatColorHex} />
      <ScoreBar label="CONFIDENCE"   value={scoreData.confidence}   color="#378ADD" />

      {/* Threat label badge */}
      <div style={{
        marginTop: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
        fontSize: 'var(--text-label)',
        fontWeight: 700,
        color: threatColor,
        background: threatColorHex + '18',
        border: `1px solid ${threatColorHex}33`,
        borderRadius: 'var(--radius-md)',
        padding: '3px 8px',
        display: 'inline-block',
        letterSpacing: 1,
        fontFamily: 'var(--font-hud)',
      }}>
        {scoreData.label.toUpperCase()}
      </div>

      {/* Feature importance heading */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        marginBottom: 'var(--space-xs)',
        marginTop: 'var(--space-xs)',
      }}>
        FEATURE IMPORTANCE
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <BarChart
          data={topFeatures}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 35]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-hud)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              fontSize: 10,
              borderRadius: 4,
              fontFamily: 'var(--font-hud)',
            }}
            formatter={(v: any) => [`${v}%`, 'importance']}
            cursor={{ fill: '#ffffff08' }}
          />
          <Bar dataKey="value" radius={2} barSize={8}>
            {topFeatures.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#378ADD' : '#1e3a5f'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}