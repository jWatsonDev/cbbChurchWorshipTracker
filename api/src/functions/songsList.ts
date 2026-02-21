import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { SongRecord } from '../shared/types.js';

app.http('songsList', {
  methods: ['GET'],
  route: 'songs',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const client = getTableClient(process.env.TABLE_NAME ?? 'Songs');
      await client.createTable();

      const rows: SongRecord[] = [];
      for await (const entity of client.listEntities<{ date?: string; songs?: string }>()) {
        const partitionKey = entity.partitionKey ?? '';
        const rowKey = entity.rowKey ?? '';
        const songsText = typeof entity.songs === 'string' ? entity.songs : '';
        const songs = songsText
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);

        rows.push({ partitionKey, rowKey, date: entity.date ?? rowKey, songs });
      }

      rows.sort((a, b) => b.rowKey.localeCompare(a.rowKey));
      return jsonResponse(200, rows);
    } catch (err) {
      return errorResponse(err);
    }
  },
});
