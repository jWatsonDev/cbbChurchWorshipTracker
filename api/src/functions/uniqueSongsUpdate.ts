import { app, HttpRequest } from '@azure/functions';
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

app.http('uniqueSongsUpdate', {
  methods: ['PUT'],
  route: 'unique-songs/{id}',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const id = request.params.id;
      if (!id?.trim()) {
        return jsonResponse(400, { message: 'id parameter is required' });
      }

      const body = (await request.json()) as Partial<UpsertUniqueSongDto>;
      if (!body?.title?.trim() || !body?.author?.trim()) {
        return jsonResponse(400, { message: 'title and author are required' });
      }
      if (body.aliases !== undefined && !Array.isArray(body.aliases)) {
        return jsonResponse(400, { message: 'aliases must be an array of strings' });
      }

      const client = getTableClient(process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs');
      await client.createTable();

      const now = new Date().toISOString();
      let createdAt = now;

      try {
        const existing = await client.getEntity<Record<string, unknown>>('song', id);
        createdAt = (existing.createdAt as string) ?? createdAt;
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode && statusCode !== 404) {
          throw e;
        }
      }

      const entity = {
        partitionKey: 'song',
        rowKey: id,
        title: body.title.trim(),
        author: body.author.trim(),
        aliases: (body.aliases ?? []).join('|'),
        notes: body.notes ?? '',
        createdAt,
        updatedAt: now,
      };

      await client.upsertEntity(entity, 'Replace');
      return jsonResponse(200, mapEntity(entity));
    } catch (err) {
      return errorResponse(err);
    }
  },
});
