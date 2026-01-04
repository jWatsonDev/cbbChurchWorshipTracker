import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UniqueSongsComponent } from './unique-songs/unique-songs.component';
import { SongsTableComponent } from './songs-table/songs-table.component';

export const routes: Routes = [
	{ path: '', component: DashboardComponent },
	{ path: 'song-history', component: SongsTableComponent },
	{ path: 'unique-songs', component: UniqueSongsComponent }
];
