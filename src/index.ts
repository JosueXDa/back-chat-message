import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { upgradeWebSocket, websocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'
import 'dotenv/config'
import { auth } from './lib/auth'
import { usersModule } from './modules/users/users.module'
import { ChatModule } from './modules/chat/chat.module'
import { uploadModule } from './modules/uploads/uploads.module'
import { ChatGateway } from './modules/chat/gateway/chat.gateway'
import { ConnectionManager } from './modules/chat/gateway/connection.manager'
import { MessageService } from './modules/chat/services/message.service'
import { MessageRepository } from './modules/chat/repositories/message.repository'
import { ChannelMemberService } from './modules/chat/services/channel-member.service'
import { ChannelMemberRepository } from './modules/chat/repositories/channel-member.repository'
import { ThreadService } from './modules/chat/services/thread.service'
import { ThreadRepository } from './modules/chat/repositories/thread.repository'
import { MessageEventEmitter } from './modules/chat/services/message-event.emitter'
import { AuthorizationService } from './modules/chat/services/authorization.service'
import { DebugController } from './modules/chat/controllers/debug.controller'

export const app = new Hono()


app.use('/api/*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.get('/api', (c) => {
  return c.text('Hello Hono!')
})

// Dependency Injection for WebSocket
// MessageEventEmitter es el corazón del sistema: FUENTE ÚNICA DE VERDAD
const messageEventEmitter = new MessageEventEmitter();
const messageRepository = new MessageRepository();
const channelMemberRepository = new ChannelMemberRepository();
const threadRepository = new ThreadRepository();

// AuthorizationService centraliza las validaciones de permisos
const authorizationService = new AuthorizationService(channelMemberRepository);

const threadService = new ThreadService(threadRepository, authorizationService);
const messageService = new MessageService(
  messageRepository,
  threadRepository,
  authorizationService,
  messageEventEmitter
);
const channelMemberService = new ChannelMemberService(channelMemberRepository);
const connectionManager = new ConnectionManager();

const chatGateway = new ChatGateway(
  connectionManager,
  messageService,
  threadService,
  channelMemberService,
  messageEventEmitter
);

// Debug controller para monitorear el estado del gateway
const debugController = new DebugController(chatGateway);

// inyeccion de dependencias explicita para pruebas
const customChatModule = new ChatModule({
  messageEventEmitter
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route('/api/users', usersModule.router);
app.route('/api/chats', customChatModule.router);
app.route('/api', uploadModule.router);
app.route('/api/debug', debugController.router);

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
          wsConnection.data = { ...wsConnection.data, user: session.user };
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
