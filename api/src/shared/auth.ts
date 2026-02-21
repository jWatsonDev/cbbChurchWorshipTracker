import { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { JwtPayload } from './types.js';

export function verifyAuth(request: HttpRequest): JwtPayload {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    throw { status: 401, body: { message: 'Missing or invalid Authorization header' } };
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'change-me-in-prod';
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw { status: 401, body: { message: 'Invalid or expired token' } };
  }
}
