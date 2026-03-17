import { Brain, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

interface Props {
  llmResult: any
  loading: boolean
  error: string | null
  onExplain: () => void
}

function RiskBadge({ risk }: { risk: string }) {
  const hex =
    risk === 'high'   ? '#E24B4A' :
    risk === 'medium' ? '#EF9F27' : '#22c55e'
  return (
    <span style={{
      fontSize: 'var(--text-label)',
      fontWeight: 700,
      color: hex,
      background: hex + '22',
      border: `1px solid ${hex}44`,
      borderRadius: 'var(--radius-sm)',
      padding: '1px 6px',
      letterSpacing: 1,
      fontFamily: 'var(--font-hud)',
    }}>
      {risk.toUpperCase()} CIVILIAN RISK
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const isApprove = action === 'approve_engagement'
  const isDeny    = action === 'deny_engagement'
  const hex   = isApprove ? '#E24B4A' : isDeny ? '#22c55e' : '#EF9F27'
  const label = isApprove ? 'APPROVE'  : isDeny ? 'DENY'    : 'MORE INTEL'
  return (
    <span style={{
      fontSize: 'var(--text-label)',
      fontWeight: 700,
      color: hex,
      background: hex + '22',
      border: `1px solid ${hex}44`,
      borderRadius: 'var(--radius-sm)',
      padding: '1px 6px',
      letterSpacing: 1,
      fontFamily: 'var(--font-hud)',
    }}>
      AI: {label}
    </span>
  )
}

export default function LLMExplainer({ llmResult, loading, error, onExplain }: Props) {
  const explanation  = llmResult?.llm_explanation
  const disagreement = llmResult?.disagreement

  return (
    <div style={{
      flex: 1,
      padding: 'var(--space-sm) var(--space-md)',
      borderRight: '1px solid var(--color-border)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-hud)',
        }}>
          AI ANALYSIS
        </div>

        {!explanation && (
          <button
            onClick={onExplain}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              background: loading ? 'var(--color-bg-overlay)' : 'var(--color-accent-dim)',
              border: '1px solid #378ADD44',
              color: loading ? 'var(--color-text-muted)' : 'var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              fontFamily: 'var(--font-hud)',
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.5px',
              transition: `all var(--transition-fast)`,
            }}
          >
            <Brain size={12} />
            {loading ? 'Analysing...' : 'Explain'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 'var(--text-label)',
          color: 'var(--color-hostile)',
          fontFamily: 'var(--font-hud)',
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!explanation && !loading && !error && (
        <div style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          marginTop: 'var(--space-xs)',
          lineHeight: 1.5,
        }}>
          Click Explain to request AI analysis from Claude.
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-hud)',
          marginTop: 'var(--space-xs)',
          letterSpacing: '0.5px',
        }}>
          Sending to Claude API... (~2–4s)
        </div>
      )}

      {explanation && (
        <>
          {/* Disagreement banner */}
          {disagreement && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-xs)',
              background: '#EF9F2718',
              border: '1px solid #EF9F2744',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-sm)',
            }}>
              <AlertTriangle size={12} color="#EF9F27" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{
                fontSize: 'var(--text-body-sm)',
                color: 'var(--color-ambiguous)',
                lineHeight: 1.4,
                fontFamily: 'var(--font-body)',
              }}>
                {llmResult.disagreement_detail}
              </span>
            </div>
          )}

          {/* Action + risk badges */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <ActionBadge action={explanation.recommended_action} />
            <RiskBadge   risk={explanation.civilian_risk} />
          </div>

          {/* Summary */}
          <div style={{
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
          }}>
            {explanation.summary}
          </div>

          {/* Reasoning chain */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {explanation.reasoning?.map((step: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  background: 'var(--color-accent-dim)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 5px',
                  flexShrink: 0,
                  marginTop: 1,
                  fontFamily: 'var(--font-hud)',
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: 'var(--text-body-sm)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.5,
                }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Classifier agreement */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 2 }}>
            {explanation.agrees_with_classifier
              ? <CheckCircle size={11} color="#22c55e" />
              : <HelpCircle  size={11} color="#EF9F27" />
            }
            <span style={{
              fontSize: 'var(--text-body-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.5px',
            }}>
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