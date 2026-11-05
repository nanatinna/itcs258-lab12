import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'alice',
    type: String,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @ApiProperty({
    description: 'Password (at least 6 characters)',
    example: 'secret123',
    type: String,
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
