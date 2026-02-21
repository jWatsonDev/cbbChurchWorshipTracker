import { app } from '@azure/functions';
import { jsonResponse } from '../shared/httpHelpers.js';

app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: async () => jsonResponse(200, { status: 'ok' }),
});
