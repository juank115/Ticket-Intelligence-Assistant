import { useState, useRef } from 'react';

const MONO = "'IBM Plex Mono', monospace";

const SAMPLE_TICKETS = [
  {
    label: '#1 — Auth 401 post-deploy (P1)',
    text: `From:    Alex Torres <a.torres@clientcorp.com>
To:      support@nuaav.io
Subject: URGENT - enterprise users can't log in - started after this morning's deploy
Time:    2025-11-20  09:34 AM PST
Priority (set by reporter): Critical

Hey support team,

We are getting absolutely hammered with calls right now. Our whole enterprise
customer base seems to be locked out of the portal since roughly 9:15 AM. The
error message they are getting says "Session token invalid" but I've checked
and all the affected accounts are active and not expired.

I pulled a sample from our auth logs and I'm seeing a wave of 401s that started
right around the time your team pushed this morning's deployment (we got the
maintenance notice at 9:05 AM).

Affected customers so far (more coming in):
  - ENT-1022 (GlobalPharma) — 340 users affected
  - ENT-1087 (Meridian Capital) — 210 users affected
  - ENT-2201 (TechBridge Inc) — 90 users affected

Sales and CS teams are going crazy. Meridian have a board demo in 2 hours.
Please treat this as a P1. What do we need to do?

Alex Torres
VP Customer Success, ClientCorp`,
  },
  {
    label: '#2 — Pipeline CSV schema mismatch (P2)',
    text: `[SUPPORT PORTAL AUTO-GENERATED]
Ticket ID : SUP-88214
Submitted  : 2025-11-20  11:52 AM UTC
Reporter   : dataops@novalytics.com
Category   : Data / Reporting
Severity   : High

Description:
Our nightly data pipeline didn't complete last night. We usually see the
refreshed dashboards by 07:00 AM but as of noon nothing has updated. The
pipeline runs in your platform against our Snowflake warehouse.

I checked the job logs in your portal and the last successful run was
2025-11-18. The 2025-11-19 run shows status "failed" but no error detail
is surfaced in the UI — just a red X icon.

We have a client presentation at 3 PM today where we need this data.
Our contract SLA is 4-hour resolution for P2.

Some context that might help:
- We did upload a new source file yesterday around 6 PM (larger than usual,
  about 2.1 million rows vs our normal ~400k)
- Our Snowflake plan is Business Critical
- We haven't changed any pipeline config

Attachment: pipeline_job_log_nov19.txt [see below]

--- START LOG EXCERPT ---
2025-11-19 02:14:33 UTC  INFO   Starting COPY INTO stage
2025-11-19 02:14:41 UTC  ERROR  COPY INTO failed: Number of columns in file (48)
                                 does not match table definition (47).
                                 File: clientB_export_2025-11-19.csv, Row 1
2025-11-19 02:14:41 UTC  ERROR  Aborting pipeline run. 0 rows loaded.
--- END LOG EXCERPT ---`,
  },
  {
    label: '#3 — API latency P99 spike (P2)',
    text: `slack message forwarded to support

From: mike.chan (internal #ops-alerts)
Time: 2025-11-20 08:17 AM

"hey does anyone else see the api is super slow? p99 is like 4 seconds right
now, normally its like 150ms. been going on since maybe 7:45. dashboard loads
are timing out for some customers. not sure if its our end or platform"

--- escalated to L2 by L1 agent (Sarah K.) at 08:31 AM ---
L1 notes: Confirmed in our APM tool that P99 API latency is 3.8s, up from
baseline of 140ms. Started approx 07:43 AM UTC. No deployments since yesterday
4 PM. Customer-facing error rate up ~6%. Two enterprise accounts have called in.
Specific endpoint worst affected: GET /api/v2/reports/summary`,
  },
  {
    label: '#4 — Webhook 400 Stripe (P1)',
    text: `Subject : Re: Re: Re: [SUP-77992] payment webhooks - STILL not working
Date    : 2025-11-20  14:05

Hi,

Following up again on this. We first reported on Monday (3 days ago) that
our Stripe payment confirmation webhooks have stopped working. We've tried
everything you suggested (rotating the webhook secret, regenerating the
endpoint) and nothing helps.

The webhooks are firing from Stripe's side — we can see them in the Stripe
dashboard with status "delivered" BUT your platform is returning 400 errors
to Stripe on every single one. Stripe then retries 3 times and gives up.

The result is that our orders are not being marked as paid in your system.
We have ~320 orders in "payment pending" that should be "paid". Our
fulfilment is completely blocked.

We upgraded our Stripe library two weeks ago but that shouldn't matter because
the webhook secret is the same.

This is costing us real money. Please escalate immediately.

Best,
Sandra Okonkwo
Engineering Lead, Payflow Commerce`,
  },
  {
    label: '#5 — Permission error new users (P3)',
    text: `To      : support@nuaav.io
From    : t.bergmann@alpine-logistics.de
Subject : Problem with user accounts - some people ok some not
Date    : 2025-11-20  16:44 UTC

Hello,

We have a strange problem. Some of our users can use the system normally
but some others get an error. I am not sure what is different between them.

The error message is: "You do not have permission to view this resource"

It happens when they click on the Reports section. The users who get the
error are mostly the ones that we added in the last two weeks as part of
our expansion (we went from 40 users to 95 users recently). The original
users mostly work fine. One original user also has the problem though.

We have not changed any settings. Our admin (Klaus) tried removing and
re-adding one of the stuck users and it did not help.

Our account is Alpine Logistics GmbH, tenant ID ALG-EU-004.
We are on the Professional plan.

Thank you
Thomas Bergmann`,
  },
];

export default function TicketInput({ onAnalyze, isLoading }) {
  const [text, setText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleQuickLoad = (ticket) => {
    setText(ticket.text);
    setShowDropdown(false);
  };

  const handleAnalyze = () => {
    if (text.trim() && !isLoading) {
      onAnalyze(text.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAnalyze();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="panel-title">Paste Ticket</h2>
        </div>
        {text.length > 0 && (
          <span style={{ fontFamily: MONO, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
            {text.length}
          </span>
        )}
      </div>

      {/* TextArea — paper-like */}
      <textarea
        id="ticket-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Paste a raw support ticket here...\n\nOr use the sample tickets below.`}
        className="flex-1 w-full p-5 rounded-sm resize-none"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontSize: '0.82rem',
          lineHeight: '1.8',
          fontFamily: MONO,
          fontWeight: 300,
          minHeight: '280px',
          caretColor: 'var(--color-accent)',
          transition: 'border-color var(--transition)',
        }}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5">
        {/* Quick Load Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="quick-load-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="btn-secondary"
            type="button"
            style={{ fontFamily: MONO, fontSize: '0.72rem' }}
          >
            Samples
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"
              style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 400ms' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>

          {showDropdown && (
            <div
              className="absolute bottom-full left-0 mb-2 rounded-sm overflow-hidden fade-in z-50"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-elevated)',
                width: '300px',
              }}
            >
              <div className="p-2">
                <p style={{
                  fontFamily: MONO,
                  fontSize: '0.6rem',
                  color: 'var(--color-text-muted)',
                  padding: '6px 10px 8px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Sample tickets
                </p>
                {SAMPLE_TICKETS.map((ticket, idx) => (
                  <button
                    key={idx}
                    id={`sample-ticket-${idx + 1}`}
                    onClick={() => handleQuickLoad(ticket)}
                    className="w-full text-left px-3 py-2.5 rounded-sm text-sm"
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontFamily: "'EB Garamond', serif",
                      fontSize: '0.85rem',
                      transition: 'all 400ms',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--color-surface-2)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    {ticket.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Analyze Button — 分析 */}
        <button
          id="analyze-btn"
          onClick={handleAnalyze}
          disabled={!text.trim() || isLoading}
          className="btn-primary flex-1"
          type="button"
        >
          {isLoading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                border: '1.5px solid rgba(250,247,241,0.3)',
                borderTopColor: 'var(--color-surface)',
                borderRadius: '50%',
                animation: 'spin 1.2s linear infinite',
              }} />
              Analyzing...
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </div>

      {/* Hint */}
      <p style={{
        fontFamily: MONO,
        fontSize: '0.6rem',
        color: 'var(--color-text-muted)',
        marginTop: 10,
        textAlign: 'center',
        letterSpacing: '0.06em',
      }}>
        Ctrl+Enter to analyze
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
