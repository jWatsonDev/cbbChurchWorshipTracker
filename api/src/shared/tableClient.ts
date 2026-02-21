import { TableClient } from '@azure/data-tables';

const clients = new Map<string, TableClient>();

export function getTableClient(tableName: string): TableClient {
  const conn = process.env.TABLE_CONN ?? process.env.STATIC_STORAGE_CONNECTION;
  if (!conn) {
    throw new Error('TABLE_CONN (or STATIC_STORAGE_CONNECTION) is not set');
  }
  if (!clients.has(tableName)) {
    clients.set(tableName, TableClient.fromConnectionString(conn, tableName));
  }
  return clients.get(tableName)!;
}
