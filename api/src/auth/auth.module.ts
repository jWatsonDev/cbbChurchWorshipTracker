import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { AuthController } from './auth.controller';

const jwtSecret = process.env.JWT_SECRET || 'change-me-in-prod';
const defaultExpiresIn: JwtSignOptions['expiresIn'] = '15m';
const jwtExpiresIn: JwtSignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as JwtSignOptions['expiresIn']) ?? defaultExpiresIn;

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: jwtExpiresIn }
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
