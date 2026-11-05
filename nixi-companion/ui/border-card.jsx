import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BorderBeam } from 'border-beam';

const LABELS = {
  idle: 'Ready',
  planning: 'Planning',
  running: 'Working',
  replanning: 'Replanning',
  verifying: 'Verifying',
  done: 'Complete',
  failed: 'Needs attention',
  cancelled: 'Cancelled',
  cancelling: 'Stopping',
  clarification: 'Waiting for you'
};

function AgentStatusCard(props) {
  const {
    title = 'FUL Agent',
    subtitle = 'Ask me to build, fix, or explain something.',
    status = 'idle',
    steps = [],
    changedFiles = [],
    commands = [],
    onCancel,
    onOpenWorkspace
  } = props;

  const busy = ['planning', 'running', 'replanning', 'verifying', 'cancelling'].includes(status);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    if (!busy) return undefined;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status, busy]);

  const done = steps.filter(s => s.status === 'ok').length;
  const label = LABELS[status] || status;
  const visibleSteps = steps.slice(-4).reverse();

  return (
    <BorderBeam
      size="md"
      colorVariant="colorful"
      theme="dark"
      strength={busy ? 1 : 0.62}
      duration={busy ? 2.1 : 3.4}
      borderRadius={18}
      className="ful-beam-wrap"
    >
      <section className="ful-status-card" aria-live="polite">
        <header className="ful-card-head">
          <div className="ful-card-title">
            <span className={`ful-status-dot ${status}`} />
            <div>
              <strong>{title}</strong>
              <span>{label}</span>
            </div>
          </div>
          {busy ? (
            <button type="button" className="ful-card-button ghost" onClick={onCancel}>Stop</button>
          ) : (
            <button type="button" className="ful-card-button" onClick={onOpenWorkspace}>Workspace</button>
          )}
        </header>

        <div className="ful-card-copy">
          <p>{subtitle}</p>
          {busy && <small>{elapsed}s elapsed · {done}/{steps.length || '?'} steps</small>}
        </div>

        {visibleSteps.length > 0 && (
          <div className="ful-step-list">
            {visibleSteps.map((step, index) => (
              <div key={step.id || index} className={`ful-step ${step.status || ''}`}>
                <span className="ful-step-mark" />
                <span className="ful-step-name">{step.tool || step.name || 'step'}</span>
                <span className="ful-step-state">{step.status || 'pending'}</span>
              </div>
            ))}
          </div>
        )}

        <footer className="ful-card-foot">
          <div className="ful-metric">
            <span>{changedFiles.length}</span>
            <small>files</small>
          </div>
          <div className="ful-metric">
            <span>{commands.length}</span>
            <small>commands</small>
          </div>
          <div className="ful-metric">
            <span>{steps.length}</span>
            <small>steps</small>
          </div>
        </footer>
      </section>
    </BorderBeam>
  );
}

const roots = new WeakMap();

function mountAgentCard(element, initial = {}) {
  if (!element) throw new Error('mount target is required');
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  let current = { ...initial };
  const render = () => root.render(<AgentStatusCard {...current} />);
  render();
  return {
    update(patch = {}) {
      current = { ...current, ...patch };
      render();
    },
    unmount() {
      root.unmount();
      roots.delete(element);
    }
  };
}

window.FULCards = { mountAgentCard };

export { AgentStatusCard, mountAgentCard };
