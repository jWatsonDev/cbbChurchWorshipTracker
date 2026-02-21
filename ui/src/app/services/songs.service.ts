import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SongEntry {
  date: string;
  songs: string[];
}

export interface CreateSundayPayload {
  date: string;
  songs: string[];
}

export interface SongCount {
  song: string;
  plays: number;
}

export interface SongGap {
  song: string;
  daysSince: number;
  lastPlayed: string;
}

export interface MonthCount {
  month: string; // YYYY-MM
  plays: number;
}

export interface ChartsData {
  topPlayed: SongCount[];
  leastPlayed: SongCount[];
  daysSinceLastPlayed: SongGap[];
  monthlyPlays: MonthCount[];
}

@Injectable({ providedIn: 'root' })
export class SongsService {
  private readonly dataUrl = `${environment.apiUrl}/songs`;

  constructor(private readonly http: HttpClient) {}

  getSongs(): Observable<SongEntry[]> {
    return this.http.get<any[]>(this.dataUrl).pipe(
      map((entries) =>
        entries.map((entry) => {
          const date = (entry.date ?? entry.rowKey ?? '').toString().trim();
          const songs = Array.isArray(entry.songs)
            ? entry.songs
            : typeof entry.songs === 'string'
              ? entry.songs.split('|')
              : [];

          return {
            date,
            songs: songs.map((s: string) => s.trim()).filter(Boolean)
          } as SongEntry;
        })
      )
    );
  }

  getChartsData(): Observable<ChartsData> {
    return this.getSongs().pipe(
      map((entries) => buildCharts(entries))
    );
  }

  createSunday(payload: CreateSundayPayload): Observable<SongEntry> {
    return this.http.post<any>(this.dataUrl.replace('/songs', '/songs'), payload).pipe(
      map((entry) => {
        const date = (entry.date ?? entry.rowKey ?? '').toString().trim();
        const songs = Array.isArray(entry.songs)
          ? entry.songs
          : typeof entry.songs === 'string'
            ? entry.songs.split('|')
            : [];

        return {
          date,
          songs: songs.map((s: string) => s.trim()).filter(Boolean)
        } as SongEntry;
      })
    );
  }

  updateSunday(date: string, songs: string[], newDate?: string): Observable<SongEntry> {
    const url = `${this.dataUrl}/${encodeURIComponent(date)}`;
    return this.http.put<any>(url, { songs, date: newDate ?? date }).pipe(
      map((entry) => {
        const parsedDate = (entry.date ?? entry.rowKey ?? '').toString().trim();
        const parsedSongs = Array.isArray(entry.songs)
          ? entry.songs
          : typeof entry.songs === 'string'
            ? entry.songs.split('|')
            : [];

        return {
          date: parsedDate,
          songs: parsedSongs.map((s: string) => s.trim()).filter(Boolean)
        } as SongEntry;
      })
    );
  }

  deleteSunday(date: string): Observable<void> {
    const url = `${this.dataUrl}/${encodeURIComponent(date)}`;
    return this.http.delete<void>(url);
  }
}

function buildCharts(entries: SongEntry[]): ChartsData {
  const counts = new Map<string, number>();
  const lastPlayed = new Map<string, number>(); // epoch ms
  const monthly = new Map<string, number>(); // YYYY-MM -> plays
  const displayNames = new Map<string, string>(); // lowercase -> most recent casing

  for (const entry of entries) {
    const playedDate = parseDate(entry.date);
    const monthKey = formatMonth(playedDate);
    monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + entry.songs.length);

    for (const song of entry.songs) {
      const key = song.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const ts = playedDate.getTime();
      const prev = lastPlayed.get(key) ?? 0;
      if (ts > prev) {
        lastPlayed.set(key, ts);
        displayNames.set(key, song);
      } else if (!displayNames.has(key)) {
        displayNames.set(key, song);
      }
    }
  }

  const sortedCounts = [...counts.entries()]
    .map(([key, plays]) => ({ song: displayNames.get(key) ?? key, plays }))
    .sort((a, b) => b.plays - a.plays || a.song.localeCompare(b.song));

  const now = Date.now();
  const gaps: SongGap[] = [...lastPlayed.entries()].map(([key, ts]) => ({
    song: displayNames.get(key) ?? key,
    lastPlayed: new Date(ts).toISOString(),
    daysSince: Math.round((now - ts) / 86_400_000)
  })).sort((a, b) => b.daysSince - a.daysSince || a.song.localeCompare(b.song));

  const monthlyPlays: MonthCount[] = [...monthly.entries()]
    .map(([month, plays]) => ({ month, plays }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const topPlayed = sortedCounts.slice(0, 25);
  const leastPlayed = sortedCounts.slice(-25).reverse();
  const daysSinceLastPlayed = gaps.slice(0, 25);

  return { topPlayed, leastPlayed, daysSinceLastPlayed, monthlyPlays };
}

function parseDate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return new Date();
  }
  return d;
}

function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}
