import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TableClient } from '@azure/data-tables';

export interface SongRecord {
  partitionKey: string;
  rowKey: string;
  date: string;
  songs: string[];
}

export interface CreateSongDto {
  date: string;
  songs: string[];
}

export interface UpdateSongDto {
  songs: string[];
  date?: string;
}

function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);
  private client?: TableClient;
  private readonly tableName = process.env.TABLE_NAME ?? 'Songs';
  private readonly connection = process.env.TABLE_CONN ?? process.env.STATIC_STORAGE_CONNECTION;

  private getClient(): TableClient {
    if (!this.connection) {
      throw new InternalServerErrorException('TABLE_CONN (or STATIC_STORAGE_CONNECTION) is not set');
    }

    if (!this.client) {
      this.client = TableClient.fromConnectionString(this.connection, this.tableName);
    }

    return this.client;
  }

  async list(): Promise<SongRecord[]> {
    try {
      const client = this.getClient();
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

        rows.push({
          partitionKey,
          rowKey,
          date: entity.date ?? rowKey,
          songs
        });
      }

      return rows.sort((a, b) => b.rowKey.localeCompare(a.rowKey));
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to list songs from table: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to read table storage: ' + error.message);
    }
  }

  async create(dto: CreateSongDto): Promise<SongRecord> {
    const client = this.getClient();
    await client.createTable();

    const rowKey = dto.date.trim();
    const songsText = (dto.songs ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .join('|');

    const entity = {
      partitionKey: 'song',
      rowKey,
      date: dto.date,
      songs: songsText
    };

    try {
      await client.upsertEntity(entity, 'Replace');
      return {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        date: entity.date,
        songs: dto.songs.map((s) => s.trim()).filter(Boolean)
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to create song entry: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create song entry: ' + error.message);
    }
  }

  async update(date: string, dto: UpdateSongDto): Promise<SongRecord> {
    const client = this.getClient();
    await client.createTable();

    const rowKey = date.trim();
    const existing = await this.findPartitionForRowKey(client, rowKey);
    const partitionKey = existing?.partitionKey ?? 'song';

    const songsText = (dto.songs ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .join('|');

    const entity = {
      partitionKey,
      rowKey,
      date: dto.date ?? date,
      songs: songsText
    };

    try {
      await client.upsertEntity(entity, 'Replace');
      return {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        date: entity.date,
        songs: (dto.songs ?? []).map((s) => s.trim()).filter(Boolean)
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to update song entry: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update song entry: ' + error.message);
    }
  }

  async remove(date: string): Promise<void> {
    const client = this.getClient();
    await client.createTable();

    const rowKey = date.trim();
    const existing = await this.findPartitionForRowKey(client, rowKey);
    if (!existing) {
      return; // already gone
    }

    try {
      await client.deleteEntity(existing.partitionKey, rowKey, { etag: '*' });
    } catch (err) {
      const error = err as Error;
      const status = (error as any)?.statusCode;
      if (status === 404) {
        return; // already gone
      }
      this.logger.error(`Failed to delete song entry for ${date}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete song entry: ' + error.message);
    }
  }

  private async findPartitionForRowKey(client: TableClient, rowKey: string): Promise<{ partitionKey: string; rowKey: string } | null> {
    // Query by RowKey to find the actual partition key before delete/update
    const filter = `RowKey eq '${escapeFilterValue(rowKey)}'`;
    for await (const entity of client.listEntities({ queryOptions: { filter } })) {
      return {
        partitionKey: entity.partitionKey ?? 'song',
        rowKey: entity.rowKey ?? rowKey
      };
    }
    return null;
  }
}
