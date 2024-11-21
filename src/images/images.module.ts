import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModuleLocal } from 'src/cache/cache.module';

@Module({
  imports: [HttpModule, CacheModuleLocal],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
