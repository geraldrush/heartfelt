# Heartfelt

A React-based social platform with Cloudflare Workers backend.

## Environment Configuration

### Frontend (Vite)

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure required variables in `.env.local`:
   - `VITE_API_URL`: Backend API URL (http://localhost:8787 for dev)
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID

### Backend (Cloudflare Workers)

1. Configure `backend/.dev.vars` for development:
   ```
   JWT_SECRET=<generate-with-openssl-rand-base64-32>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   ```

2. Configure production secrets:
   ```bash
   cd backend
   wrangler secret put JWT_SECRET
   wrangler secret put GOOGLE_CLIENT_ID
   ```

3. Update `backend/wrangler.toml` CORS_ORIGIN with your domain.

## Development

```bash
# Frontend
npm run dev

# Backend
npm run dev:backend
```

## Production Deployment

1. Create `.env.production` with production API URL
2. Deploy backend: `cd backend && wrangler deploy`
3. Build frontend: `npm run build`
