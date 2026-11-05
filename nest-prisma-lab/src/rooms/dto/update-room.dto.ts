import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

// PartialType from @nestjs/swagger (not mapped-types) keeps the @ApiProperty docs,
// marking every field as optional in Swagger.
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
