# Heartfelt Backend

Cloudflare Workers backend with Durable Objects for real-time chat functionality.

## Environment Variables for Production

### Required Variables

- **JWT_SECRET**: Secret key for JWT signing (must be set in Workers dashboard)
  - Generate: `openssl rand -base64 32`
  - Set via: `wrangler secret put JWT_SECRET`
  - Never commit this value to version control

- **CORS_ORIGIN**: Comma-separated list of allowed origins
  - Example: `https://heartfelt.pages.dev,https://heartfelt-2ti.pages.dev`
  - Set in `wrangler.toml` or Workers dashboard

- **GOOGLE_CLIENT_ID**: Google OAuth client ID
  - Obtain from Google Cloud Console
  - Set in `wrangler.toml` or Workers dashboard

### Local Development

Create `.dev.vars` file in backend directory:

```
JWT_SECRET=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=<your-google-client-id>
```

### Security Notes

- JWT_SECRET must be at least 32 characters
- Never commit JWT_SECRET to version control
- Use different JWT_SECRET for production and development
- CORS_ORIGIN should only include trusted domains

## Production Deployment Checklist

### 1. Environment Variables
- [ ] Verify `JWT_SECRET` is set in Workers environment variables (not in wrangler.toml)
- [ ] Verify `CORS_ORIGIN` includes all production frontend URLs
- [ ] Verify `GOOGLE_CLIENT_ID` matches OAuth configuration

### 2. Database Setup
- [ ] Run `wrangler d1 execute heartfelt-db --remote --file=./migrations/0001_initial_schema.sql`
- [ ] Verify database tables are created correctly

### 3. Deployment
- [ ] Run `wrangler deploy` to deploy backend with Durable Objects
- [ ] Verify deployment shows no errors
- [ ] Check Workers dashboard for successful deployment

### 4. Testing
- [ ] Test WebSocket connection from production frontend
- [ ] Verify Worker logs show successful origin validation
- [ ] Test token refresh endpoint with production tokens
- [ ] Verify CSRF protection is working (test with invalid origin)
- [ ] Test Google OAuth flow end-to-end

### 5. Monitoring
- [ ] Check Workers analytics for error rates
- [ ] Monitor Durable Objects usage and performance
- [ ] Set up alerts for high error rates or failures

## Rate Limiting

The backend implements comprehensive rate limiting to prevent abuse and ensure fair usage:

### Endpoint Limits

| Endpoint | Limit | Window | Middleware |
|----------|-------|--------|-----------|
| `/api/auth/email-login` | 5 requests | 15 minutes | `authRateLimit` |
| `/api/auth/email-signup` | 5 requests | 15 minutes | `authRateLimit` |
| `/api/auth/google` | 5 requests | 15 minutes | `authRateLimit` |
| `/api/auth/forgot-password` | 5 requests | 15 minutes | `authRateLimit` |
| `/api/auth/reset-password` | 5 requests | 15 minutes | `authRateLimit` |
| `/api/connections/request` | 10 requests | 1 hour | `connectionRequestRateLimit` |
| Chat messages (WebSocket) | 60 messages | 1 minute | Durable Object internal |

### Error Response Format

All rate-limited endpoints return consistent error responses:

```json
{
  "error": "Too many requests",
  "retryAfter": 300
}
```

With HTTP headers:
- `Status: 429 Too Many Requests`
- `Retry-After: 300` (seconds)
- `X-RateLimit-Limit: 5`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 1234567890` (Unix timestamp)

### KV Setup for Production

For production environments, configure KV namespace for persistent rate limiting:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your_kv_namespace_id"
preview_id = "your_preview_kv_namespace_id"
```

The app will use in-memory fallback if KV is not configured.

### Troubleshooting Rate Limits

- **429 errors**: Check rate limit headers in response
- **Unexpected blocks**: Verify system clock is accurate
- **KV issues**: App falls back to in-memory storage automatically
- **Testing**: Use different IP addresses or wait for window to reset

## Troubleshooting

### CORS Errors
- Check `CORS_ORIGIN` environment variable
- Verify frontend URL matches exactly (including protocol)
- Check browser developer tools for specific CORS error

### Authentication Errors
- Verify `JWT_SECRET` is set correctly
- Check token expiration (30 days default)
- Verify Google OAuth client ID matches

### WebSocket Connection Failures
- Use `/api/chat/connection-status/:connectionId` endpoint for diagnostics
- Check origin validation in Worker logs
- Verify user has permission for the connection
- Test with different browsers/networks

### Database Issues
- Verify D1 database is properly configured
- Check migration files have been applied
- Use `wrangler d1 execute` to run manual queries for debugging