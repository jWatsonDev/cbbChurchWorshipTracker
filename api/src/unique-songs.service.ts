import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'crypto';

export interface UniqueSong {
  id: string;
  title: string;
  author: string;
  aliases: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertUniqueSongDto {
  id?: string;
  title: string;
  author: string;
  aliases?: string[];
  notes?: string;
}

@Injectable()
export class UniqueSongsService {
  private readonly logger = new Logger(UniqueSongsService.name);
  private client?: TableClient;
  private readonly tableName = process.env.UNIQUE_SONGS_TABLE ?? 'UniqueSongs';
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

  private mapEntity(entity: Record<string, any>): UniqueSong {
    const aliasesRaw = (entity.aliases as string | undefined) ?? '';
    const aliases = aliasesRaw
      .split('|')
      .map((a) => a.trim())
      .filter(Boolean);

    return {
      id: entity.rowKey ?? '',
      title: (entity.title as string) ?? '',
      author: (entity.author as string) ?? '',
      aliases,
      notes: (entity.notes as string) ?? '',
      createdAt: (entity.createdAt as string) ?? undefined,
      updatedAt: (entity.updatedAt as string) ?? undefined
    };
  }

  async list(): Promise<UniqueSong[]> {
    try {
      const client = this.getClient();
      await client.createTable();
      const results: UniqueSong[] = [];

      for await (const entity of client.listEntities<Record<string, any>>()) {
        if ((entity.partitionKey ?? '') !== 'song') continue;
        results.push(this.mapEntity(entity));
      }

      return results.sort((a, b) => a.title.localeCompare(b.title));
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to list unique songs: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to list unique songs: ' + error.message);
    }
  }

  async upsert(dto: UpsertUniqueSongDto): Promise<UniqueSong> {
    const client = this.getClient();
    await client.createTable();

    const id = dto.id?.trim() || randomUUID();
    const now = new Date().toISOString();
    let createdAt = now;

    if (dto.id) {
      try {
        const existing = await client.getEntity<Record<string, any>>('song', dto.id);
        createdAt = (existing.createdAt as string) ?? createdAt;
      } catch (err) {
        // If not found, proceed to create new; other errors bubble
        const error = err as Error & { statusCode?: number };
        if (error.statusCode && error.statusCode !== 404) {
          this.logger.error(`Failed to read unique song: ${error.message}`, error.stack);
          throw new InternalServerErrorException('Failed to save unique song');
        }
      }
    }

    const entity = {
      partitionKey: 'song',
      rowKey: id,
      title: dto.title.trim(),
      author: dto.author.trim(),
      aliases: (dto.aliases ?? []).join('|'),
      notes: dto.notes ?? '',
      createdAt,
      updatedAt: now
    };

    try {
      await client.upsertEntity(entity, 'Replace');
      return this.mapEntity(entity);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to upsert unique song: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to save unique song: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    const client = this.getClient();
    await client.createTable({ onResponse: () => {} }).catch(() => {});
    try {
      await client.deleteEntity('song', id);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) {
        return; // already gone
      }
      this.logger.error(`Failed to delete unique song: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete unique song: ' + error.message);
    }
  }
}
