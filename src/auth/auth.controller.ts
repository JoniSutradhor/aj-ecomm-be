import { Body, Controller, Get, Post } from '@nestjs/common';
import { toPublicUser, User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Public()
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.auth.login(dto);
    }

    @Public()
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto);
    }

    /** Matches the front end `getAuthData` call. */
    @Get('session')
    session(@CurrentUser() user: User) {
        return { user: toPublicUser(user) };
    }
}
