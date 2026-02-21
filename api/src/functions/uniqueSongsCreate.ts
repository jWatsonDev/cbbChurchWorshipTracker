import { app, HttpRequest } from '@azure/functions';
import { randomUUID } from 'crypto';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';
import { UpsertUniqueSongDto, UniqueSong } from '../shared/types.js';

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

app.http('uniqueSongsCreate', {
  methods: ['POST'],
  route: 'unique-songs',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const body = (await request.json()) as Partial<UpsertUniqueSongDto>;
      if (!body?.title?.trim() || !body?.author?.trim()) {
        return jsonResponse(400, { message: 'title and author are required' });
      }
      if (body.aliases !== undefined && !Array.isArray(body.aliases)) {
        return jsonResponse(400, { message: 'aliases must be an array of strings' });
      }

      const client = getTableClient(process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs');
      await client.createTable();

      const id = randomUUID();
      const now = new Date().toISOString();

      const entity = {
        partitionKey: 'song',
        rowKey: id,
        title: body.title.trim(),
        author: body.author.trim(),
        aliases: (body.aliases ?? []).join('|'),
        notes: body.notes ?? '',
        createdAt: now,
        updatedAt: now,
      };

      await client.upsertEntity(entity, 'Replace');
      return jsonResponse(201, mapEntity(entity));
    } catch (err) {
      return errorResponse(err);
    }
  },
});
