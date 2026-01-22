import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
