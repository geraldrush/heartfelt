# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
# heartfelt

## Environment setup

Frontend (Vite):
- Set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth client ID.

Backend (Cloudflare Workers):
- Set `JWT_SECRET` to a random 32+ character string.
- Set `CORS_ORIGIN` to a comma-separated list of allowed origins.
- Set `GOOGLE_CLIENT_ID` to your Google OAuth client ID.
- For local dev: update `backend/.dev.vars`.
- For production: update `backend/wrangler.toml` and run `wrangler secret put JWT_SECRET`.
