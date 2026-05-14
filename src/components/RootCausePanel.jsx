const SERIF = "'EB Garamond', Georgia, serif";

export default function RootCausePanel({ rootCauses, isStreaming, currentSection }) {
  const isActive = currentSection === 'root_causes';
  const isWaiting = rootCauses === null && !isStreaming;
  const showSkeleton = isStreaming && rootCauses === null;
  const hasCauses = rootCauses && rootCauses.length > 0;
  const isStreamingEmpty = isStreaming && rootCauses !== null && rootCauses.length === 0;

  return (
    <div className={`card p-6 ${(isActive || isStreamingEmpty) ? 'panel-active' : ''}`} id="root-cause-panel">
      {(isActive || isStreamingEmpty) && (
        <div style={{ overflow: 'hidden', height: 1, marginBottom: 16, borderRadius: 1 }}>
          <div className="scan-bar" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="panel-title">Root Causes</h2>
        {(isActive || isStreamingEmpty) && (
          <span className="inline-block w-1.5 h-1.5 rounded-full pulse" style={{ background: 'var(--color-accent)' }} />
        )}
      </div>

      {/* Content */}
      {isWaiting && (
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
          fontFamily: "'EB Garamond', serif",
        }}>
          Root cause analysis will appear here.
        </p>
      )}

      {showSkeleton && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-sm p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="skeleton skeleton-line w-[38%] mb-2" style={{ height: '13px' }} />
              <div className="skeleton skeleton-line w-[78%]" />
            </div>
          ))}
        </div>
      )}

      {hasCauses && (
        <div className="space-y-4 fade-in">
          {rootCauses.map((cause, idx) => (
            <div
              key={idx}
              className="rounded-sm p-5"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderLeft: '2px solid var(--color-accent)',
                animationDelay: `${idx * 120}ms`,
                transition: 'border-color 400ms',
              }}
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{
                  color: 'var(--color-accent)',
                  fontFamily: SERIF,
                  fontSize: '1rem',
                  lineHeight: 1,
                  opacity: 0.8,
                  flexShrink: 0,
                }}>
                  —
                </span>
                <span style={{
                  fontFamily: SERIF,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  letterSpacing: '0.01em',
                }}>
                  {cause.category}
                </span>
              </div>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.8,
                paddingLeft: '1.8rem',
                fontFamily: "'EB Garamond', serif",
              }}>
                {cause.rationale}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
