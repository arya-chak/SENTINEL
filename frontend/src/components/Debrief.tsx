import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import { api } from '../api'

const BASE = 'http://localhost:8000/api'

function fetchDebrief() {
  return fetch(`${BASE}/debrief`).then(r => r.json())
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: '#0f0f1a',
      border: '1px solid #1e2035',
      borderRadius: 6, padding: '12px 16px',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#4a5568', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? '#e2e8f0' }}>
        {value}
      </div>
    </div>
  )
}

const DECISION_COLOR: Record<string, string> = {
  approve:    '#E24B4A',
  deny:       '#22c55e',
  more_intel: '#EF9F27',
}

export default function Debrief() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['debrief'],
    queryFn: fetchDebrief,
  })

  const radarData = data && data.total_decisions > 0 ? [
    { metric: 'Approvals',    value: Math.round((data.approve_count / data.total_decisions) * 100) },
    { metric: 'Denials',      value: Math.round((data.deny_count / data.total_decisions) * 100) },
    { metric: 'More Intel',   value: Math.round((data.more_intel_count / data.total_decisions) * 100) },
    { metric: 'AI Agreement', value: Math.round(data.followed_ai_rate * 100) },
    { metric: 'Decisiveness', value: Math.round(((data.approve_count + data.deny_count) / data.total_decisions) * 100) },
  ] : []

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      padding: '24px 32px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 28,
        borderBottom: '1px solid #1e2035',
        paddingBottom: 16,
      }}>
        <span style={{ color: '#378ADD', fontWeight: 700, letterSpacing: 2, fontSize: 14 }}>
          SENTINEL
        </span>
        <span style={{ color: '#4a5568', fontSize: 12 }}>
          POST-SCENARIO DEBRIEF
        </span>
        <button
          onClick={() => navigate('/')}
          style={{
            marginLeft: 'auto',
            background: '#1e2035', border: '1px solid #2d3748',
            color: '#94a3b8', borderRadius: 4,
            padding: '6px 14px', fontSize: 11,
            fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5,
          }}
        >
          ← BACK TO OPS
        </button>
      </div>

      {isLoading && (
        <div style={{ color: '#4a5568', fontSize: 13 }}>Loading debrief data...</div>
      )}

      {error && (
        <div style={{ color: '#E24B4A', fontSize: 13 }}>Failed to load debrief data.</div>
      )}

      {data && data.message && (
        <div style={{ color: '#4a5568', fontSize: 13 }}>{data.message}</div>
      )}

      {data && data.total_decisions > 0 && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard label="TOTAL DECISIONS"   value={data.total_decisions} />
            <StatCard label="APPROVED"          value={data.approve_count}   color="#E24B4A" />
            <StatCard label="DENIED"            value={data.deny_count}      color="#22c55e" />
            <StatCard label="MORE INTEL"        value={data.more_intel_count} color="#EF9F27" />
            <StatCard label="AI AGREEMENT"      value={`${Math.round(data.followed_ai_rate * 100)}%`} color="#378ADD" />
            <StatCard label="CASUALTIES"        value={data.friendly_casualties} color={data.friendly_casualties > 0 ? '#E24B4A' : '#22c55e'} />
          </div>

          {/* Radar chart + decision log side by side */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start' }}>

            {/* Radar chart */}
            <div style={{
              background: '#0d0d18',
              border: '1px solid #1e2035',
              borderRadius: 8, padding: '16px',
              flex: '0 0 360px',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 2,
                color: '#4a5568', marginBottom: 12,
              }}>
                OPERATOR PROFILE
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#1e2035" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f0f1a',
                      border: '1px solid #1e2035',
                      fontSize: 10, borderRadius: 4,
                    }}
                    formatter={(v: any) => [`${v}%`]}
                  />
                  <Radar
                    name="Operator"
                    dataKey="value"
                    stroke="#378ADD"
                    fill="#378ADD"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 10, color: '#4a5568', marginTop: 8, lineHeight: 1.6 }}>
                AI agreement rate of {Math.round(data.followed_ai_rate * 100)}% indicates
                {data.followed_ai_rate > 0.7 ? ' strong alignment with AI recommendations.'
                  : data.followed_ai_rate > 0.4 ? ' moderate independence from AI recommendations.'
                  : ' high operator independence — review decisions for bias patterns.'}
              </div>
            </div>

            {/* Decision log */}
            <div style={{
              flex: 1,
              background: '#0d0d18',
              border: '1px solid #1e2035',
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1e2035',
                fontSize: 9, fontWeight: 700,
                letterSpacing: 2, color: '#4a5568',
              }}>
                DECISION LOG
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e2035' }}>
                      {['ENTITY', 'TYPE', 'DECISION', 'CLASSIFIER', 'AI AGREE', 'T+'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left',
                          fontSize: 9, fontWeight: 700,
                          letterSpacing: 1, color: '#4a5568',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.decision_log.map((d: any, i: number) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid #0f0f1a',
                        background: i % 2 === 0 ? 'transparent' : '#ffffff04',
                      }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                          {d.unit_name ?? d.entity_id.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: d.entity_type === 'hostile' ? '#E24B4A'
                              : d.entity_type === 'ambiguous' ? '#EF9F27'
                              : d.entity_type === 'friendly' ? '#378ADD' : '#888780',
                          }}>
                            {d.entity_type.toUpperCase().slice(0, 3)}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: DECISION_COLOR[d.decision] ?? '#888780',
                            background: (DECISION_COLOR[d.decision] ?? '#888780') + '18',
                            border: `1px solid ${(DECISION_COLOR[d.decision] ?? '#888780')}33`,
                            borderRadius: 3, padding: '1px 5px', letterSpacing: 0.5,
                          }}>
                            {d.decision.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', color: '#64748b', fontFamily: 'monospace' }}>
                          {(d.classifier_score * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ color: d.followed_ai ? '#22c55e' : '#E24B4A', fontSize: 12 }}>
                            {d.followed_ai ? '✓' : '✕'}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', color: '#4a5568' }}>
                          {Math.floor(d.sim_time)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
