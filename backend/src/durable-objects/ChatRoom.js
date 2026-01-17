import { jwtVerify } from 'jose';
import {
  createMessage,
  updateMessageStatus,
  verifyUserInConnection,
} from '../utils/db.js';

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.heartbeats = new Map();
  }

  async authenticate(request) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) {
      throw new Error('Missing token');
    }
    const secret = new TextEncoder().encode(this.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.sub;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const connectionId = url.pathname.split('/').pop();

    const userId = await this.authenticate(request);
    const isAllowed = await verifyUserInConnection(this.env.DB, connectionId, userId);
    if (!isAllowed) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.connections.set(userId, server);
    this.startHeartbeat(userId);

    this.broadcast({ type: 'presence', user_id: userId, is_online: true }, userId);

    server.addEventListener('message', async (event) => {
      try {
        const payload = JSON.parse(event.data);
        await this.handleMessage(payload, userId, connectionId);
      } catch (error) {
        server.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      }
    });

    server.addEventListener('close', () => {
      this.cleanupConnection(userId);
      this.broadcast({ type: 'presence', user_id: userId, is_online: false }, userId);
    });

    server.addEventListener('error', () => {
      this.cleanupConnection(userId);
    });

    return new Response(null, { status: 101, webSocket: client });
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
        const messageId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        await createMessage(this.env.DB, {
          id: messageId,
          connection_id: connectionId,
          sender_id: senderId,
          content: payload.content,
          status: 'sent',
          created_at: createdAt,
        });

        const outgoing = {
          type: 'chat_message',
          id: messageId,
          connection_id: connectionId,
          sender_id: senderId,
          content: payload.content,
          status: 'sent',
          created_at: createdAt,
        };

        this.broadcast(outgoing, senderId);
        this.sendToUser(senderId, {
          type: 'delivery_confirmation',
          id: messageId,
          status: 'sent',
          client_id: payload.client_id || null,
        });
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
        if (payload.id) {
          await updateMessageStatus(this.env.DB, payload.id, 'delivered');
          this.broadcast(
            { type: 'delivery_confirmation', id: payload.id, status: 'delivered' },
            senderId
          );
        }
        break;
      }
      case 'read_receipt': {
        if (payload.id) {
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
      default:
        this.sendToUser(senderId, { type: 'error', message: 'Unknown message type.' });
    }
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
  }
}
