import { useState, useEffect, useRef } from 'react'
import { Brain, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

interface Props {
  entityId: string
  // llmResult / loading / error / onExplain are gone —
  // the component owns its own streaming state now
}

function RiskBadge({ risk }: { risk: string }) {
  const hex =
    risk === 'high'   ? '#E24B4A' :
    risk === 'medium' ? '#EF9F27' : '#22c55e'
  return (
    <span style={{
      fontSize: 'var(--text-label)', fontWeight: 700,
      color: hex, background: hex + '22',
      border: `1px solid ${hex}44`,
      borderRadius: 'var(--radius-sm)', padding: '1px 6px',
      letterSpacing: 1, fontFamily: 'var(--font-hud)',
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
      fontSize: 'var(--text-label)', fontWeight: 700,
      color: hex, background: hex + '22',
      border: `1px solid ${hex}44`,
      borderRadius: 'var(--radius-sm)', padding: '1px 6px',
      letterSpacing: 1, fontFamily: 'var(--font-hud)',
    }}>
      AI: {label}
    </span>
  )
}

export default function LLMExplainer({ entityId }: Props) {
  const [streamingText, setStreamingText] = useState('')       // phase 1 prose
  const [structured,    setStructured]    = useState<any>(null) // phase 2 result
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  // Reset all state when the entity changes
  useEffect(() => {
    esRef.current?.close()
    esRef.current = null
    setStreamingText('')
    setStructured(null)
    setLoading(false)
    setError(null)
  }, [entityId])

  // Cleanup on unmount
  useEffect(() => {
    return () => { esRef.current?.close() }
  }, [])

  function handleExplain() {
    if (loading) return
    setLoading(true)
    setStreamingText('')
    setStructured(null)
    setError(null)

    const es = new EventSource(
      `http://localhost:8000/api/entities/${entityId}/explain/stream`
    )
    esRef.current = es

    es.onmessage = (event) => {
      const data = event.data

      if (data === '[DONE]') {
        setLoading(false)
        es.close()
        return
      }

      if (data.startsWith('[STRUCTURED] ')) {
        const json = data.slice('[STRUCTURED] '.length)
        try {
          setStructured(JSON.parse(json))
        } catch {
          setError('Failed to parse structured response')
        }
        return
      }

      // Phase 1: prose tokens — append to streaming text
      setStreamingText(prev => prev + data)
    }

    es.onerror = () => {
      setError('Stream connection failed')
      setLoading(false)
      es.close()
    }
  }

  const explanation  = structured?.llm_explanation
  const disagreement = structured?.disagreement

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
          fontSize: 9, fontWeight: 700, letterSpacing: 2,
          color: 'var(--color-text-muted)', fontFamily: 'var(--font-hud)',
        }}>
          AI ANALYSIS
        </div>

        {!explanation && (
          <button
            onClick={handleExplain}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
              background: loading ? 'var(--color-bg-overlay)' : 'var(--color-accent-dim)',
              border: '1px solid #378ADD44',
              color: loading ? 'var(--color-text-muted)' : 'var(--color-accent)',
              borderRadius: 'var(--radius-md)', padding: '4px 10px',
              fontSize: 'var(--text-label)', fontWeight: 600,
              fontFamily: 'var(--font-hud)', cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.5px', transition: `all var(--transition-fast)`,
            }}
          >
            <Brain size={12} />
            {loading ? 'Analysing...' : 'Explain'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-hostile)', fontFamily: 'var(--font-hud)' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!streamingText && !explanation && !loading && !error && (
        <div style={{
          fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)', marginTop: 'var(--space-xs)', lineHeight: 1.5,
        }}>
          Click Explain to request AI analysis from Claude.
        </div>
      )}

      {/* Phase 1: streaming prose with blinking cursor */}
      {streamingText && !explanation && (
        <div style={{
          fontSize: 'var(--text-body-sm)', color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: 1.7,
        }}>
          {streamingText}
          {loading && (
            <span style={{
              display: 'inline-block', width: 8, height: 13,
              background: 'var(--color-accent)', marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'sentinel-blink 0.8s step-start infinite',
            }} />
          )}
        </div>
      )}

      {/* Phase 2: full structured result */}
      {explanation && (
        <>
          {disagreement && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-xs)',
              background: '#EF9F2718', border: '1px solid #EF9F2744',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-xs) var(--space-sm)',
            }}>
              <AlertTriangle size={12} color="#EF9F27" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{
                fontSize: 'var(--text-body-sm)', color: 'var(--color-ambiguous)',
                lineHeight: 1.4, fontFamily: 'var(--font-body)',
              }}>
                {structured.disagreement_detail}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <ActionBadge action={explanation.recommended_action} />
            <RiskBadge   risk={explanation.civilian_risk} />
          </div>

          <div style={{
            fontSize: 'var(--text-body-sm)', color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)', lineHeight: 1.6,
          }}>
            {explanation.summary}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {explanation.reasoning?.map((step: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--color-accent)',
                  background: 'var(--color-accent-dim)', borderRadius: 'var(--radius-sm)',
                  padding: '1px 5px', flexShrink: 0, marginTop: 1, fontFamily: 'var(--font-hud)',
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: 'var(--text-body-sm)', color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)', lineHeight: 1.5,
                }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 2 }}>
            {explanation.agrees_with_classifier
              ? <CheckCircle size={11} color="#22c55e" />
              : <HelpCircle  size={11} color="#EF9F27" />
            }
            <span style={{
              fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-hud)', letterSpacing: '0.5px',
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