import React, { memo } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { Code } from '@mui/icons-material';

const ResponsePanel = memo(function ResponsePanel({ response, loading }) {
  
  if (loading) {
    return (
      <div className="panel-container glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="panel-container glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
        <Code sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="body1">Send a request to see the response</Typography>
      </div>
    );
  }

  const { status, statusText, data, time, error } = response;
  const isSuccess = status >= 200 && status < 300;
  const statusClass = isSuccess ? 'status-success' : 'status-error';

  return (
    <div className="panel-container glass-panel animate-fade-in">
      <div className="panel-title">Response</div>
      
      <div className="status-bar">
        <Typography variant="body2">
          Status: <Box component="span" className={`status-badge ${statusClass}`}>{status} {statusText}</Box>
        </Typography>
        <Typography variant="body2">
          Time: <Box component="span" className="status-badge">{time} ms</Box>
        </Typography>
      </div>

      <div className="response-body">
        <pre>
          {error ? error : JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
});

export default ResponsePanel;
