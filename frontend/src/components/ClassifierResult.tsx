import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface Props {
  scoreData: any
  loading: boolean
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 4, background: '#1e2035', borderRadius: 2 }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${value * 100}%`,
          background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

export default function ClassifierResult({ scoreData, loading }: Props) {
  if (loading) return (
    <div style={{
      width: 240, flexShrink: 0, padding: 16,
      color: '#4a5568', fontSize: 11,
      borderRight: '1px solid #1e2035',
    }}>
      Loading classifier...
    </div>
  )

  if (!scoreData) return (
    <div style={{
      width: 240, flexShrink: 0, padding: 16,
      color: '#4a5568', fontSize: 11,
      borderRight: '1px solid #1e2035',
    }}>
      No score data
    </div>
  )

  const threatColor =
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
      width: 240, flexShrink: 0, padding: '10px 14px',
      borderRight: '1px solid #1e2035', overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 2,
        color: '#4a5568', marginBottom: 10,
      }}>
        CLASSIFIER
      </div>

      <ScoreBar label="THREAT SCORE" value={scoreData.threat_score} color={threatColor} />
      <ScoreBar label="CONFIDENCE"   value={scoreData.confidence}   color="#378ADD" />

      <div style={{
        marginTop: 8, marginBottom: 10,
        fontSize: 11, fontWeight: 700, color: threatColor,
        background: threatColor + '18',
        border: `1px solid ${threatColor}33`,
        borderRadius: 4, padding: '3px 8px',
        display: 'inline-block', letterSpacing: 1,
      }}>
        {scoreData.label.toUpperCase()}
      </div>

      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 2,
        color: '#4a5568', marginBottom: 6, marginTop: 4,
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
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0f0f1a',
              border: '1px solid #1e2035',
              fontSize: 10,
              borderRadius: 4,
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
