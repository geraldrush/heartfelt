const requiredEnvVars = {
  VITE_API_URL: 'Backend API URL',
  VITE_GOOGLE_CLIENT_ID: 'Google OAuth Client ID'
};

const optionalEnvVars = {
  VITE_APP_NAME: 'Application name (defaults to "Heartfelt")',
  VITE_DEBUG: 'Enable debug logging (defaults to false)',
  VITE_VAPID_PUBLIC_KEY: 'Web Push VAPID public key',
  VITE_PEER_HOST: 'PeerJS host',
  VITE_PEER_PATH: 'PeerJS path',
  VITE_PEER_PORT: 'PeerJS port',
  VITE_PEER_SECURE: 'PeerJS secure (true/false)'
};

export function validateEnvironment() {
  const missing = [];
  const config = {};
  
  // Check required variables
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    const value = import.meta.env[key];
    if (!value) {
      missing.push(`${key}: ${description}`);
    } else {
      config[key] = value;
    }
  });
  
  // Add optional variables with defaults
  Object.entries(optionalEnvVars).forEach(([key, description]) => {
    config[key] = import.meta.env[key] || getDefault(key);
  });
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(item => console.error(`  - ${item}`));
    throw new Error(`Missing required environment variables: ${missing.map(m => m.split(':')[0]).join(', ')}`);
  }
  
  console.log('✅ Environment configuration validated');
  return config;
}

function getDefault(key) {
  const defaults = {
    VITE_APP_NAME: 'Heartfelt',
    VITE_DEBUG: 'false',
    VITE_VAPID_PUBLIC_KEY: '',
    VITE_PEER_HOST: '',
    VITE_PEER_PATH: '',
    VITE_PEER_PORT: '',
    VITE_PEER_SECURE: ''
  };
  return defaults[key] || '';
}

export const config = validateEnvironment();
