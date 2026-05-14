import { useState, useCallback, useRef, useEffect } from 'react';
import TicketInput from './components/TicketInput';
import SummaryPanel from './components/SummaryPanel';
import RootCausePanel from './components/RootCausePanel';
import SimilarIncidents from './components/SimilarIncidents';
import FirstResponse from './components/FirstResponse';
import { findSimilarIncidents } from './lib/retrieval';
import { streamAnalysis } from './lib/claudeClient';
import { parseStreamedOutput, getCurrentStreamSection } from './lib/parseOutput';

const SERIF = "'EB Garamond', Georgia, serif";
const MONO = "'IBM Plex Mono', monospace";

export default function App() {
  // KB state
  const [incidents, setIncidents] = useState([]);
  const [kbLoaded, setKbLoaded] = useState(false);

  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  // Output state
  const [similarResults, setSimilarResults] = useState(null);
  const [parsedOutput, setParsedOutput] = useState({ summary: null, rootCauses: null, firstResponse: null });
  const [currentSection, setCurrentSection] = useState('waiting');

  // API key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  // Abort controller ref
  const abortRef = useRef(null);

  // Load KB on mount
  useEffect(() => {
    fetch('/incidents_kb.json')
      .then(r => r.json())
      .then(data => {
        setIncidents(data.incidents || []);
        setKbLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load KB:', err);
        setError('Failed to load knowledge base. Ensure incidents_kb.json is in public/.');
      });
  }, []);

  // Save API key
  const handleSaveKey = (key) => {
    setApiKey(key);
    localStorage.setItem('anthropic_api_key', key);
    setShowSettings(false);
  };

  // Main analysis handler
  const handleAnalyze = useCallback(async (ticketText) => {
    // Reset state
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setParsedOutput({ summary: null, rootCauses: null, firstResponse: null });
    setCurrentSection('waiting');

    // Cancel any previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    // 1. Run local retrieval
    const similar = findSimilarIncidents(ticketText, incidents);
    setSimilarResults(similar);

    // 2. Stream LLM analysis
    await streamAnalysis({
      ticketText,
      similarIncidents: similar,
      apiKey,
      signal: abortRef.current.signal,
      onChunk: (accumulated) => {
        const parsed = parseStreamedOutput(accumulated);
        setParsedOutput(parsed);
        setCurrentSection(getCurrentStreamSection(accumulated));
      },
      onComplete: (accumulated) => {
        const parsed = parseStreamedOutput(accumulated);
        setParsedOutput(parsed);
        setCurrentSection('complete');
        setIsStreaming(false);
        setIsLoading(false);
      },
      onError: ({ message }) => {
        setError(message);
        setIsStreaming(false);
        setIsLoading(false);
      },
    });
  }, [incidents, apiKey]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 style={{
              fontFamily: SERIF,
              fontSize: '1.35rem',
              fontWeight: 500,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '0.01em',
            }}>
              Ticket Intelligence
            </h1>
            <p style={{
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontFamily: MONO,
              margin: 0,
            }}>
              L2 Analysis
              {kbLoaded && (
                <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                  · {incidents.length} incidents
                </span>
              )}
            </p>
          </div>

          {/* Settings */}
          <div className="relative">
            <button id="settings-btn" onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary" type="button"
              style={{ fontSize: '0.75rem', padding: '6px 14px', fontFamily: MONO, letterSpacing: '0.06em' }}>
              API Key
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-3 rounded-sm p-5 fade-in z-50"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-light)',
                  boxShadow: 'var(--shadow-elevated)',
                  width: '296px',
                }}>
                <p className="section-label" style={{ marginBottom: 12 }}>
                  Anthropic API Key
                </p>
                <input id="api-key-input" type="password"
                  defaultValue={apiKey}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 rounded-sm text-sm mb-3"
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text)',
                    fontFamily: MONO,
                    fontSize: '0.8rem',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(e.target.value); }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleSaveKey(e.target.closest('div').parentElement.querySelector('input').value)}
                    className="btn-primary flex-1" type="button"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                    Save
                  </button>
                  <button onClick={() => setShowSettings(false)}
                    className="btn-secondary" type="button"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                    Cancel
                  </button>
                </div>
                <p style={{ fontSize: '0.65rem', marginTop: 10, color: 'var(--color-text-muted)', fontFamily: MONO, lineHeight: 1.5 }}>
                  Key is stored in localStorage (not secure for production).
                  Prefer setting ANTHROPIC_API_KEY in the .env file.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-6xl mx-auto px-8 mt-5">
          <div className="rounded-sm px-5 py-4 fade-in flex items-start gap-3"
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid rgba(181, 75, 58, 0.15)',
              borderLeft: '2px solid var(--color-danger)',
            }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 3 }}>
              <circle cx="8" cy="8" r="7"/>
              <path d="M8 5v4M8 11v.5"/>
            </svg>
            <p className="text-sm flex-1" style={{ color: 'var(--color-danger)', fontFamily: "'EB Garamond', serif" }}>{error}</p>
            <button onClick={() => setError(null)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} type="button">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 1l12 12M13 1L1 13"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Layout — abundant Ma (negative space) */}
      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 items-start">
          {/* Left: Input — 入力 */}
          <div className="md:sticky md:top-20">
            <div className="card p-6">
              <TicketInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>
          </div>

          {/* Right: Output Panels — 出力 */}
          <div className="space-y-6 panel-scroll">
            <SummaryPanel summary={parsedOutput.summary} isStreaming={isStreaming} currentSection={currentSection} />
            <RootCausePanel rootCauses={parsedOutput.rootCauses} isStreaming={isStreaming} currentSection={currentSection} />
            <SimilarIncidents incidents={similarResults} isLoading={isLoading && !similarResults} />
            <FirstResponse response={parsedOutput.firstResponse} isStreaming={isStreaming} currentSection={currentSection} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-10 mt-8" style={{
        color: 'var(--color-text-muted)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <span style={{
          fontFamily: MONO,
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Ticket Intelligence &middot; Nuaav L2 Assessment &middot; Powered by Claude
        </span>
      </footer>
    </div>
  );
}
