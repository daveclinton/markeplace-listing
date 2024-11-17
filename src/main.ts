import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptot';
import { WinstonModule } from 'nest-winston';
import { instance } from './common/logger/winston.logger';

declare const module: any;

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: instance }),
  });

  const allowedOrigins = [
    'http://localhost:8000',
    'http://localhost:3000',
    'https://markeplace-listing.onrender.com',
    'https://www.facebook.com',
    'https://facebook.com',
    'https://auth.ebay.com',
    'https://www.ebay.com',
    'https://api.ebay.com',
    'com.snaplist://auth/accept',
    'https://8acd-41-212-41-122.ngrok-free.app',
  ];

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, 'https:', 'data:', 'com.snaplist:'],
          connectSrc: [`'self'`, 'https:', 'com.snaplist:'],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          frameSrc: [`'self'`, 'https:', 'com.snaplist:'],
          formAction: [`'self'`, 'https:', 'com.snaplist:'],
        },
      },
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    }),
  );

  app.use(compression());

  app.use((req, res, next) => {
    logger.debug(`Request from origin: ${req.headers.origin}`);
    next();
  });

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('com.snaplist://')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Origin',
    ],
    exposedHeaders: ['Access-Control-Allow-Origin'],
    credentials: true,
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('com.snaplist://')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new TimeoutInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Snaplist Marketplace')
    .setDescription('List items to marketplace')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('marketplace')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 8000;

  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/docs`,
  );

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error('Failed to start application:', error);
});
