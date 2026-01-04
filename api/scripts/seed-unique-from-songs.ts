import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'crypto';

async function main() {
  const connection = process.env.TABLE_CONN ?? process.env.STATIC_STORAGE_CONNECTION;
  const songsTable = process.env.TABLE_NAME ?? 'Songs';
  const uniqueTable = process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs';

  if (!connection) {
    console.error('TABLE_CONN (or STATIC_STORAGE_CONNECTION) is not set');
    process.exit(1);
  }

  const songsClient = TableClient.fromConnectionString(connection, songsTable);
  const uniqueClient = TableClient.fromConnectionString(connection, uniqueTable);

  await songsClient.createTable({ onResponse: () => {} }).catch(() => {});
  await uniqueClient.createTable({ onResponse: () => {} }).catch(() => {});

  // Load existing unique titles to avoid duplicates (case-insensitive)
  const existing = new Map<string, string>(); // lowerTitle -> rowKey
  for await (const entity of uniqueClient.listEntities<Record<string, any>>()) {
    if ((entity.partitionKey ?? '') !== 'song') continue;
    const title = (entity.title as string | undefined)?.trim();
    if (!title) continue;
    existing.set(title.toLowerCase(), entity.rowKey ?? '');
  }

  const toInsert: Array<{ partitionKey: string; rowKey: string; title: string; author: string; aliases: string; notes: string; createdAt: string; updatedAt: string }> = [];
  const seen = new Set<string>();

  for await (const entity of songsClient.listEntities<Record<string, any>>()) {
    const raw = entity.songs as string | undefined;
    if (!raw) continue;
    const entries = raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const title of entries) {
      const key = title.toLowerCase();
      if (existing.has(key) || seen.has(key)) continue;
      seen.add(key);
      const now = new Date().toISOString();
      toInsert.push({
        partitionKey: 'song',
        rowKey: randomUUID(),
        title,
        author: '',
        aliases: '',
        notes: '',
        createdAt: now,
        updatedAt: now
      });
    }
  }

  if (toInsert.length === 0) {
    console.log('No new unique songs to add.');
    return;
  }

  for (const entity of toInsert) {
    await uniqueClient.upsertEntity(entity, 'Replace');
  }

  console.log(`Inserted ${toInsert.length} unique songs into '${uniqueTable}'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
