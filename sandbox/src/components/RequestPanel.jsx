import React, { useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';

export default function RequestPanel({ onRequest }) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('http://localhost:3000/api/products');
  const [activeTab, setActiveTab] = useState('params');
  
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

  const handleSend = () => {
    // Construct actual URL with params
    let finalUrl = url;
    const validParams = params.filter(p => p.key.trim() !== '');
    if (validParams.length > 0) {
      const queryString = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
    }

    // Construct headers
    const headersObj = {};
    headers.forEach(h => {
      if (h.key.trim() !== '') headersObj[h.key] = h.value;
    });

    onRequest({
      method,
      url: finalUrl,
      headers: headersObj,
      body: ['GET', 'HEAD'].includes(method) ? null : body
    });
  };

  const renderKeyValue = (state, setter) => (
    <div className="kv-container animate-fade-in">
      {state.map((item, index) => (
        <div key={index} className="kv-row">
          <input
            className="kv-input"
            placeholder="Key"
            value={item.key}
            onChange={(e) => handleChangeRow(index, 'key', e.target.value, setter, state)}
          />
          <input
            className="kv-input"
            placeholder="Value"
            value={item.value}
            onChange={(e) => handleChangeRow(index, 'value', e.target.value, setter, state)}
          />
          <button 
            className="btn-icon" 
            onClick={() => handleRemoveRow(index, setter, state)}
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button className="btn-add" onClick={() => handleAddRow(setter, state)}>
        <Plus size={16} /> Add Row
      </button>
    </div>
  );

  return (
    <div className="panel-container glass-panel">
      <div className="panel-title">Request Configuration</div>
      
      <div className="input-row">
        <select 
          className="method-select" 
          value={method} 
          onChange={(e) => setMethod(e.target.value)}
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
          <option>PATCH</option>
        </select>
        <input 
          className="url-input" 
          placeholder="Enter request URL" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button onClick={handleSend}>
          <Play size={16} fill="currentColor" /> Send
        </button>
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          Params
        </div>
        <div 
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
        </div>
        <div 
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'params' && renderKeyValue(params, setParams)}
        {activeTab === 'headers' && renderKeyValue(headers, setHeaders)}
        {activeTab === 'body' && (
          <textarea 
            className="animate-fade-in"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter JSON body here..."
            style={{ width: '100%' }}
          />
        )}
      </div>
    </div>
  );
}
