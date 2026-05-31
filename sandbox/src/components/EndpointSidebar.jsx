import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Network, Search, Loader2, RefreshCw, ChevronRight, Globe, Bookmark, Trash2 } from 'lucide-react';

export default function EndpointSidebar({ onSelectEndpoint, bookmarks, onRemoveBookmark }) {
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

      // Handle standard Mock API format
      if (data && data.data && Array.isArray(data.data)) {
        setEndpoints(data.data);
        return;
      }

      // Handle OpenAPI / Swagger format
      if (data && (data.swagger || data.openapi) && data.paths) {
        // Extract Base URL
        let extractedBaseUrl = '';
        if (data.openapi && data.servers && data.servers.length > 0) {
           extractedBaseUrl = data.servers[0].url;
        } else if (data.swagger) {
           const scheme = data.schemes && data.schemes.length > 0 ? data.schemes[0] : 'https';
           const host = data.host || '';
           const basePath = data.basePath || '';
           if (host) extractedBaseUrl = `${scheme}://${host}${basePath}`;
        }
        
        // Normalize base URL (remove trailing slash)
        if (extractedBaseUrl.endsWith('/')) {
            extractedBaseUrl = extractedBaseUrl.slice(0, -1);
        }
        setBaseUrl(extractedBaseUrl);

        // Parse Paths
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

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return '#10b981'; // Emerald 500
      case 'POST': return '#3b82f6'; // Blue 500
      case 'PUT': return '#f59e0b'; // Amber 500
      case 'DELETE': return '#ef4444'; // Red 500
      case 'PATCH': return '#8b5cf6'; // Violet 500
      default: return '#94a3b8'; // Slate 400
    }
  };

  const listToRender = activeTab === 'discovered' ? endpoints : (bookmarks || []);

  const filteredEndpoints = listToRender.filter(ep => 
    (ep.path || ep.url).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="panel-container glass-panel sidebar">
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={20} /> Endpoints
        </div>
      </div>

      <div className="sidebar-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
        <button 
          onClick={() => setActiveTab('discovered')}
          style={{ flex: 1, padding: '0.5rem', background: activeTab === 'discovered' ? 'var(--input-bg)' : 'transparent', border: activeTab === 'discovered' ? '1px solid var(--input-border)' : '1px solid transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          Discovered
        </button>
        <button 
          onClick={() => setActiveTab('bookmarks')}
          style={{ flex: 1, padding: '0.5rem', background: activeTab === 'bookmarks' ? 'var(--input-bg)' : 'transparent', border: activeTab === 'bookmarks' ? '1px solid var(--input-border)' : '1px solid transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          Bookmarks
        </button>
      </div>
      
      {activeTab === 'discovered' && (
        <div className="discovery-bar" style={{ marginBottom: '0.5rem' }}>
          <Globe size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Discovery / OpenAPI URL" 
            value={discoveryUrl}
            onChange={(e) => setDiscoveryUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEndpoints()}
          />
          <button 
            className="btn-icon" 
            onClick={fetchEndpoints}
            title="Fetch Endpoints"
            style={{ padding: '0.25rem' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          placeholder="Filter paths..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      <div className="endpoint-list">
        {activeTab === 'discovered' ? (
          loading ? (
            <div className="sidebar-loading">
              <Loader2 size={24} className="spinner" />
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
                    <span 
                      className="method-badge" 
                      style={{ backgroundColor: `${getMethodColor(method)}33`, color: getMethodColor(method) }}
                    >
                      {method}
                    </span>
                    <span className="path-text" style={{ flex: 1 }}>{ep.path}</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
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
                  <span 
                    className="method-badge" 
                    style={{ backgroundColor: `${getMethodColor(ep.method)}33`, color: getMethodColor(ep.method) }}
                  >
                    {ep.method}
                  </span>
                  <span className="path-text" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</span>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onRemoveBookmark(ep.url, ep.method); }} title="Delete Bookmark">
                    <Trash2 size={14} style={{ color: 'var(--error-color)', padding: '0' }} />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
