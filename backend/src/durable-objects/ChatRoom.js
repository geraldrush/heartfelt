import { jwtVerify } from 'jose';
import {
  createMessage,
  updateMessageStatus,
  verifyUserInConnection,
  getConnectionById,
} from '../utils/db.js';
import { createNotification } from '../utils/notifications.js';
import { getAllowedOrigins, isOriginAllowed, isRefererAllowed } from '../utils/cors.js';

// Sanitize content to prevent XSS
const sanitizeContent = (content) => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Server-side diagnostics helper
const logRequestDiagnostics = (request, connectionId, timestamp) => {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const userAgent = request.headers.get('User-Agent');
  const upgradeHeader = request.headers.get('Upgrade');
  
  console.log(`[WS-Server] ${timestamp} === REQUEST DIAGNOSTICS ===`);
  console.log(`[WS-Server] ${timestamp} Connection ID: ${connectionId}`);
  console.log(`[WS-Server] ${timestamp} Origin: ${origin}`);
  console.log(`[WS-Server] ${timestamp} Referer: ${referer}`);
  console.log(`[WS-Server] ${timestamp} User-Agent: ${userAgent}`);
  console.log(`[WS-Server] ${timestamp} Upgrade Header: ${upgradeHeader}`);
  console.log(`[WS-Server] ${timestamp} Request URL: ${request.url}`);
  console.log(`[WS-Server] ${timestamp} Request Method: ${request.method}`);
  console.log(`[WS-Server] ${timestamp} === END DIAGNOSTICS ===`);
};

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.heartbeats = new Map();
    this.messageIds = new Set(); // Track message IDs to prevent duplicates
    this.messageRateLimits = new Map(); // Track message counts per user
    this.roomTypeCache = new Map(); // connectionId -> 'connection' | 'live'
  }

  async handleCallStatus(request, connectionId) {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload.status !== 'string') {
      return new Response('Invalid call status payload', { status: 400 });
    }

    const status = sanitizeContent(payload.status);
    const allowedStatuses = new Set(['ringing', 'accepted', 'declined', 'ended', 'expired', 'canceled']);
    if (!allowedStatuses.has(status)) {
      return new Response('Invalid call status', { status: 400 });
    }

    this.broadcast({
      type: 'call_status',
      status,
      request_id: payload.request_id || null,
      from_user_id: payload.from_user_id || null,
      to_user_id: payload.to_user_id || null,
      connection_id: connectionId,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  checkMessageRateLimit(userId) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxMessages = 60;
    
    let userData = this.messageRateLimits.get(userId);
    if (!userData) {
      userData = { timestamps: [], lastCleanup: now };
      this.messageRateLimits.set(userId, userData);
    }
    
    // Clean old timestamps
    const cutoff = now - windowMs;
    userData.timestamps = userData.timestamps.filter(ts => ts > cutoff);
    
    if (userData.timestamps.length >= maxMessages) {
      const oldestTimestamp = userData.timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    userData.timestamps.push(now);
    userData.lastCleanup = now;
    return { allowed: true, retryAfter: 0 };
  }

  async authenticate(request) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const timestamp = new Date().toISOString();
    
    if (!token) {
      console.log(`[WS-Server] ${timestamp} Authentication failed: token missing from query params`);
      throw new Error('Missing token');
    }
    
    try {
      console.log(`[WS-Server] ${timestamp} JWT verification attempt for token: ${token.slice(0, 4)}...${token.slice(-4)}`);
      const secret = new TextEncoder().encode(this.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      console.log(`[WS-Server] ${timestamp} JWT verification successful for user: ${payload.sub}`);
      return payload.sub;
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[WS-Server] ${timestamp} JWT verification failed:`, error.message);
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new Error('TOKEN_EXPIRED');
      } else if (error.code === 'ERR_JWS_INVALID') {
        throw new Error('INVALID_SIGNATURE');
      } else if (error.code === 'ERR_JWT_MALFORMED') {
        throw new Error('MALFORMED_TOKEN');
      } else {
        throw new Error('INVALID_TOKEN');
      }
    }
  }

  async fetch(request) {
    const timestamp = new Date().toISOString();
    const url = new URL(request.url);
    const connectionId = url.pathname.split('/').pop();

    if (request.method === 'POST' && url.pathname.includes('/call-status/')) {
      return this.handleCallStatus(request, connectionId);
    }

    // Origin validation with comprehensive logging
    const origin = request.headers.get('Origin');
    const allowedOrigins = getAllowedOrigins(this.env);
    
    console.log(`[WS-Server] ${timestamp} Origin check: ${origin} against allowed: [${allowedOrigins.join(', ')}]`);
    
    if (origin && !isOriginAllowed(origin, this.env)) {
      console.log(`[WS-Server] ${timestamp} Origin REJECTED: ${origin}`);
      logRequestDiagnostics(request, connectionId, timestamp);
      return new Response('Forbidden origin', { status: 403 });
    }
    
    console.log(`[WS-Server] ${timestamp} Origin check: PASSED`);

    // Authentication with logging
    let userId;
    try {
      console.log(`[WS-Server] ${timestamp} Authenticating request for connection: ${connectionId}`);
      userId = await this.authenticate(request);
      console.log(`[WS-Server] ${timestamp} Authentication successful for user: ${userId}`);
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[WS-Server] ${timestamp} Authentication failed: ${error.message}`);
      logRequestDiagnostics(request, connectionId, timestamp);
      
      // Return proper HTTP error for mobile browsers
      if (error.message === 'TOKEN_EXPIRED') {
        return new Response('Token expired', { status: 401 });
      }
      if (error.message === 'INVALID_SIGNATURE') {
        return new Response('Invalid token signature', { status: 401 });
      }
      if (error.message === 'MALFORMED_TOKEN') {
        return new Response('Malformed token', { status: 401 });
      }
      return new Response('Invalid token', { status: 401 });
    }

    // Database verification with logging
    console.log(`[WS-Server] ${timestamp} Verifying user ${userId} for connection ${connectionId}`);
    const verificationResult = await verifyUserInConnection(this.env.DB, connectionId, userId);
    
    if (!verificationResult.valid) {
      console.log(`[WS-Server] ${timestamp} Verification failed: ${verificationResult.reason} - ${verificationResult.message}`);
      logRequestDiagnostics(request, connectionId, timestamp);
      return new Response(verificationResult.message, { status: 403 });
    }
    
    console.log(`[WS-Server] ${timestamp} User ${userId} verified for connection ${connectionId}`);

    // CSRF protection - validate referer header
    const referer = request.headers.get('Referer');
    console.log(`[WS-Server] ${timestamp} Referer check: ${referer}`);
    
    if (referer && !isRefererAllowed(referer, this.env)) {
      console.log(`[WS-Server] ${timestamp} Invalid referer: ${referer}`);
      return new Response('Invalid referer', { status: 403 });
    }

    // WebSocket upgrade check
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      console.log(`[WS-Server] ${timestamp} Invalid Upgrade header: ${upgradeHeader}, expected: websocket`);
      return new Response('Expected WebSocket', { status: 426 });
    }

    // iOS Safari compatibility: Check for mobile user agent
    const userAgent = request.headers.get('User-Agent') || '';
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    
    console.log(`[WS-Server] ${timestamp} Mobile: ${isMobile}, Safari: ${isSafari}`);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    // Enhanced WebSocket configuration for mobile browsers
    const acceptOptions = {};
    if (isMobile || isSafari) {
      // Mobile-specific WebSocket handling
      console.log(`[WS-Server] ${timestamp} Applying mobile WebSocket optimizations`);
    }

    server.accept();
    
    // Close any existing connection for this user to prevent conflicts
    const existingConnection = this.connections.get(userId);
    if (existingConnection) {
      console.log(`[WS-Server] ${timestamp} Closing existing connection for user ${userId}`);
      try {
        existingConnection.close(1000, 'New connection established');
      } catch (e) {
        // Ignore errors when closing old connection
      }
    }
    
    this.connections.set(userId, server);
    this.startHeartbeat(userId);
    
    console.log(`[WS-Server] ${timestamp} ✅ WebSocket connection ACCEPTED for user ${userId} on connection ${connectionId}`);
    console.log(`[WS-Server] ${timestamp} Active connections in room: ${this.connections.size}`);

    for (const [otherUserId] of this.connections.entries()) {
      if (otherUserId === userId) {
        continue;
      }
      this.sendToUser(userId, {
        type: 'presence',
        user_id: otherUserId,
        is_online: true,
      });
    }

    this.broadcast({ type: 'presence', user_id: userId, is_online: true }, userId);

    server.addEventListener('message', async (event) => {
      try {
        // Validate message size to prevent DoS
        if (event.data.length > 10000) {
          server.send(JSON.stringify({ type: 'error', message: 'Message too large.' }));
          return;
        }
        
        const payload = JSON.parse(event.data);
        
        // Validate payload structure
        if (!payload || typeof payload !== 'object' || !payload.type) {
          server.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
          return;
        }
        
        // Whitelist allowed message types
        const allowedTypes = ['chat_message', 'typing_indicator', 'delivery_confirmation', 'read_receipt', 'notification', 'pong'];
        if (!allowedTypes.includes(payload.type)) {
          server.send(JSON.stringify({ type: 'error', message: 'Invalid message type.' }));
          return;
        }
        
        await this.handleMessage(payload, userId, connectionId);
      } catch (error) {
        server.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      }
    });

    server.addEventListener('close', (event) => {
      console.log(`[WS-Server] ${timestamp} Connection closed for user ${userId}: code=${event.code}, reason=${event.reason}`);
      this.cleanupConnection(userId);
      this.broadcast({ type: 'presence', user_id: userId, is_online: false }, userId);
    });

    server.addEventListener('error', (event) => {
      console.log(`[WS-Server] ${timestamp} Connection error for user ${userId}:`, event);
      this.cleanupConnection(userId);
    });

    return new Response(null, { 
      status: 101, 
      webSocket: client,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        // Mobile browser compatibility headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  broadcast(message, excludeUserId) {
    const data = JSON.stringify(message);
    for (const [userId, socket] of this.connections.entries()) {
      if (userId === excludeUserId) {
        continue;
      }
      try {
        socket.send(data);
      } catch (error) {
        this.connections.delete(userId);
      }
    }
  }

  async handleMessage(payload, senderId, connectionId) {
    switch (payload.type) {
      case 'chat_message': {
        if (typeof payload.content !== 'string' || !payload.content.trim()) {
          this.sendToUser(senderId, { type: 'error', message: 'Message is empty.' });
          return;
        }

        const roomType = await this.getRoomType(connectionId);
        if (!roomType) {
          this.sendToUser(senderId, { type: 'error', message: 'Invalid room.' });
          return;
        }

        // Check rate limit
        const rateLimitResult = this.checkMessageRateLimit(senderId);
        if (!rateLimitResult.allowed) {
          this.sendToUser(senderId, { 
            type: 'error', 
            message: 'Too many messages. Please slow down.', 
            retryAfter: rateLimitResult.retryAfter 
          });
          return;
        }
        
        // Check for duplicate message using client_id
        const sanitizedClientId = payload.client_id && typeof payload.client_id === 'string' ? sanitizeContent(payload.client_id) : null;
        if (sanitizedClientId && this.messageIds.has(sanitizedClientId)) {
          console.log(`[WS-Server] Duplicate message detected: ${sanitizedClientId}`);
          return; // Silently ignore duplicate
        }
        
        const messageId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        
        // Track message to prevent duplicates
        if (sanitizedClientId) {
          this.messageIds.add(sanitizedClientId);
          // Clean up old message IDs (keep last 1000)
          if (this.messageIds.size > 1000) {
            const oldIds = Array.from(this.messageIds).slice(0, 100);
            oldIds.forEach(id => this.messageIds.delete(id));
          }
        }
        
        const sanitizedContent = sanitizeContent(payload.content.trim());

        const outgoing = {
          type: 'chat_message',
          id: messageId,
          connection_id: connectionId,
          sender_id: senderId,
          content: sanitizedContent,
          status: 'sent',
          created_at: createdAt,
        };

        if (roomType === 'connection') {
          await createMessage(this.env.DB, {
            id: messageId,
            connection_id: connectionId,
            sender_id: senderId,
            content: sanitizedContent,
            status: 'sent',
            created_at: createdAt,
          });
        }

        this.broadcast(outgoing, senderId);
        this.sendToUser(senderId, {
          type: 'delivery_confirmation',
          id: messageId,
          status: 'sent',
          client_id: sanitizedClientId,
        });

        if (roomType === 'connection') {
          try {
            const connection = await getConnectionById(this.env.DB, connectionId);
            if (connection) {
              const recipientId = connection.user_id_1 === senderId
                ? connection.user_id_2
                : connection.user_id_1;
              const recipientConnected = this.connections.has(recipientId);
              if (recipientId && !recipientConnected) {
                await createNotification(
                  this.env.DB,
                  {
                    user_id: recipientId,
                    type: 'message',
                    title: 'New message',
                    message: 'You have a new message',
                    data: { connection_id: connectionId, sender_id: senderId, notification_type: 'message_received' }
                  },
                  this.env
                );
              }
            }
          } catch (error) {
            console.error('[WS-Server] Failed to create message notification:', error?.message || error);
          }
        }
        break;
      }
      case 'typing_indicator': {
        this.broadcast(
          {
            type: 'typing_indicator',
            user_id: senderId,
            is_typing: Boolean(payload.is_typing),
          },
          senderId
        );
        break;
      }
      case 'delivery_confirmation': {
        const roomType = await this.getRoomType(connectionId);
        if (roomType === 'connection' && payload.id && typeof payload.id === 'string') {
          await updateMessageStatus(this.env.DB, payload.id, 'delivered');
          this.broadcast(
            { type: 'delivery_confirmation', id: payload.id, status: 'delivered' },
            senderId
          );
        }
        break;
      }
      case 'read_receipt': {
        const roomType = await this.getRoomType(connectionId);
        if (roomType === 'connection' && payload.id && typeof payload.id === 'string') {
          await updateMessageStatus(this.env.DB, payload.id, 'read');
          this.broadcast(
            { type: 'read_receipt', id: payload.id, status: 'read' },
            senderId
          );
        }
        break;
      }
      case 'pong': {
        this.startHeartbeat(senderId);
        break;
      }
      case 'notification': {
        const notificationType = typeof payload.notification_type === 'string'
          ? sanitizeContent(payload.notification_type)
          : null;
        if (notificationType !== 'video_call_request') {
          this.sendToUser(senderId, { type: 'error', message: 'Invalid notification type.' });
          return;
        }
        this.broadcast(
          {
            type: 'notification',
            notification_type: notificationType,
            from_user_id: senderId,
            connection_id: connectionId,
            created_at: new Date().toISOString(),
          },
          senderId
        );
        break;
      }
      default:
        this.sendToUser(senderId, { type: 'error', message: 'Unknown message type.' });
    }
  }

  async getRoomType(connectionId) {
    if (this.roomTypeCache.has(connectionId)) {
      return this.roomTypeCache.get(connectionId);
    }
    const connection = await getConnectionById(this.env.DB, connectionId);
    if (connection) {
      this.roomTypeCache.set(connectionId, 'connection');
      return 'connection';
    }
    const liveRoom = await this.env.DB
      .prepare('SELECT id FROM live_rooms WHERE id = ?')
      .bind(connectionId)
      .first();
    if (liveRoom) {
      this.roomTypeCache.set(connectionId, 'live');
      return 'live';
    }
    return null;
  }

  sendToUser(userId, message) {
    const socket = this.connections.get(userId);
    if (!socket) {
      return;
    }
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      this.connections.delete(userId);
    }
  }

  startHeartbeat(userId) {
    this.stopHeartbeat(userId);
    const interval = setInterval(() => {
      this.sendToUser(userId, { type: 'ping' });
    }, 25000);
    this.heartbeats.set(userId, interval);
  }

  stopHeartbeat(userId) {
    const interval = this.heartbeats.get(userId);
    if (interval) {
      clearInterval(interval);
      this.heartbeats.delete(userId);
    }
  }

  cleanupConnection(userId) {
    this.connections.delete(userId);
    this.stopHeartbeat(userId);
    
    // Cleanup rate limit data for disconnected user
    const now = Date.now();
    const userData = this.messageRateLimits.get(userId);
    if (userData && now - userData.lastCleanup > 2 * 60 * 1000) {
      this.messageRateLimits.delete(userId);
    }
  }
}
