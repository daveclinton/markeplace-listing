import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { ValidationPipe, Logger, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptot';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpService } from '@nestjs/axios';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useLogger(logger);

  logger.log('Application starting...', 'Bootstrap');

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3000',
    'https://markeplace-listing.onrender.com',
    'https://www.facebook.com',
    'https://facebook.com',
    'https://auth.ebay.com',
    'https://www.ebay.com',
    'https://api.ebay.com',
    'com.snaplist://auth/accept',
    'https://8831-41-212-41-122.ngrok-free.app',
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
    let origin = 'Unknown';

    if (req.headers.origin) {
      origin = req.headers.origin;
    } else if (req.get('host')) {
      origin = req.get('host');
    } else if (req.ip) {
      origin = req.ip;
    }

    logger.debug(`Request from origin: ${origin}`);
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

  const httpService = new HttpService();

  httpService.axiosRef.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // eslint-disable-next-line
      if (error.response.status === HttpStatus.NOT_MODIFIED) return error;
    },
  );

  app.useGlobalPipes(new ValidationPipe());

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

  const port = process.env.PORT ?? 3000;

  try {
    await app.listen(port);
    logger.log(
      `Application running on port http://localhost:${port}`,
      'Bootstrap',
    );
    logger.log(
      `Swagger documentation available at: http://localhost:${port}/docs`,
    );
  } catch (error) {
    logger.error(
      `Failed to start application: ${error.message}`,
      error.stack,
      'Bootstrap',
    );
  }

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error('Failed to start application:', error);
});
