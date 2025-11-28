import { Hono } from 'hono'
import 'dotenv/config'
import { auth } from './lib/auth'
import { usersModule } from './modules/users/users.module'
import { chatModule } from './modules/chat/chat.module'

const app = new Hono()

app.get('/api', (c) => {
  return c.text('Hello Hono!')
})

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route('/api/users', usersModule.router)
app.route('/api/channels', chatModule.router)

export default app
