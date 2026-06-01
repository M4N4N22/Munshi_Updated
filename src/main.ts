import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/api/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { LoggerInterceptor } from './core/services/logger/logger.interceptor';
import { LoggerService } from './core/services/logger/logger.service';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

function ensureDatabaseMigrations() {
  if (process.env.SKIP_MIGRATION_BOOTSTRAP === '1') {
    return;
  }

  const logger = new Logger('Migrations');
  const script = join(process.cwd(), 'scripts', 'migration-bootstrap.mjs');

  if (!existsSync(script)) {
    logger.error(`Migration bootstrap script not found: ${script}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  if (result.stdout?.trim()) {
    logger.log(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    logger.error(result.stderr.trim());
  }

  if (result.status !== 0) {
    logger.error('Migration bootstrap failed');
    process.exit(result.status ?? 1);
  }
}

async function bootstrap() {
  const logger = new Logger('App');
  ensureDatabaseMigrations();
  const port = process.env.PORT ?? 3000;
  const app = await NestFactory.create(AppModule);
  const loggerService = app.get(LoggerService);
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : true,
    credentials: true,
  });
  // app.setGlobalPrefix('db');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  app.useGlobalInterceptors(new LoggerInterceptor(loggerService));
  const config = new DocumentBuilder()
    .setTitle('Db service')
    .setDescription('The API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}
bootstrap();
