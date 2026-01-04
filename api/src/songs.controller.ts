import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SongRecord, SongsService } from './songs.service';
import type { CreateSongDto, UpdateSongDto } from './songs.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  async getSongs(): Promise<SongRecord[]> {
    return this.songsService.list();
  }

  @Post()
  async createSong(@Body() body: CreateSongDto): Promise<SongRecord> {
    if (!body?.date || !body.date.trim()) {
      throw new Error('date is required');
    }
    if (!Array.isArray(body?.songs) || body.songs.length === 0) {
      throw new Error('songs is required');
    }
    return this.songsService.create({ date: body.date, songs: body.songs });
  }

  @Put(':date')
  async updateSong(@Param('date') date: string, @Body() body: UpdateSongDto): Promise<SongRecord> {
    if (!date || !date.trim()) {
      throw new Error('date is required');
    }
    if (!Array.isArray(body?.songs) || body.songs.length === 0) {
      throw new Error('songs is required');
    }
    return this.songsService.update(date, { songs: body.songs, date: body.date ?? date });
  }

  @Delete(':date')
  async deleteSong(@Param('date') date: string): Promise<void> {
    if (!date || !date.trim()) {
      throw new Error('date is required');
    }
    return this.songsService.remove(date);
  }
}
