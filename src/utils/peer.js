export const getPeerConfig = () => {
  const host = import.meta.env.VITE_PEER_HOST || '0.peerjs.com';
  const path = import.meta.env.VITE_PEER_PATH || '/';
  const port = Number(import.meta.env.VITE_PEER_PORT || 443);
  const secure = String(import.meta.env.VITE_PEER_SECURE || 'true') === 'true';

  return {
    host,
    path,
    port,
    secure
  };
};
