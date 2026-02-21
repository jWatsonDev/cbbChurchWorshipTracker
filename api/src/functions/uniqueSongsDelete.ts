import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';

app.http('uniqueSongsDelete', {
  methods: ['DELETE'],
  route: 'unique-songs/{id}',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const id = request.params.id;
      if (!id?.trim()) {
        return jsonResponse(400, { message: 'id parameter is required' });
      }

      const client = getTableClient(process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs');
      await client.createTable().catch(() => {});

      try {
        await client.deleteEntity('song', id, { etag: '*' });
      } catch (e: unknown) {
        if ((e as { statusCode?: number }).statusCode === 404) {
          return jsonResponse(204, null);
        }
        throw e;
      }

      return jsonResponse(204, null);
    } catch (err) {
      return errorResponse(err);
    }
  },
});
