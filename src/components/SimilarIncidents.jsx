import { useState } from 'react';

const MONO = "'IBM Plex Mono', monospace";

function SeverityBadge({ severity }) {
  const config = {
    P1: 'badge-p1',
    P2: 'badge-p2',
    P3: 'badge-p3',
  };
  return (
    <span className={`badge ${config[severity] || config.P3}`}>{severity}</span>
  );
}

function IncidentCard({ incident, score, isExpanded, onToggle }) {
  const pct = Math.round(score * 100);

  return (
    <div className="rounded-sm overflow-hidden" style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      transition: 'border-color 400ms',
    }}>
      <button id={`incident-${incident.id}`} onClick={onToggle} type="button"
        className="w-full text-left p-5"
        style={{ transition: 'background 400ms', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <code style={{
                fontFamily: MONO,
                fontSize: '0.7rem',
                fontWeight: 400,
                color: 'var(--color-accent)',
                background: 'var(--color-accent-bg)',
                padding: '2px 7px',
                borderRadius: 2,
                border: '1px solid var(--color-accent-light)',
              }}>
                {incident.id}
              </code>
              <SeverityBadge severity={incident.severity} />
            </div>
            <p style={{
              fontSize: '0.88rem',
              fontWeight: 500,
              color: 'var(--color-text)',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: "'EB Garamond', serif",
            }}>
              {incident.title}
            </p>
          </div>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"
            style={{
              marginTop: 4,
              flexShrink: 0,
              color: 'var(--color-text-muted)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 400ms',
            }}>
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Confidence — ink brush bar */}
        <div className="flex items-center gap-3">
          <div className="progress-bar flex-1">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span style={{
            fontFamily: MONO,
            fontSize: '0.65rem',
            color: pct >= 60 ? 'var(--color-text)' : 'var(--color-text-muted)',
            width: '2.5rem',
            textAlign: 'right',
          }}>
            {pct}%
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 fade-in" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4" style={{ fontFamily: MONO, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              <span>{incident.category}</span>
              <span>{incident.date}</span>
            </div>
            <div>
              <h4 className="section-label" style={{ marginBottom: 8 }}>
                Description
              </h4>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.8,
                fontFamily: "'EB Garamond', serif",
              }}>
                {incident.description}
              </p>
            </div>
            <div>
              <h4 className="section-label" style={{ marginBottom: 8, color: 'var(--color-success)' }}>
                Resolution
              </h4>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.8,
                fontFamily: "'EB Garamond', serif",
              }}>
                {incident.resolution}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {incident.tags.map(tag => (
                <span key={tag} style={{
                  fontFamily: MONO,
                  fontSize: '0.62rem',
                  padding: '2px 8px',
                  borderRadius: 2,
                  background: 'var(--color-surface-3)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  letterSpacing: '0.04em',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimilarIncidents({ incidents, isLoading }) {
  const [expandedId, setExpandedId] = useState(null);
  const isEmpty = incidents && incidents.length === 0;
  const hasResults = incidents && incidents.length > 0;

  return (
    <div className="card p-6" id="similar-incidents-panel">
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="panel-title">Similar Incidents</h2>
        {isLoading && (
          <span className="inline-block w-1.5 h-1.5 rounded-full pulse" style={{ background: 'var(--color-accent)' }} />
        )}
      </div>

      {!incidents && !isLoading && (
        <p style={{
          fontSize: '0.88rem',
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
          fontFamily: "'EB Garamond', serif",
        }}>
          Past incidents from the knowledge base will appear here.
        </p>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-sm p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="skeleton skeleton-line w-[55%] mb-2" style={{ height: '12px' }} />
              <div className="skeleton skeleton-line w-full" style={{ height: '3px' }} />
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="rounded-sm p-8 text-center fade-in" style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}>
          <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: 8, opacity: 0.2, lineHeight: 1 }}>
            —
          </span>
          <p style={{
            fontSize: '0.88rem',
            color: 'var(--color-text-secondary)',
            marginBottom: 4,
            fontFamily: "'EB Garamond', serif",
          }}>
            No similar incidents found.
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
            This may be a novel case.
          </p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-4 fade-in">
          {incidents.map(({ incident, score }) => (
            <IncidentCard key={incident.id} incident={incident} score={score}
              isExpanded={expandedId === incident.id}
              onToggle={() => setExpandedId(expandedId === incident.id ? null : incident.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
