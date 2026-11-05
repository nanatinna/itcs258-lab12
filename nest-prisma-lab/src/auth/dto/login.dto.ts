import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Username', example: 'admin', type: String })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password', example: 'secret123', type: String })
  @IsString()
  @IsNotEmpty()
  password: string;
}
