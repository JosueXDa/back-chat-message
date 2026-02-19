import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import 'dotenv/config'
import { auth } from './lib/auth'
import { Env } from './durable-objects/types';

// Export Durable Object classes — required for the Cloudflare Workers runtime
// to bind them as DO namespaces (referenced in wrangler.jsonc).
export { UserSession } from './durable-objects/user-session.do';
export { ChatThread } from './durable-objects/chat-thread.do';
import { UsersModule } from './modules/users/users.module'
import { ChannelModule } from './modules/channels/channel.module'
import { MemberAccessModule } from './modules/member-access/channel-access.module'
import { MessageModule } from './modules/messages/message.module'
import { ThreadModule } from './modules/threads/thread.module'
import { UploadModule } from './modules/uploads/uploads.module'
import { AuthModule } from './modules/auth/auth.module';

// Repositories
import { UserRepositoryImpl } from './modules/users/repositories/impl/user.repository.impl'
import { ChannelRepositoryImpl } from './modules/channels/repository/impl/channel.repository.impl'
import { ChannelMemberRepositoryImpl } from './modules/member-access/repositories/impl/channel-member.repository.impl'
import { MessageRepositoryImpl } from './modules/messages/repositories/impl/message.repository.impl'
import { ThreadRepositoryImpl } from './modules/threads/repositories/impl/thread.repository.impl'

// Services
import { UserService } from './modules/users/services/user.service'
import { ChannelService } from './modules/channels/services/channel.service'
import { ChannelMemberService } from './modules/member-access/services/channel-member.service'
import { MessageService } from './modules/messages/services/message.service'
import { ThreadService } from './modules/threads/services/thread.service'
import { AuthorizationService } from './modules/member-access/services/authorization.service'
import { UploadServiceImpl } from './modules/uploads/services/impl/uploads.service.impl'

// Controllers
import { UserController } from './modules/users/controllers/user.controller'
import { ChannelController } from './modules/channels/controllers/channel.controller'
import { ChannelMemberController } from './modules/member-access/controllers/channel-member.controller'
import { MessageController } from './modules/messages/controllers/message.controller'
import { ThreadController } from './modules/threads/controllers/thread.controller'
import { UploadController } from './modules/uploads/controllers/upload.controller'

export const app = new Hono<{ Bindings: Env }>()

// Configurar manejador global de errores de Hono
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // Log de errores HTTPException para debugging
    console.error(`[${err.status}] ${err.message}`, err.cause || '');

    // Obtener la respuesta personalizada del error
    return err.getResponse();
  }

  // Error inesperado
  console.error('Unexpected error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  }, 500);
});

// Manejador de rutas no encontradas
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path
  }, 404);
});


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

// --- Composition Root ---

// 1. Repositories
const userRepository = new UserRepositoryImpl();
const channelRepository = new ChannelRepositoryImpl();
const channelMemberRepository = new ChannelMemberRepositoryImpl();
const messageRepository = new MessageRepositoryImpl();
const threadRepository = new ThreadRepositoryImpl();

// 2. Services
const userService = new UserService(userRepository);
const authorizationService = new AuthorizationService(channelMemberRepository);
const channelService = new ChannelService(channelRepository);
const channelMemberService = new ChannelMemberService(channelMemberRepository, authorizationService);
const threadService = new ThreadService(threadRepository, authorizationService);
const messageService = new MessageService(
  messageRepository,
  threadRepository,
  authorizationService
);
const uploadService = new UploadServiceImpl();

// 3. Controllers
const userController = new UserController(userService);
const channelController = new ChannelController(channelService);
const channelMemberController = new ChannelMemberController(channelMemberService);
const messageController = new MessageController(messageService);
const threadController = new ThreadController(threadService);
const uploadController = new UploadController(uploadService);

// 4. Modules
const authModule = new AuthModule();
const usersModule = new UsersModule(userRepository, userService, userController);
const uploadModule = new UploadModule(uploadService, uploadController);

const channelModule = new ChannelModule(channelRepository, channelService, channelController);
const memberAccessModule = new MemberAccessModule(channelMemberRepository, channelMemberService, channelMemberController);
const messageModule = new MessageModule(messageRepository, messageService, messageController);
const threadModule = new ThreadModule(threadRepository, threadService, threadController);


app.route('/api/auth', authModule.router);
app.route('/api/users', usersModule.router);
app.route('/api/channels', channelModule.router);
app.route('/api/members', memberAccessModule.router);
app.route('/api/messages', messageModule.router);
app.route('/api/threads', threadModule.router);

app.route('/api', uploadModule.router);


app.get("/ws", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected websocket", 426);
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.UserSession.idFromName(session.user.id);
  const stub = c.env.UserSession.get(id);

  // Append userId to URL for the DO to identify the user
  const url = new URL(c.req.url);
  url.searchParams.set("userId", session.user.id);
  const newReq = new Request(url.toString(), c.req.raw as unknown as Request);

  return stub.fetch(newReq) as unknown as Promise<Response>;
});

export default {
  port: 3000,
  hostname: 'localhost',
  fetch: app.fetch,
}
