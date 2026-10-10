import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { DensityProvider } from './components/common/CompactDensityContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f8fafc', padding: 24, textAlign: 'center', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>منظومة المحاسب القانوني ومراقب الحسابات</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 450, marginBottom: 20, lineHeight: 1.6 }}>
            {this.state.error?.message || 'حدث خطأ غير متوقع أثناء معالجة الشاشة.'}
          </p>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('mg_active_tab');
                sessionStorage.clear();
              } catch {}
              window.location.reload();
            }}
            style={{ padding: '10px 24px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
          >
            تحديث المنظومة وإعادة المحاولة 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Remove top-level blocking initialization; handled inside App lifecycle

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <DensityProvider>
        <App />
      </DensityProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

// Register service worker for Offline-First app execution
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Offline ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
  });
}



