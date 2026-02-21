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

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

export interface RefreshPayload {
  sub: string;
  username: string;
  type: 'refresh';
}
