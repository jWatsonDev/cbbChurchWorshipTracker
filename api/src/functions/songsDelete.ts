import { app, HttpRequest } from '@azure/functions';
import { verifyAuth } from '../shared/auth.js';
import { getTableClient } from '../shared/tableClient.js';
import { jsonResponse, errorResponse } from '../shared/httpHelpers.js';

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

app.http('songsDelete', {
  methods: ['DELETE'],
  route: 'songs/{date}',
  authLevel: 'anonymous',
  handler: async (request: HttpRequest) => {
    try {
      verifyAuth(request);

      const date = request.params.date;
      if (!date?.trim()) {
        return jsonResponse(400, { message: 'date parameter is required' });
      }

      const client = getTableClient(process.env.TABLE_NAME ?? 'Songs');
      await client.createTable();

      const rowKey = date.trim();
      const existing = await findPartitionForRowKey(client, rowKey);
      if (!existing) {
        return jsonResponse(204, null);
      }

      try {
        await client.deleteEntity(existing.partitionKey, rowKey, { etag: '*' });
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
