import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { upgradeWebSocket, websocket } from 'hono/bun'
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

    let wsConnection: ServerWebSocket<{ user: any }> | null = null;

    return {
      onOpen: (event, ws) => {
        // Store WebSocket reference and attach user data
        wsConnection = ws.raw as ServerWebSocket<{ user: any }>;
        if (wsConnection) {
          wsConnection.data = { user: session.user };
          chatGateway.handleConnection(wsConnection);
        }
      },
      onMessage: (event, ws) => {
        wsConnection = ws.raw as ServerWebSocket<{ user: any }>;
        if (wsConnection) {
          chatGateway.handleMessage(wsConnection, event.data as string);
        }
      },
      onClose: (event, ws) => {
        wsConnection = ws.raw as ServerWebSocket<{ user: any }>;
        if (wsConnection) {
          chatGateway.handleDisconnect(wsConnection);
        }
        wsConnection = null;
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
