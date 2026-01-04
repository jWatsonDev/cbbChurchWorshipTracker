import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: { user?: { username: string; role?: string } }, @Body() _body: LoginDto) {
    if (!req.user) {
      // Should not happen because LocalAuthGuard throws on failure
      throw new Error('Authentication failed');
    }
    return this.authService.login(req.user);
  }
}
