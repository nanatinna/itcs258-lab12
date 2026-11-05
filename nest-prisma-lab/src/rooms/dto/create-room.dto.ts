/*
AI Declaration:
I used Claude to help me add @ApiProperty / @ApiPropertyOptional decorators to the Room DTOs.
I reviewed every part and I understand the entire implementation.

Reflection:
I learned that class-validator rules and Swagger docs are separate: the validators protect the
API, while @ApiProperty tells readers the type, limits and an example for each field.
*/

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Room name',
    example: 'Deluxe Ocean View',
    type: String,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Details about the room',
    example: 'King-size bed, balcony with sea view, free Wi-Fi',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Maximum number of guests',
    example: 2,
    type: Number,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: 'Price per night (THB), up to 2 decimal places',
    example: 2500.5,
    type: Number,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price_per_night: number;

  @ApiPropertyOptional({
    description: 'URL of a room photo',
    example: 'https://example.com/images/deluxe-ocean.jpg',
    type: String,
    format: 'uri',
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Whether the room can be booked',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
