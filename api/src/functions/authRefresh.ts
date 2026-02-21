import { app, HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { RefreshPayload } from '../shared/types.js';

app.http('authRefresh', {
  methods: ['POST'],
  route: 'auth/refresh',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      const body = (await request.json()) as { refreshToken?: string };
      if (!body?.refreshToken) {
        return jsonResponse(400, { message: 'refreshToken is required' });
      }

      const secret = process.env.JWT_SECRET || 'change-me-in-prod';

      let decoded: RefreshPayload;
      try {
        decoded = jwt.verify(body.refreshToken, secret) as RefreshPayload;
      } catch {
        return jsonResponse(401, { message: 'Invalid or expired refresh token' });
      }

      if (decoded.type !== 'refresh') {
        return jsonResponse(401, { message: 'Invalid token type' });
      }

      // Verify the user still exists
      const client = getTableClient(process.env.USERS_TABLE_NAME ?? 'Users');
      try {
        await client.getEntity('user', decoded.username);
      } catch (e: unknown) {
        if ((e as { statusCode?: number }).statusCode === 404) {
          return jsonResponse(401, { message: 'User no longer exists' });
        }
        throw e;
      }

      // Look up current role from DB
      const userEntity = await client.getEntity<Record<string, unknown>>('user', decoded.username);
      const role = (userEntity.role as string) ?? 'user';

      // Issue new tokens
      const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
      const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

      const accessPayload = { sub: decoded.username, username: decoded.username, role };
      const accessToken = jwt.sign(accessPayload, secret, { expiresIn });

      const refreshPayload = { sub: decoded.username, username: decoded.username, type: 'refresh' as const };
      const refreshToken = jwt.sign(refreshPayload, secret, { expiresIn: refreshExpiresIn });

      return jsonResponse(200, { accessToken, refreshToken, username: decoded.username, role });
    } catch (err) {
      return errorResponse(err);
    }
  },
});
