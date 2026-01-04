#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.TABLE_CONN;
if (!connectionString) {
  console.error('TABLE_CONN env var is required (storage connection string).');
  process.exit(1);
}

const tableName = process.env.TABLE_NAME || 'Songs';
const jsonPath = resolve(__dirname, '../ui/src/assets/CBBChurch_Songs.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));

const toIso = (dateStr) => new Date(dateStr).toISOString().slice(0, 10);

for (const entry of data) {
  const isoDate = toIso(entry.date);
  const partitionKey = isoDate.slice(0, 7); // YYYY-MM
  const rowKey = isoDate;
  const songsCsv = entry.songs.join(' | ');
  execFileSync(
    'az',
    [
      'storage',
      'entity',
      'insert',
      '--connection-string',
      connectionString,
      '--table-name',
      tableName,
      '--if-exists',
      'replace',
      '--entity',
      `PartitionKey=${partitionKey}`,
      `RowKey=${rowKey}`,
      `date=${isoDate}`,
      `songs=${songsCsv}`
    ],
    { stdio: 'inherit' }
  );
}

console.log(`Seeded ${data.length} entries into table ${tableName}.`);
