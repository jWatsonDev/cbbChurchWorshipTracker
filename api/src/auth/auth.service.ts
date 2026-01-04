import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TableClient } from '@azure/data-tables';
import * as bcrypt from 'bcryptjs';

export interface UserEntity {
  partitionKey: string;
  rowKey: string;
  passwordHash: string;
  role?: string;
}

export interface AuthUser {
  username: string;
  role?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private client?: TableClient;
  private readonly tableName = process.env.USERS_TABLE_NAME ?? 'Users';
  private readonly connection = process.env.TABLE_CONN ?? process.env.STATIC_STORAGE_CONNECTION;

  constructor(private readonly jwtService: JwtService) {}

  private getClient(): TableClient {
    if (!this.connection) {
      throw new InternalServerErrorException('TABLE_CONN (or STATIC_STORAGE_CONNECTION) is not set');
    }

    if (!this.client) {
      this.client = TableClient.fromConnectionString(this.connection, this.tableName);
    }

    return this.client;
  }

  private async findByUsername(username: string): Promise<UserEntity | undefined> {
    const client = this.getClient();
    await client.createTable();
    try {
      const entity = await client.getEntity<Record<string, unknown>>('user', username);
      const passwordHash = (entity.passwordHash as string) ?? '';
      const role = (entity.role as string) ?? undefined;
      return {
        partitionKey: entity.partitionKey ?? 'user',
        rowKey: entity.rowKey ?? username,
        passwordHash,
        role
      };
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) {
        return undefined;
      }
      this.logger.error(`Failed to fetch user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to read user store');
    }
  }

  async validateUser(username: string, password: string): Promise<AuthUser> {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return { username, role: user.role };
    } catch (error) {
      this.logger.error(`validateUser error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async login(user: AuthUser): Promise<{ accessToken: string; username: string; role?: string }> {
    const payload = { sub: user.username, username: user.username, role: user.role ?? 'user' };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, username: user.username, role: user.role };
  }
}
