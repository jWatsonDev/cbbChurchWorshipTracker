import { app, HttpRequest } from '@azure/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';

app.http('authLogin', {
  methods: ['POST'],
  route: 'auth/login',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      const body = (await request.json()) as { username?: string; password?: string };
      if (!body?.username || !body?.password) {
        return jsonResponse(400, { message: 'username and password are required' });
      }

      const client = getTableClient(process.env.USERS_TABLE_NAME ?? 'Users');
      await client.createTable();

      let entity;
      try {
        entity = await client.getEntity<Record<string, unknown>>('user', body.username);
      } catch (e: unknown) {
        if ((e as { statusCode?: number }).statusCode === 404) {
          return jsonResponse(401, { message: 'Invalid credentials' });
        }
        throw e;
      }

      const passwordHash = (entity.passwordHash as string) ?? '';
      const matches = await bcrypt.compare(body.password, passwordHash);
      if (!matches) {
        return jsonResponse(401, { message: 'Invalid credentials' });
      }

      const role = (entity.role as string) ?? 'user';
      const payload = { sub: body.username, username: body.username, role };
      const secret = process.env.JWT_SECRET || 'change-me-in-prod';
      const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
      const accessToken = jwt.sign(payload, secret, { expiresIn });

      return jsonResponse(200, { accessToken, username: body.username, role });
    } catch (err) {
      return errorResponse(err);
    }
  },
});
