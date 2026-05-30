import React, { useState } from 'react';
import axios from 'axios';
import { Activity } from 'lucide-react';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import EndpointSidebar from './components/EndpointSidebar';

function App() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  const handleSelectEndpoint = (path, method, baseUrl) => {
    const finalBaseUrl = baseUrl || 'http://localhost:3000';
    setSelectedEndpoint({ url: `${finalBaseUrl}${path}`, method });
  };

  const handleRequest = async (config) => {
    setLoading(true);
    setResponse(null);
    
    const startTime = performance.now();
    
    try {
      let dataToSync = null;
      if (config.body && typeof config.body === 'string') {
        try {
          dataToSync = JSON.parse(config.body);
        } catch (e) {
          dataToSync = config.body; // send as is if not valid JSON
        }
      }

      let res;
      if (config.url.startsWith('http://localhost:3000') || config.url.startsWith('/')) {
        res = await axios({
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: dataToSync,
        });
      } else {
        res = await axios({
          method: 'POST',
          url: 'http://localhost:3000/api/proxy',
          data: {
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: dataToSync
          }
        });
      }

      const endTime = performance.now();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: res.data,
        time: Math.round(endTime - startTime),
      });

    } catch (err) {
      const endTime = performance.now();
      
      if (err.response) {
        setResponse({
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          time: Math.round(endTime - startTime),
        });
      } else {
        setResponse({
          status: 'Error',
          statusText: 'Network Error',
          error: err.message,
          time: Math.round(endTime - startTime),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header glass-panel">
        <Activity size={24} color="var(--accent-color)" />
        <h1>Aero Sandbox API</h1>
      </header>
      
      <main className="main-content">
        <EndpointSidebar onSelectEndpoint={handleSelectEndpoint} />
        <RequestPanel onRequest={handleRequest} selectedEndpoint={selectedEndpoint} />
        <ResponsePanel response={response} loading={loading} />
      </main>
    </div>
  );
}

export default App;
