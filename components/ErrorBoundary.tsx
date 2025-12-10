import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '16px' }}>
              Something went wrong
            </h1>
            
            <div style={{
              backgroundColor: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              marginBottom: '24px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#f87171'
            }}>
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            <button 
              onClick={() => window.location.reload()} 
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}