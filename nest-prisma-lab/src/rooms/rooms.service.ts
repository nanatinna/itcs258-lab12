/*
AI Declaration:
I used Claude to help me set up Redis, and to find out why cache-manager-redis-yet does not work with NestJS 11 (so I used @keyv/redis instead).
I review every part and I understand the entire implementation.

Reflection:
I learned that a cache only helps for GET requests that return the same data many times, and that
I have to clear the cache after create/update/delete or users will see old data. Rate limiting showed
me how the server can protect itself with 429 responses, and benchmarking with autocannon let me see
the real difference in numbers instead of just guessing.
*/

import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

export interface FindRoomsQuery {
  page: number;
  limit: number;
  isActive?: boolean;
  minCapacity?: number;
  maxPrice?: number;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger('RoomsService');

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Cache keys are the request URLs, and the list now has query strings
  // (/rooms?page=2&...), so we can't list every key: clear the whole room cache.
  private async clearCache() {
    await this.cacheManager.clear();
  }

  async create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating room: ${createRoomDto.name}`);
    try {
      const room = await this.prisma.rooms.create({ data: createRoomDto });
      await this.clearCache();
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to create room: ${createRoomDto.name}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to create room');
    }
  }

  async findAll(query: FindRoomsQuery) {
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 100);
    this.logger.log(`Fetching rooms page=${page} limit=${limit}`);

    const where = {
      ...(query.isActive !== undefined && { is_active: query.isActive }),
      ...(query.minCapacity !== undefined && {
        capacity: { gte: query.minCapacity },
      }),
      ...(query.maxPrice !== undefined && {
        price_per_night: { lte: query.maxPrice },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.rooms.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.rooms.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    this.logger.log(`Fetching room id=${id}`);
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      this.logger.warn(`Room ${id} not found`);
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

  async disable(id: number) {
    this.logger.log(`Disabling room id=${id}`);
    await this.findOne(id);
    try {
      const room = await this.prisma.rooms.update({
        where: { id },
        data: { is_active: false },
      });
      await this.clearCache();
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to disable room id=${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to disable room ${id}`);
    }
  }

  async enable(id: number) {
    this.logger.log(`Enabling room id=${id}`);
    await this.findOne(id);
    try {
      const room = await this.prisma.rooms.update({
        where: { id },
        data: { is_active: true },
      });
      await this.clearCache();
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to enable room id=${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to enable room ${id}`);
    }
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Updating room id=${id}`);
    await this.findOne(id);
    try {
      const room = await this.prisma.rooms.update({
        where: { id },
        data: updateRoomDto,
      });
      await this.clearCache();
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to update room id=${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to update room ${id}`);
    }
  }

  async remove(id: number) {
    this.logger.log(`Deleting room id=${id}`);
    await this.findOne(id);
    try {
      const room = await this.prisma.rooms.delete({ where: { id } });
      await this.clearCache();
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to delete room id=${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to delete room ${id}`);
    }
  }
}
