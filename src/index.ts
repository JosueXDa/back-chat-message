import { Hono } from 'hono'
import 'dotenv/config'
import { auth } from './lib/auth'


const app = new Hono()

app.get('/api', (c) => {
  return c.text('Hello Hono!')
})

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app
