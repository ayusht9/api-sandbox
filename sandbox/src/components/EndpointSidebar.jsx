import React, { useState, useEffect, memo } from 'react';
import axios from 'axios';
import { Box, Button, IconButton, TextField, Tabs, Tab, CircularProgress, Typography } from '@mui/material';
import { WifiTethering, Search as SearchIcon, Refresh, ChevronRight, Language, DeleteOutlined } from '@mui/icons-material';

const EndpointSidebar = memo(function EndpointSidebar({ onSelectEndpoint, bookmarks, onRemoveBookmark }) {
  const [activeTab, setActiveTab] = useState('discovered');
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [discoveryUrl, setDiscoveryUrl] = useState('http://localhost:3000/api/endpoints');
  const [baseUrl, setBaseUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchEndpoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEndpoints = async () => {
    if (!discoveryUrl) return;
    setLoading(true);
    setEndpoints([]);
    setBaseUrl('');
    setErrorMsg(null);
    
    try {
      let res;
      if (discoveryUrl.startsWith('http://localhost:3000') || discoveryUrl.startsWith('/')) {
        res = await axios.get(discoveryUrl);
      } else {
        res = await axios.post('http://localhost:3000/api/proxy', {
          url: discoveryUrl,
          method: 'GET'
        });
      }
      const data = res.data;

      if (data && data.data && Array.isArray(data.data)) {
        setEndpoints(data.data);
        return;
      }

      if (data && (data.swagger || data.openapi) && data.paths) {
        let extractedBaseUrl = '';
        if (data.openapi && data.servers && data.servers.length > 0) {
           extractedBaseUrl = data.servers[0].url;
        } else if (data.swagger) {
           const scheme = data.schemes && data.schemes.length > 0 ? data.schemes[0] : 'https';
           const host = data.host || '';
           const basePath = data.basePath || '';
           if (host) extractedBaseUrl = `${scheme}://${host}${basePath}`;
        }
        
        if (extractedBaseUrl.endsWith('/')) {
            extractedBaseUrl = extractedBaseUrl.slice(0, -1);
        }
        setBaseUrl(extractedBaseUrl);

        const parsedEndpoints = [];
        for (const [path, methodsObj] of Object.entries(data.paths)) {
          const methods = Object.keys(methodsObj)
            .filter(m => ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(m.toLowerCase()))
            .map(m => m.toUpperCase());
          
          if (methods.length > 0) {
            parsedEndpoints.push({ path, methods });
          }
        }
        setEndpoints(parsedEndpoints);
      } else {
        setErrorMsg('Provided URL is not a valid OpenAPI/Swagger schema. Are you trying to make an API request? Paste this into the Request Panel on the right instead!');
      }
    } catch (err) {
      setErrorMsg('Failed to fetch from the provided URL. Ensure it is accessible.');
      console.error('Failed to fetch endpoints', err);
    } finally {
      setLoading(false);
    }
  };

  const listToRender = activeTab === 'discovered' ? endpoints : (bookmarks || []);

  const filteredEndpoints = listToRender.filter(ep => 
    (ep.path || ep.url).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="panel-container glass-panel sidebar">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <WifiTethering fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">Endpoints</Typography>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, val) => setActiveTab(val)} 
        sx={{ mb: 1, mt: 1, minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, textTransform: 'none', color: 'text.secondary' } }}
        variant="fullWidth"
      >
        <Tab value="discovered" label="Discovered" />
        <Tab value="bookmarks" label="Bookmarks" />
      </Tabs>
      
      {activeTab === 'discovered' && (
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, p: 0.5, mb: 1, pl: 1 }}>
          <Language fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <TextField 
            variant="standard"
            placeholder="Discovery / OpenAPI URL" 
            value={discoveryUrl}
            onChange={(e) => setDiscoveryUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEndpoints()}
            InputProps={{ disableUnderline: true }}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={fetchEndpoints} size="small" color="primary">
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, p: 0.5, mb: 1, pl: 1 }}>
        <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
        <TextField 
          variant="standard"
          placeholder="Filter paths..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ disableUnderline: true }}
          sx={{ flex: 1 }}
        />
      </Box>

      {errorMsg && (
        <Typography variant="caption" sx={{ color: 'error.main', p: 1, bgcolor: 'error.light', borderRadius: 1, mb: 1, opacity: 0.8 }}>
          {errorMsg}
        </Typography>
      )}

      <div className="endpoint-list">
        {activeTab === 'discovered' ? (
          loading ? (
            <div className="sidebar-loading">
              <CircularProgress size={24} />
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div className="sidebar-empty">No endpoints found.</div>
          ) : (
            filteredEndpoints.map((ep, idx) => (
              <div key={idx} className="endpoint-group">
                {ep.methods.map((method, mIdx) => (
                  <div 
                    key={`${idx}-${mIdx}`} 
                    className="endpoint-item"
                    onClick={() => onSelectEndpoint(ep.path, method, baseUrl)}
                    title={`Click to load ${method} ${ep.path}`}
                  >
                    <span className={`method-badge bg-method-${method}`}>
                      {method}
                    </span>
                    <span className="path-text" style={{ flex: 1 }}>{ep.path}</span>
                    <ChevronRight fontSize="small" sx={{ color: 'text.secondary' }} />
                  </div>
                ))}
              </div>
            ))
          )
        ) : (
          filteredEndpoints.length === 0 ? (
            <div className="sidebar-empty">No bookmarks found.</div>
          ) : (
            <div className="endpoint-group">
              {filteredEndpoints.map((ep, idx) => (
                <div 
                  key={idx} 
                  className="endpoint-item"
                  onClick={() => onSelectEndpoint(ep.url, ep.method, '')}
                  title={`Click to load ${ep.method} ${ep.url}`}
                >
                  <span className={`method-badge bg-method-${ep.method}`}>
                    {ep.method}
                  </span>
                  <span className="path-text" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</span>
                  <IconButton onClick={(e) => { e.stopPropagation(); onRemoveBookmark(ep.url, ep.method); }} size="small" color="error" sx={{ p: 0.5 }}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
});

export default EndpointSidebar;
