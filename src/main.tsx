import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Global suppression of refresh token and stale session errors from Supabase in the browser
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  const isStaleTokenErrStr = (msg: any): boolean => {
    if (!msg) return false;
    const str = typeof msg === 'string' ? msg : String(msg?.message || msg || '');
    const lower = str.toLowerCase();
    return (
      lower.includes('refresh token') ||
      lower.includes('refresh_token') ||
      lower.includes('invalid_grant') ||
      lower.includes('token not found') ||
      lower.includes('grant_not_found')
    );
  };

  console.error = function (...args) {
    if (args.some(isStaleTokenErrStr)) {
      // Swallowed stale session refresh warnings cleanly
      return;
    }
    originalConsoleError.apply(this, args);
  };

  console.warn = function (...args) {
    if (args.some(isStaleTokenErrStr)) {
      // Swallowed stale session refresh warnings cleanly
      return;
    }
    originalConsoleWarn.apply(this, args);
  };

  window.addEventListener('error', (e) => {
    const errMsg = e.error?.message || e.message || '';
    if (isStaleTokenErrStr(errMsg)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const errMsg = e.reason?.message || String(e.reason || '');
    if (isStaleTokenErrStr(errMsg)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
