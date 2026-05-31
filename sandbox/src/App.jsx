import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { ThemeProvider, createTheme, CssBaseline, Box, IconButton, Typography } from '@mui/material';
import { LightMode, DarkMode, Bolt } from '@mui/icons-material';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import EndpointSidebar from './components/EndpointSidebar';

function App() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
          primary: {
            main: theme === 'light' ? '#2563eb' : '#3b82f6',
          },
          background: {
            default: theme === 'light' ? '#f8fafc' : '#121212',
            paper: 'transparent',
          }
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          button: {
            textTransform: 'none',
            fontWeight: 600,
          }
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                boxShadow: 'none',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
              }
            }
          }
        }
      }),
    [theme]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/bookmarks');
      if (res.data && res.data.data) {
        setBookmarks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleAddBookmark = useCallback(async (url, method) => {
    try {
      await axios.post('http://localhost:3000/api/bookmarks', { url, method });
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to add bookmark', err);
    }
  }, [fetchBookmarks]);

  const handleRemoveBookmark = useCallback(async (url, method) => {
    try {
      await axios.delete('http://localhost:3000/api/bookmarks', { data: { url, method } });
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  }, [fetchBookmarks]);

  const handleSelectEndpoint = useCallback((path, method, baseUrl) => {
    const finalBaseUrl = baseUrl || 'http://localhost:3000';
    setSelectedEndpoint({ url: `${finalBaseUrl}${path}`, method });
  }, []);

  const handleRequest = useCallback(async (config) => {
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
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="app-container">
        <header className="header glass-panel" style={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bolt sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.025em', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Aero Sandbox API
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} color="inherit">
            {theme === 'light' ? <DarkMode /> : <LightMode />}
          </IconButton>
        </header>
        
        <main className="main-content">
        <PanelGroup direction={isMobile ? "vertical" : "horizontal"}>
          <Panel defaultSize={20} minSize={15}>
            <EndpointSidebar 
              onSelectEndpoint={handleSelectEndpoint} 
              bookmarks={bookmarks}
              onRemoveBookmark={handleRemoveBookmark}
            />
          </Panel>
          
          <PanelResizeHandle className="custom-resizer" />
          
          <Panel defaultSize={40} minSize={30}>
            <RequestPanel 
              onRequest={handleRequest} 
              loading={loading} 
              selectedEndpoint={selectedEndpoint}
              bookmarks={bookmarks}
              onAddBookmark={handleAddBookmark}
              onRemoveBookmark={handleRemoveBookmark}
            />
          </Panel>
          
          <PanelResizeHandle className="custom-resizer" />
          
          <Panel defaultSize={40} minSize={30}>
            <ResponsePanel response={response} loading={loading} />
          </Panel>
          </PanelGroup>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
