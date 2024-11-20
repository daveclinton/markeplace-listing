import { Injectable, ConflictException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.logger.debug('UsersService initialized');
  }

  async createUser(supabase_user_id: string): Promise<User> {
    this.logger.debug(
      `Attempting to create user with Supabase ID: ${supabase_user_id}`,
    );

    try {
      const user = this.userRepository.create({ supabase_user_id });
      const savedUser = await this.userRepository.save(user);

      this.logger.log(
        `User created successfully with ID: ${savedUser.id}, Supabase ID: ${supabase_user_id}`,
      );
      return savedUser;
    } catch (error) {
      if (error.code === '23505') {
        this.logger.warn(
          `Attempted to create duplicate user with Supabase ID but failed: ${supabase_user_id}`,
          error.stack,
        );
        throw new ConflictException('User already exists');
      }

      this.logger.error(
        `Failed to create user with Supabase ID: ${supabase_user_id}`,
        {
          error: error.message,
          stack: error.stack,
          context: UsersService.name,
        },
      );
      throw error;
    }
  }
}
