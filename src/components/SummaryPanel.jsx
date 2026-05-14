export default function SummaryPanel({ summary, isStreaming, currentSection }) {
  const isActive = currentSection === 'summary';
  const isWaiting = !summary && !isStreaming;
  const showSkeleton = isStreaming && !summary;

  const detectSeverity = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower.includes('p1') || lower.includes('critical') || lower.includes('urgent') || lower.includes('emergency'))
      return { level: 'P1', className: 'badge-p1' };
    if (lower.includes('p2') || lower.includes('high') || lower.includes('major'))
      return { level: 'P2', className: 'badge-p2' };
    return { level: 'P3', className: 'badge-p3' };
  };

  const severity = detectSeverity(summary);

  return (
    <div className={`card p-6 ${isActive ? 'panel-active' : ''}`} id="summary-panel">
      {/* Ink wash when streaming */}
      {isActive && (
        <div style={{ overflow: 'hidden', height: 1, marginBottom: 16, borderRadius: 1 }}>
          <div className="scan-bar" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="panel-title">Summary</h2>
          {isActive && (
            <span className="inline-block w-1.5 h-1.5 rounded-full pulse" style={{ background: 'var(--color-accent)' }} />
          )}
        </div>
        {severity && summary && (
          <span className={`badge ${severity.className} fade-in`}>{severity.level}</span>
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
          Paste a ticket and press Analyze to begin.
        </p>
      )}

      {showSkeleton && (
        <div className="space-y-3">
          <div className="skeleton skeleton-line w-full" />
          <div className="skeleton skeleton-line w-[88%]" />
          <div className="skeleton skeleton-line w-[74%]" />
          <div className="skeleton skeleton-line w-[82%]" />
          <div className="skeleton skeleton-line w-[55%]" />
        </div>
      )}

      {summary && (
        <div className="fade-in">
          <p style={{
            fontSize: '0.92rem',
            lineHeight: 1.9,
            color: 'var(--color-text)',
            whiteSpace: 'pre-wrap',
            fontFamily: "'EB Garamond', serif",
          }}>
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}
