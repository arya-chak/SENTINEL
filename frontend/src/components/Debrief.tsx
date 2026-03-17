import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'

const BASE = 'http://localhost:8000/api'

function fetchDebrief() {
  return fetch(`${BASE}/debrief`).then(r => r.json())
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-md) var(--space-lg)',
      minWidth: 120,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-hud)',
        marginBottom: 'var(--space-xs)',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: color ?? 'var(--color-text-primary)',
        fontFamily: 'var(--font-data)',
      }}>
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
      background: 'var(--color-bg-void)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body)',
      padding: 'var(--space-xl) var(--space-2xl)',
    }}>

      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-lg)',
        marginBottom: 28,
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-lg)',
      }}>
        <span style={{
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-hud)',
          fontWeight: 700,
          letterSpacing: 3,
          fontSize: 'var(--text-wordmark)',
        }}>
          SENTINEL
        </span>
        <span style={{
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-hud)',
          fontSize: 'var(--text-label)',
          letterSpacing: '0.5px',
        }}>
          POST-SCENARIO DEBRIEF
        </span>
        <button
          onClick={() => navigate('/')}
          style={{
            marginLeft: 'auto',
            background: 'var(--color-bg-overlay)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            fontSize: 'var(--text-label)',
            fontWeight: 600,
            fontFamily: 'var(--font-hud)',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: `border-color var(--transition-fast), color var(--transition-fast)`,
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
          ← BACK TO OPS
        </button>
      </div>

      {/* Loading / error / empty states */}
      {isLoading && (
        <div style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-body)',
          fontFamily: 'var(--font-hud)',
          letterSpacing: '0.5px',
        }}>
          Loading debrief data...
        </div>
      )}

      {error && (
        <div style={{
          color: 'var(--color-hostile)',
          fontSize: 'var(--text-body)',
          fontFamily: 'var(--font-hud)',
        }}>
          Failed to load debrief data.
        </div>
      )}

      {data && data.message && (
        <div style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-body)',
          fontFamily: 'var(--font-hud)',
          letterSpacing: '0.5px',
        }}>
          {data.message}
        </div>
      )}

      {data && data.total_decisions > 0 && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard label="TOTAL DECISIONS"  value={data.total_decisions} />
            <StatCard label="APPROVED"         value={data.approve_count}    color="#E24B4A" />
            <StatCard label="DENIED"           value={data.deny_count}       color="#22c55e" />
            <StatCard label="MORE INTEL"       value={data.more_intel_count} color="#EF9F27" />
            <StatCard label="AI AGREEMENT"     value={`${Math.round(data.followed_ai_rate * 100)}%`} color="var(--color-accent)" />
            <StatCard label="CASUALTIES"       value={data.friendly_casualties} color={data.friendly_casualties > 0 ? '#E24B4A' : '#22c55e'} />
          </div>

          {/* Radar chart + decision log */}
          <div style={{ display: 'flex', gap: 'var(--space-xl)', marginBottom: 28, alignItems: 'flex-start' }}>

            {/* Radar chart */}
            <div style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              flex: '0 0 360px',
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-hud)',
                marginBottom: 'var(--space-md)',
              }}>
                OPERATOR PROFILE
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-hud)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      fontSize: 10,
                      borderRadius: 4,
                      fontFamily: 'var(--font-hud)',
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
              <div style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                marginTop: 'var(--space-sm)',
                lineHeight: 1.6,
              }}>
                AI agreement rate of {Math.round(data.followed_ai_rate * 100)}% indicates
                {data.followed_ai_rate > 0.7
                  ? ' strong alignment with AI recommendations.'
                  : data.followed_ai_rate > 0.4
                  ? ' moderate independence from AI recommendations.'
                  : ' high operator independence — review decisions for bias patterns.'}
              </div>
            </div>

            {/* Decision log */}
            <div style={{
              flex: 1,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-hud)',
              }}>
                DECISION LOG
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-label)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['ENTITY', 'TYPE', 'DECISION', 'CLASSIFIER', 'AI AGREE', 'T+'].map(h => (
                        <th key={h} style={{
                          padding: 'var(--space-sm) var(--space-md)',
                          textAlign: 'left',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-hud)',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.decision_log.map((d: any, i: number) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)',
                      }}>
                        <td style={{
                          padding: 'var(--space-xs) var(--space-md)',
                          fontFamily: 'var(--font-hud)',
                          color: 'var(--color-text-secondary)',
                          letterSpacing: '0.5px',
                        }}>
                          {d.unit_name ?? d.entity_id.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            fontFamily: 'var(--font-hud)',
                            color: d.entity_type === 'hostile'   ? 'var(--color-hostile)'
                                 : d.entity_type === 'ambiguous' ? 'var(--color-ambiguous)'
                                 : d.entity_type === 'friendly'  ? 'var(--color-friendly)'
                                 : 'var(--color-civilian)',
                          }}>
                            {d.entity_type.toUpperCase().slice(0, 3)}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            fontFamily: 'var(--font-hud)',
                            color: DECISION_COLOR[d.decision] ?? 'var(--color-civilian)',
                            background: (DECISION_COLOR[d.decision] ?? '#888780') + '18',
                            border: `1px solid ${(DECISION_COLOR[d.decision] ?? '#888780')}33`,
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px 5px',
                            letterSpacing: 0.5,
                          }}>
                            {d.decision.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{
                          padding: 'var(--space-xs) var(--space-md)',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-data)',
                        }}>
                          {(d.classifier_score * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                          <span style={{
                            color: d.followed_ai ? '#22c55e' : '#E24B4A',
                            fontFamily: 'var(--font-hud)',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            {d.followed_ai ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td style={{
                          padding: 'var(--space-xs) var(--space-md)',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-data)',
                        }}>
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