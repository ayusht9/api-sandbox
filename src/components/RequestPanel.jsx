import React, { useState, useEffect, memo } from 'react';
import { Box, Button, IconButton, TextField, Select, MenuItem, Tabs, Tab, Typography } from '@mui/material';
import { PlayArrow, Add, Delete, Star, StarBorder } from '@mui/icons-material';

const RequestPanel = memo(function RequestPanel({ onRequest, selectedEndpoint, bookmarks, onAddBookmark, onRemoveBookmark }) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [activeTab, setActiveTab] = useState('params');
  
  const [authType, setAuthType] = useState('None');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  
  useEffect(() => {
    if (selectedEndpoint) {
      setMethod(selectedEndpoint.method);
      setUrl(selectedEndpoint.url);
    }
  }, [selectedEndpoint]);

  const [params, setParams] = useState([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('{\n  \n}');

  const handleAddRow = (setter, state) => {
    setter([...state, { key: '', value: '' }]);
  };

  const handleRemoveRow = (index, setter, state) => {
    const newState = [...state];
    newState.splice(index, 1);
    setter(newState);
  };

  const handleChangeRow = (index, field, value, setter, state) => {
    const newState = [...state];
    newState[index][field] = value;
    setter(newState);
  };

  const isBookmarked = bookmarks?.some(b => b.url === url && b.method === method);

  const toggleBookmark = () => {
    if (isBookmarked) {
      onRemoveBookmark(url, method);
    } else {
      onAddBookmark(url, method);
    }
  };

  const handleSend = () => {
    let finalUrl = url;
    const validParams = params.filter(p => p.key.trim() !== '');
    if (validParams.length > 0) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
    }

    const headersObj = {};
    headers.forEach(h => {
      if (h.key.trim() !== '') headersObj[h.key] = h.value;
    });

    if (authType === 'Bearer Token' && bearerToken) {
      headersObj['Authorization'] = `Bearer ${bearerToken}`;
    } else if (authType === 'Basic Auth' && (basicUsername || basicPassword)) {
      headersObj['Authorization'] = `Basic ${btoa(`${basicUsername}:${basicPassword}`)}`;
    }

    onRequest({
      method,
      url: finalUrl,
      headers: headersObj,
      body: ['GET', 'HEAD'].includes(method) ? null : body
    });
  };

  const renderKeyValue = (state, setter) => (
    <Box className="kv-container animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {state.map((item, index) => (
        <Box key={index} className="kv-row" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Key"
            value={item.key}
            onChange={(e) => handleChangeRow(index, 'key', e.target.value, setter, state)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Value"
            value={item.value}
            onChange={(e) => handleChangeRow(index, 'value', e.target.value, setter, state)}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={() => handleRemoveRow(index, setter, state)} color="error" size="small">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={() => handleAddRow(setter, state)} variant="outlined" sx={{ mt: 1, borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
        Add Row
      </Button>
    </Box>
  );

  const renderAuth = () => (
    <Box className="auth-container animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>Authorization Type</Typography>
        <Select 
          value={authType} 
          onChange={(e) => setAuthType(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        >
          <MenuItem value="None">None</MenuItem>
          <MenuItem value="Bearer Token">Bearer Token</MenuItem>
          <MenuItem value="Basic Auth">Basic Auth</MenuItem>
        </Select>
      </Box>

      {authType === 'Bearer Token' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>Token</Typography>
          <TextField 
            size="small"
            placeholder="Enter Bearer Token" 
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
          />
        </Box>
      )}

      {authType === 'Basic Auth' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>Username</Typography>
            <TextField 
              size="small"
              placeholder="Username" 
              value={basicUsername}
              onChange={(e) => setBasicUsername(e.target.value)}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>Password</Typography>
            <TextField 
              size="small"
              type="password" 
              placeholder="Password" 
              value={basicPassword}
              onChange={(e) => setBasicPassword(e.target.value)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <div className="panel-container glass-panel">
      <div className="panel-title">Request Configuration</div>
      
      <Box className="input-row" sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'nowrap' }}>
        <Box className="address-bar" sx={{ display: 'flex', flex: 1, minWidth: '200px', border: '1px solid var(--input-border)', borderRadius: 2, overflow: 'hidden', bgcolor: 'var(--input-bg)', transition: 'all 0.2s ease', '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' } }}>
          <Select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            size="small"
            sx={{ 
              borderRadius: 0, 
              borderRight: '1px solid var(--input-border)', 
              fontWeight: 700, 
              width: 100, 
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              color: `var(--method-${method.toLowerCase()})`
            }}
          >
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
            <MenuItem value="PATCH">PATCH</MenuItem>
          </Select>
          <TextField 
            variant="outlined"
            placeholder="Enter request URL" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            size="small"
            sx={{ flex: 1, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
          />
        </Box>
        <IconButton 
          onClick={toggleBookmark}
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Request'}
          sx={{ border: '1px solid var(--input-border)', borderRadius: 2, color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
        >
          {isBookmarked ? <Star sx={{ color: '#fbbf24' }} /> : <StarBorder />}
        </IconButton>
        <Button variant="contained" onClick={handleSend} startIcon={<PlayArrow />} sx={{ px: 3 }}>
          Send
        </Button>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, val) => setActiveTab(val)} 
        sx={{ mb: 2, borderBottom: '1px solid var(--panel-border)', minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, textTransform: 'none', color: 'text.secondary' } }}
      >
        <Tab value="params" label="Params" />
        <Tab value="auth" label="Auth" />
        <Tab value="headers" label="Headers" />
        <Tab value="body" label="Body" />
      </Tabs>

      <Box className="tab-content" sx={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'params' && renderKeyValue(params, setParams)}
        {activeTab === 'auth' && renderAuth()}
        {activeTab === 'headers' && renderKeyValue(headers, setHeaders)}
        {activeTab === 'body' && (
          <textarea 
            className="animate-fade-in"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter JSON body here..."
            style={{ 
              width: '100%', 
              minHeight: '300px', 
              fontFamily: 'monospace', 
              padding: '1rem', 
              background: 'var(--input-bg)', 
              border: '1px solid var(--input-border)', 
              color: 'var(--text-primary)', 
              borderRadius: '8px',
              resize: 'vertical'
            }}
          />
        )}
      </Box>
    </div>
  );
});

export default RequestPanel;
