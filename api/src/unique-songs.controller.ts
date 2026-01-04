import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import type { UpsertUniqueSongDto, UniqueSong } from './unique-songs.service';
import { UniqueSongsService } from './unique-songs.service';

@Controller('unique-songs')
@UseGuards(JwtAuthGuard)
export class UniqueSongsController {
  constructor(private readonly uniqueSongsService: UniqueSongsService) {}

  @Get()
  async list(): Promise<UniqueSong[]> {
    return this.uniqueSongsService.list();
  }

  @Post()
  async create(@Body() body: UpsertUniqueSongDto): Promise<UniqueSong> {
    this.validate(body);
    return this.uniqueSongsService.upsert({
      title: body.title,
      author: body.author,
      aliases: body.aliases ?? [],
      notes: body.notes ?? ''
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpsertUniqueSongDto): Promise<UniqueSong> {
    this.validate(body);
    return this.uniqueSongsService.upsert({
      id,
      title: body.title,
      author: body.author,
      aliases: body.aliases ?? [],
      notes: body.notes ?? ''
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.uniqueSongsService.remove(id);
  }

  private validate(body: UpsertUniqueSongDto): void {
    if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
      throw new BadRequestException('title is required');
    }
    if (!body?.author || typeof body.author !== 'string' || !body.author.trim()) {
      throw new BadRequestException('author is required');
    }
    if (body.aliases && !Array.isArray(body.aliases)) {
      throw new BadRequestException('aliases must be an array of strings');
    }
  }
}
