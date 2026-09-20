import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CategoriesModule } from './categories/categories.module';
import { AppConfig, configuration } from './config/configuration';
import { HealthController } from './health/health.controller';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService<AppConfig, true>) => {
                const db = config.get('db', { infer: true });
                return {
                    type: 'postgres' as const,
                    host: db.host,
                    port: db.port,
                    username: db.username,
                    password: db.password,
                    database: db.name,
                    synchronize: db.synchronize,
                    autoLoadEntities: true,
                };
            },
        }),
        UsersModule,
        AuthModule,
        CategoriesModule,
        StockModule,
        ProductsModule,
    ],
    controllers: [HealthController],
    providers: [
        // Order matters: authenticate first, then check roles
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
export class AppModule {}
