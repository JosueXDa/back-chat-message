import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'
import 'dotenv/config'
import { auth } from './lib/auth'
import { usersModule } from './modules/users/users.module'
import { ChatModule } from './modules/chat/chat.module'
import { ChatGateway } from './modules/chat/gateway/chat.gateway'
import { ConnectionManager } from './modules/chat/gateway/connection.manager'
import { MessageService } from './modules/chat/services/message.service'
import { MessageRepository } from './modules/chat/repositories/message.repository'
import { ChannelMemberService } from './modules/chat/services/channel-member.service'
import { ChannelMemberRepository } from './modules/chat/repositories/channel-member.repository'

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket<{ user: any }>>()

export const app = new Hono()


app.use('/api/*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.get('/api', (c) => {
  return c.text('Hello Hono!')
})

// Dependency Injection for WebSocket
const messageRepository = new MessageRepository();
const channelMemberRepository = new ChannelMemberRepository();
const messageService = new MessageService(messageRepository);
const channelMemberService = new ChannelMemberService(channelMemberRepository);
const connectionManager = new ConnectionManager();

const chatGateway = new ChatGateway(
  connectionManager,
  messageService,
  channelMemberService
);

// inyeccion de dependencias explicita para purebas
const customChatModule = new ChatModule({
  auth
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route('/api/users', usersModule.router);
app.route('/api/chats', customChatModule.router);

app.get(
  '/ws',
  upgradeWebSocket(async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return { error: 'Unauthorized' }
    }

    return {
      onOpen: (event, ws) => {
        // Attach user to ws data manually since we can't easily type the ws object here in the callback signature to match exactly what we want without casting
        // But we can pass the ws object to the gateway
        if (ws.raw) {
          ws.raw.data = { user: session.user };
          chatGateway.handleConnection(ws.raw as any);
        }
      },
      onMessage: (event, ws) => {
        if (ws.raw) {
          chatGateway.handleMessage(ws.raw as any, event.data as string);
        }
      },
      onClose: (event, ws) => {
        if (ws.raw) {
          chatGateway.handleDisconnect(ws.raw as any);
        }
      },
    }
  })
)

export default {
  port: 3000,
  hostname: 'localhost',
  fetch: app.fetch,
  websocket
}
