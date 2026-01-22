import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Environment validation plugin
function envValidationPlugin() {
  return {
    name: 'env-validation',
    buildStart() {
      const required = ['VITE_API_URL', 'VITE_GOOGLE_CLIENT_ID'];
      const missing = required.filter(key => !process.env[key]);
      
      if (missing.length > 0) {
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
        console.warn('📝 Copy .env.example to .env.local and configure required variables');
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), envValidationPlugin()],
})
