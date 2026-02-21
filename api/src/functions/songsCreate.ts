import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { CreateSongDto } from '../shared/types.js';

app.http('songsCreate', {
  methods: ['POST'],
  route: 'songs',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const body = (await request.json()) as Partial<CreateSongDto>;
      if (!body?.date?.trim() || !Array.isArray(body.songs) || body.songs.length === 0) {
        return jsonResponse(400, { message: 'date (string) and songs (non-empty array) are required' });
      }

      const client = getTableClient(process.env.TABLE_NAME ?? 'Songs');
      await client.createTable();

      const rowKey = body.date.trim();
      const cleanSongs = body.songs.map((s) => s.trim()).filter(Boolean);
      const songsText = cleanSongs.join('|');

      const entity = { partitionKey: 'song', rowKey, date: body.date, songs: songsText };
      await client.upsertEntity(entity, 'Replace');

      return jsonResponse(201, {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        date: entity.date,
        songs: cleanSongs,
      });
    } catch (err) {
      return errorResponse(err);
    }
  },
});
