import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  assertProductionSecrets();
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('LVM Weightlifting API')
      .setDescription('API da plataforma de gestao de atletas de LPO.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3333);
  await app.listen(port);
}

void bootstrap();

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const unsafeValues = new Set(['change-me-access', 'change-me-refresh', 'lvm', 'admin']);
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  for (const key of required) {
    const value = process.env[key];
    if (!value || unsafeValues.has(value)) {
      throw new Error(`Unsafe or missing production secret: ${key}`);
    }
  }
}
