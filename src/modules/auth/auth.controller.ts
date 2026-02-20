import { auth } from '../../lib/auth';
import { Context } from 'hono';

export class AuthController {

    async handle(c: Context) {
        return auth.handler(c.req.raw);
    }
}
