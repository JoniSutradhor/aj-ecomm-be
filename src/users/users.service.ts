import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { rethrowConflict } from '../common/db-errors';
import { AppConfig } from '../config/configuration';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService implements OnApplicationBootstrap {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User) private readonly users: Repository<User>,
        private readonly config: ConfigService<AppConfig, true>
    ) {}

    /** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when none exists. */
    async onApplicationBootstrap() {
        const { email, password } = this.config.get('admin', { infer: true });
        if (!email || !password) return;
        if (await this.users.exists({ where: { role: UserRole.ADMIN } })) return;

        await this.create({
            email,
            password,
            fname: 'Admin',
            lname: 'User',
            role: UserRole.ADMIN,
        });
        this.logger.log(`Created initial admin account ${email}`);
    }

    findById(id: number) {
        return this.users.findOne({ where: { id } });
    }

    /** Includes the password hash, only use for credential checks. */
    findByEmailWithPassword(email: string) {
        return this.users
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('LOWER(user.email) = LOWER(:email)', { email })
            .getOne();
    }

    async create(data: {
        email: string;
        password: string;
        fname: string;
        lname: string;
        role?: UserRole;
    }) {
        const { password, ...rest } = data;
        const user = this.users.create({
            ...rest,
            email: rest.email.toLowerCase(),
            passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        });
        try {
            return await this.users.save(user);
        } catch (error) {
            return rethrowConflict(error, {
                unique: 'An account with this email already exists',
            });
        }
    }

    verifyPassword(user: User, password: string) {
        return bcrypt.compare(password, user.passwordHash);
    }
}
