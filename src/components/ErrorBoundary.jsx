import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GS-Wholesale Runtime Error Caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearCacheAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          background: '#181818',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: 680,
            background: '#222',
            border: '1px solid #ff4d4f',
            borderRadius: 8,
            padding: 30,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ color: '#ff4d4f', marginTop: 0, fontSize: 20 }}>
              ⚠️ Application Encountered an Error
            </h2>
            <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6 }}>
              A runtime issue occurred while rendering the page. You can review the error details below or reset the local cache.
            </p>

            <div style={{
              background: '#111',
              color: '#ff7875',
              padding: '12px 16px',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12.5,
              whiteSpace: 'pre-wrap',
              margin: '16px 0',
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Page
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                style={{
                  padding: '10px 18px',
                  background: '#ff4d4f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🧹 Clear Local Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
