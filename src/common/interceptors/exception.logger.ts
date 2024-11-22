import { ValidationPipe, Injectable, ArgumentMetadata } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';

@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  }

  public createExceptionFactory() {
    return (validationErrors = []) => {
      const errors = validationErrors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
        value: error.value,
      }));

      this.logger.error('Validation Error', { errors });

      return super.createExceptionFactory()(validationErrors);
    };
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // Use `log` instead of `info`
    this.logger.log(
      'info', // Winston log level
      `Validation successful for ${metadata.type}`,
      {
        payload: value,
        type: metadata.type,
        metatype: metadata.metatype?.name || 'Unknown',
      },
    );

    return super.transform(value, metadata);
  }
}
