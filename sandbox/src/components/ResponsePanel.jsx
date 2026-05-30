import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ResponsePanel({ response, loading }) {
  
  if (loading) {
    return (
      <div className="panel-container glass-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--accent-color)' }} />
        <div style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Sending Request...</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="panel-container glass-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Enter a URL and click Send to get a response</div>
      </div>
    );
  }

  const { status, statusText, data, time, error } = response;
  const isSuccess = status >= 200 && status < 300;

  return (
    <div className="panel-container glass-panel animate-fade-in">
      <div className="panel-title">Response</div>
      
      <div className="status-bar">
        <div className={`status-badge ${isSuccess ? 'status-success' : 'status-error'}`}>
          Status: {status} {statusText}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Time: <span style={{ color: 'var(--text-primary)' }}>{time} ms</span>
        </div>
      </div>

      <div className="response-body">
        {error ? (
          <pre style={{ color: 'var(--error-color)' }}>{error}</pre>
        ) : (
          <pre>{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
