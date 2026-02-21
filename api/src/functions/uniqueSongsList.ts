import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { UniqueSong } from '../shared/types.js';

function mapEntity(entity: Record<string, unknown>): UniqueSong {
  const aliasesRaw = ((entity.aliases as string) ?? '');
  const aliases = aliasesRaw
    .split('|')
    .map((a) => a.trim())
    .filter(Boolean);

  return {
    id: (entity.rowKey as string) ?? '',
    title: (entity.title as string) ?? '',
    author: (entity.author as string) ?? '',
    aliases,
    notes: (entity.notes as string) ?? '',
    createdAt: (entity.createdAt as string) ?? undefined,
    updatedAt: (entity.updatedAt as string) ?? undefined,
  };
}

app.http('uniqueSongsList', {
  methods: ['GET'],
  route: 'unique-songs',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const client = getTableClient(process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs');
      await client.createTable();

      const results: UniqueSong[] = [];
      for await (const entity of client.listEntities<Record<string, unknown>>()) {
        if ((entity.partitionKey ?? '') !== 'song') continue;
        results.push(mapEntity(entity));
      }

      results.sort((a, b) => a.title.localeCompare(b.title));
      return jsonResponse(200, results);
    } catch (err) {
      return errorResponse(err);
    }
  },
});
