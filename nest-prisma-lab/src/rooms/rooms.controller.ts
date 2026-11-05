/*
AI Declaration:
Lab 9: I used Claude to help me add Swagger decorators (@ApiTags, @ApiBearerAuth, @ApiOperation,
@ApiResponse, @ApiParam, @ApiQuery) to the RoomsController and to add pagination and filters
to GET /rooms. I reviewed every part and I understand the entire implementation.
Lab 10: I used Claude to add a PUT /rooms/:id route, because the Lab 10 tests update rooms with PUT.
It calls the same roomsService.update() as PATCH /rooms/:id, so both routes work.

Reflection:
Lab 9: I learned that good API docs list every response a client can get, not just the happy path.
Writing @ApiQuery for page/limit/filters showed me how query params are parsed and validated
with pipes, and Swagger UI made it easy to test them with "Try it out".
Lab 10: Adding PUT next to PATCH showed me that two HTTP methods can share one service method.
In REST, PUT usually means replacing the whole resource and PATCH means changing only some fields,
but here both accept UpdateRoomDto, so the client can send only the fields it wants to change.
*/

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseFloatPipe,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { RoomsCacheInterceptor } from './rooms-cache.interceptor';
import {
  RoomListSchema,
  RoomSchema,
  ThrottledSchema,
  errorSchema,
} from './rooms.schemas';

const idParam = {
  name: 'id',
  type: Number,
  description: 'Room ID',
  example: 1,
};

const badIdResponse = {
  status: 400,
  description: 'ID is not a number',
  schema: errorSchema(
    400,
    'Bad Request',
    'Validation failed (numeric string is expected)',
  ),
};

const unauthorizedResponse = {
  status: 401,
  description: 'Missing or invalid JWT',
  schema: errorSchema(401, 'Unauthorized', 'Missing authentication token'),
};

const forbiddenResponse = {
  status: 403,
  description: 'Logged in, but not an ADMIN',
  schema: errorSchema(403, 'Forbidden', 'Forbidden resource'),
};

const notFoundResponse = {
  status: 404,
  description: 'Room not found',
  schema: errorSchema(404, 'Not Found', 'Room 99 not found'),
};

const throttledResponse = {
  status: 429,
  description: 'Rate limit exceeded (100 requests per minute)',
  schema: ThrottledSchema,
};

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@ApiResponse(unauthorizedResponse)
@ApiResponse(throttledResponse)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new room (ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Room created',
    schema: RoomSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Request body failed validation',
    schema: errorSchema(400, 'Bad Request', [
      'name should not be empty',
      'capacity must not be less than 1',
    ]),
  })
  @ApiResponse(forbiddenResponse)
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(RoomsCacheInterceptor)
  @Get()
  @ApiOperation({ summary: 'List rooms with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, starting at 1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Rooms per page (max 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Only active (true) or only disabled (false) rooms',
    example: true,
  })
  @ApiQuery({
    name: 'minCapacity',
    required: false,
    type: Number,
    description: 'Only rooms that fit at least this many guests',
    example: 2,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Only rooms with price_per_night at or below this value',
    example: 3000,
  })
  @ApiResponse({
    status: 200,
    description: 'A page of rooms with pagination metadata',
    schema: RoomListSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'A query parameter has the wrong type',
    schema: errorSchema(
      400,
      'Bad Request',
      'Validation failed (numeric string is expected)',
    ),
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('is_active', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('minCapacity', new ParseIntPipe({ optional: true }))
    minCapacity?: number,
    @Query('maxPrice', new ParseFloatPipe({ optional: true }))
    maxPrice?: number,
  ) {
    return this.roomsService.findAll({
      page,
      limit,
      isActive,
      minCapacity,
      maxPrice,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(RoomsCacheInterceptor)
  @Get(':id')
  @ApiOperation({ summary: 'Get one room by ID' })
  @ApiParam(idParam)
  @ApiResponse({ status: 200, description: 'The room', schema: RoomSchema })
  @ApiResponse(badIdResponse)
  @ApiResponse(notFoundResponse)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update room details (ADMIN only)' })
  @ApiParam(idParam)
  @ApiResponse({
    status: 200,
    description: 'Room updated',
    schema: RoomSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID or request body failed validation',
    schema: errorSchema(400, 'Bad Request', [
      'price_per_night must not be less than 0',
    ]),
  })
  @ApiResponse(forbiddenResponse)
  @ApiResponse(notFoundResponse)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  // Same as PATCH /rooms/:id; the Lab 10 spec tests updates with PUT.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update room details with PUT (ADMIN only)' })
  @ApiParam(idParam)
  @ApiResponse({
    status: 200,
    description: 'Room updated',
    schema: RoomSchema,
  })
  @ApiResponse(badIdResponse)
  @ApiResponse(forbiddenResponse)
  @ApiResponse(notFoundResponse)
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a room so it can be booked (ADMIN only)' })
  @ApiParam(idParam)
  @ApiResponse({
    status: 200,
    description: 'Room enabled (is_active = true)',
    schema: {
      ...RoomSchema,
      example: { ...RoomSchema.example, is_active: true },
    },
  })
  @ApiResponse(badIdResponse)
  @ApiResponse(forbiddenResponse)
  @ApiResponse(notFoundResponse)
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.enable(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/disable')
  @ApiOperation({
    summary: 'Disable a room so it cannot be booked (ADMIN only)',
  })
  @ApiParam(idParam)
  @ApiResponse({
    status: 200,
    description: 'Room disabled (is_active = false)',
    schema: {
      ...RoomSchema,
      example: { ...RoomSchema.example, is_active: false },
    },
  })
  @ApiResponse(badIdResponse)
  @ApiResponse(forbiddenResponse)
  @ApiResponse(notFoundResponse)
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.disable(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room (ADMIN only)' })
  @ApiParam(idParam)
  @ApiResponse({
    status: 200,
    description: 'Room deleted; returns the deleted room',
    schema: RoomSchema,
  })
  @ApiResponse(badIdResponse)
  @ApiResponse(forbiddenResponse)
  @ApiResponse(notFoundResponse)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
