import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService<AppConfig, true>);

    app.setGlobalPrefix('api');
    app.enableCors({ origin: config.get('corsOrigin', { infer: true }) });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    await app.listen(config.get('port', { infer: true }));
}
void bootstrap();
