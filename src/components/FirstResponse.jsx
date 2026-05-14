import { useState, useRef, useEffect } from 'react';

const MONO = "'IBM Plex Mono', monospace";

export default function FirstResponse({ response, isStreaming, currentSection }) {
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const isActive = currentSection === 'first_response';
  const isWaiting = !response && !isStreaming;
  const showSkeleton = isStreaming && !response;

  // Sync textarea with streamed response. The textarea is readOnly during streaming
  // so user edits cannot race. After streaming ends, response is stable and editable.
  // setState inside this effect is intentional — we are subscribing to an external
  // streaming data source (the `response` prop) and mirroring it to local state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (response !== null && response !== undefined) {
      setEditedText(response);
    } else {
      setEditedText('');
    }
  }, [response]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCopy = () => {
    const textToCopy = editedText || response || '';
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* clipboard access denied */ });
  };

  const wordCount = (editedText || response || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={`card p-6 ${isActive ? 'panel-active' : ''}`} id="first-response-panel">
      {isActive && (
        <div style={{ overflow: 'hidden', height: 1, marginBottom: 16, borderRadius: 1 }}>
          <div className="scan-bar" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="panel-title">First Response</h2>
          {isActive && (
            <span className="inline-block w-1.5 h-1.5 rounded-full pulse" style={{ background: 'var(--color-accent)' }} />
          )}
        </div>
        {(response || editedText) && (
          <span style={{ fontFamily: MONO, fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
            {wordCount} words
          </span>
        )}
      </div>

      {isWaiting && (
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
          fontFamily: "'EB Garamond', serif",
        }}>
          A ready-to-send response draft will appear here.
        </p>
      )}

      {showSkeleton && (
        <div className="space-y-3">
          {[1, 0.95, 0.85, 0.9, 0.7, 0.8, 0.4].map((w, i) => (
            <div key={i} className="skeleton skeleton-line" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      )}

      {(response || editedText) && (
        <div className="fade-in space-y-4">
          <textarea
            id="response-editor"
            ref={textareaRef}
            value={editedText || response}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full rounded-sm p-5 resize-none"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              lineHeight: 1.85,
              minHeight: '200px',
              fontFamily: "'EB Garamond', serif",
              transition: 'border-color var(--transition)',
            }}
            readOnly={isStreaming}
          />

          <div className="flex items-center justify-between">
            <p style={{ fontFamily: MONO, fontSize: '0.62rem', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Edit before sending
            </p>
            <button
              id="copy-response-btn"
              onClick={handleCopy}
              className="btn-secondary"
              type="button"
              style={copied ? {
                borderColor: 'var(--color-success)',
                color: 'var(--color-success)',
              } : {}}
            >
              {copied ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="7" height="7" rx="1"/>
                    <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
