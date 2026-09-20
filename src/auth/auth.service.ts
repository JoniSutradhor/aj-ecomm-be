import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser, toPublicUser, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResponse {
    user: PublicUser;
    token: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService
    ) {}

    async login({ email, password }: LoginDto): Promise<AuthResponse> {
        const user = await this.users.findByEmailWithPassword(email);
        // Same error for unknown email and wrong password
        if (!user || !(await this.users.verifyPassword(user, password))) {
            throw new UnauthorizedException('Invalid email or password');
        }
        return this.buildResponse(user);
    }

    /** Public sign up always creates a customer, never an admin. */
    async register(dto: RegisterDto): Promise<AuthResponse> {
        const user = await this.users.create(dto);
        return this.buildResponse(user);
    }

    private async buildResponse(user: User): Promise<AuthResponse> {
        return {
            user: toPublicUser(user),
            token: await this.jwt.signAsync({ sub: user.id }),
        };
    }
}
