import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The Supabase User ID',
  })
  @IsUUID()
  @IsNotEmpty()
  supabase_user_id: string;
}