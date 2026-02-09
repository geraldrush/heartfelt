import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Environment validation plugin
function envValidationPlugin(env) {
  return {
    name: 'env-validation',
    buildStart() {
      const required = ['VITE_API_URL', 'VITE_GOOGLE_CLIENT_ID'];
      const missing = required.filter((key) => !env?.[key]);
      
      if (missing.length > 0) {
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
        console.warn('📝 Copy .env.example to .env.local and configure required variables');
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), envValidationPlugin(env)],
  };
});
