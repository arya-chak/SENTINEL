import { Brain, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

interface Props {
  llmResult: any
  loading: boolean
  error: string | null
  onExplain: () => void
}

function RiskBadge({ risk }: { risk: string }) {
  const color = risk === 'high' ? '#E24B4A' : risk === 'medium' ? '#EF9F27' : '#22c55e'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: color + '22',
      border: `1px solid ${color}44`,
      borderRadius: 3, padding: '1px 6px', letterSpacing: 1,
    }}>
      {risk.toUpperCase()} CIVILIAN RISK
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const isApprove = action === 'approve_engagement'
  const isDeny = action === 'deny_engagement'
  const color = isApprove ? '#E24B4A' : isDeny ? '#22c55e' : '#EF9F27'
  const label = isApprove ? 'APPROVE' : isDeny ? 'DENY' : 'MORE INTEL'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: color + '22',
      border: `1px solid ${color}44`,
      borderRadius: 3, padding: '1px 6px', letterSpacing: 1,
    }}>
      AI: {label}
    </span>
  )
}

export default function LLMExplainer({ llmResult, loading, error, onExplain }: Props) {
  const explanation = llmResult?.llm_explanation
  const disagreement = llmResult?.disagreement

  return (
    <div style={{
      flex: 1, padding: '10px 14px',
      borderRight: '1px solid #1e2035',
      overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#4a5568' }}>
          AI ANALYSIS
        </div>
        {!explanation && (
          <button
            onClick={onExplain}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: loading ? '#1e2035' : '#1e3a5f',
              border: '1px solid #378ADD44',
              color: loading ? '#4a5568' : '#378ADD',
              borderRadius: 4, padding: '4px 10px',
              fontSize: 11, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Brain size={12} />
            {loading ? 'Analysing...' : 'Explain'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#E24B4A' }}>{error}</div>
      )}

      {!explanation && !loading && !error && (
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
          Click Explain to request AI analysis from Claude.
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
          Sending to Claude API... (~2-4s)
        </div>
      )}

      {explanation && (
        <>
          {/* Disagreement banner */}
          {disagreement && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              background: '#EF9F2718', border: '1px solid #EF9F2744',
              borderRadius: 4, padding: '6px 8px',
            }}>
              <AlertTriangle size={12} color="#EF9F27" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 10, color: '#EF9F27', lineHeight: 1.4 }}>
                {llmResult.disagreement_detail}
              </span>
            </div>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ActionBadge action={explanation.recommended_action} />
            <RiskBadge risk={explanation.civilian_risk} />
          </div>

          {/* Summary */}
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {explanation.summary}
          </div>

          {/* Reasoning chain */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {explanation.reasoning?.map((step: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: '#378ADD',
                  background: '#378ADD22', borderRadius: 2,
                  padding: '1px 5px', flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Agrees with classifier */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {explanation.agrees_with_classifier
              ? <CheckCircle size={11} color="#22c55e" />
              : <HelpCircle size={11} color="#EF9F27" />
            }
            <span style={{ fontSize: 10, color: '#4a5568' }}>
              {explanation.agrees_with_classifier
                ? 'LLM agrees with classifier'
                : 'LLM disagrees with classifier'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
