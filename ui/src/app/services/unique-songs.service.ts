import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UniqueSong {
  id: string;
  title: string;
  author: string;
  aliases: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveUniqueSong {
  id?: string;
  title: string;
  author: string;
  aliases?: string[];
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class UniqueSongsService {
  private readonly baseUrl = `${environment.apiUrl}/unique-songs`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<UniqueSong[]> {
    return this.http.get<UniqueSong[]>(this.baseUrl);
  }

  save(payload: SaveUniqueSong): Observable<UniqueSong> {
    if (payload.id) {
      return this.http.put<UniqueSong>(`${this.baseUrl}/${payload.id}`, payload);
    }
    return this.http.post<UniqueSong>(this.baseUrl, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
