import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { AuthModule } from './auth/auth.module';
import { UniqueSongsController } from './unique-songs.controller';
import { UniqueSongsService } from './unique-songs.service';

@Module({
  imports: [AuthModule],
  controllers: [AppController, SongsController, UniqueSongsController],
  providers: [AppService, SongsService, UniqueSongsService]
})
export class AppModule {}
