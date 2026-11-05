import type { SchemaObject } from '@nestjs/swagger';

// Inline OpenAPI schemas for the Room responses, used in @ApiResponse({ schema }).

const roomExample = {
  id: 1,
  name: 'Deluxe Ocean View',
  description: 'King-size bed, balcony with sea view, free Wi-Fi',
  capacity: 2,
  price_per_night: '2500.50',
  image_url: 'https://example.com/images/deluxe-ocean.jpg',
  is_active: true,
  created_at: '2026-10-21T08:00:00.000Z',
  updated_at: '2026-10-21T08:00:00.000Z',
};

export const RoomSchema: SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    name: { type: 'string', example: 'Deluxe Ocean View' },
    description: { type: 'string', nullable: true },
    capacity: { type: 'integer', example: 2 },
    price_per_night: {
      type: 'string',
      description: 'Decimal(10,2), returned as a string',
      example: '2500.50',
    },
    image_url: { type: 'string', nullable: true },
    is_active: { type: 'boolean', example: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  example: roomExample,
};

export const RoomListSchema: SchemaObject = {
  type: 'object',
  properties: {
    data: { type: 'array', items: RoomSchema },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 12 },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalPages: { type: 'integer', example: 2 },
      },
    },
  },
  example: {
    data: [roomExample],
    meta: { total: 12, page: 1, limit: 10, totalPages: 2 },
  },
};

// Same shape as Nest's built-in HttpException response.
export function errorSchema(
  statusCode: number,
  error: string,
  message: string | string[],
): SchemaObject {
  return {
    type: 'object',
    properties: {
      statusCode: { type: 'integer', example: statusCode },
      message: Array.isArray(message)
        ? { type: 'array', items: { type: 'string' } }
        : { type: 'string' },
      error: { type: 'string', example: error },
    },
    example: { statusCode, message, error },
  };
}

export const ThrottledSchema: SchemaObject = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer', example: 429 },
    message: { type: 'string' },
  },
  example: {
    statusCode: 429,
    message: 'ThrottlerException: Too Many Requests',
  },
};
