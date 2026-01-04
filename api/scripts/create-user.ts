import { TableClient } from '@azure/data-tables';
import * as bcrypt from 'bcryptjs';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const username = getArg('--username');
  const password = getArg('--password');
  const role = getArg('--role');

  if (!username || !password) {
    console.error('Usage: ts-node scripts/create-user.ts --username <name> --password <pass> [--role <role>]');
    process.exit(1);
  }

  const connection = process.env.TABLE_CONN ?? process.env.STATIC_STORAGE_CONNECTION;
  const tableName = process.env.USERS_TABLE_NAME ?? 'Users';
  if (!connection) {
    console.error('TABLE_CONN (or STATIC_STORAGE_CONNECTION) is not set');
    process.exit(1);
  }

  const client = TableClient.fromConnectionString(connection, tableName);
  await client.createTable();

  const passwordHash = await bcrypt.hash(password, 10);
  await client.upsertEntity({
    partitionKey: 'user',
    rowKey: username,
    passwordHash,
    role: role ?? 'user'
  });

  console.log(`User '${username}' created/updated in table '${tableName}'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
