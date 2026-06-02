import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true captures the unparsed body buffer (req.rawBody) needed to
  // verify the Meta WhatsApp X-Hub-Signature-256 HMAC.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableShutdownHooks();

  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // allow same-origin / curl / mobile
      if (!origin) return cb(null, true);
      // in dev (no CORS_ORIGINS set) allow everything
      if (allowed.length === 0) return cb(null, true);
      // allow exact match
      if (allowed.includes(origin)) return cb(null, true);
      // allow any *.vercel.app preview deploys
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      return cb(new Error('CORS blocked: ' + origin), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const cfg = new DocumentBuilder()
      .setTitle('EduFlow API')
      .setDescription('Multi-tenant school management')
      .setVersion('0.1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('/docs', app, SwaggerModule.createDocument(app, cfg));
  }

  const port = Number(process.env.PORT) || 4001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`EduFlow API on http://localhost:${port}`);
}
bootstrap();
