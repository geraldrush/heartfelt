import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { validateEnvironment } from './utils/config.js'

// Validate environment configuration at startup
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment configuration error:', error.message);
  // Continue anyway in development
  if (import.meta.env.PROD) {
    throw error;
  }
}

const isChunkLoadError = (error) => {
  if (!error) return false;
  const message = typeof error === 'string' ? error : (error.message || '');
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed')
  );
};

const forceReload = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {}
  window.location.reload();
};

let hasReloaded = false;
const handleGlobalError = (eventOrError) => {
  const error = eventOrError?.reason || eventOrError?.error || eventOrError;
  if (hasReloaded || !isChunkLoadError(error)) return;
  hasReloaded = true;
  forceReload();
};

window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleGlobalError);
window.addEventListener('vite:preloadError', handleGlobalError);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Router>
  </StrictMode>,
)
