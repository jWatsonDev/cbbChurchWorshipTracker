import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { UpdateSongDto } from '../shared/types.js';

function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}

async function findPartitionForRowKey(
  client: ReturnType<typeof getTableClient>,
  rowKey: string,
): Promise<{ partitionKey: string; rowKey: string } | null> {
  const filter = `RowKey eq '${escapeFilterValue(rowKey)}'`;
  for await (const entity of client.listEntities({ queryOptions: { filter } })) {
    return {
      partitionKey: entity.partitionKey ?? 'song',
      rowKey: entity.rowKey ?? rowKey,
    };
  }
  return null;
}

app.http('songsUpdate', {
  methods: ['PUT'],
  route: 'songs/{date}',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const date = request.params.date;
      if (!date?.trim()) {
        return jsonResponse(400, { message: 'date parameter is required' });
      }

      const body = (await request.json()) as Partial<UpdateSongDto>;
      if (!Array.isArray(body.songs) || body.songs.length === 0) {
        return jsonResponse(400, { message: 'songs (non-empty array) is required' });
      }

      const client = getTableClient(process.env.TABLE_NAME ?? 'Songs');
      await client.createTable();

      const rowKey = date.trim();
      const existing = await findPartitionForRowKey(client, rowKey);
      const partitionKey = existing?.partitionKey ?? 'song';

      const cleanSongs = body.songs.map((s) => s.trim()).filter(Boolean);
      const songsText = cleanSongs.join('|');

      const entity = { partitionKey, rowKey, date: body.date ?? date, songs: songsText };
      await client.upsertEntity(entity, 'Replace');

      return jsonResponse(200, {
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
