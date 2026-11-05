/*
AI Declaration:
I used Claude to help me write the unit tests for RoomsService, including how to mock
PrismaService and the cache manager with jest.fn(). I reviewed every test and I understand
the entire implementation.

Reflection:
I learned that a unit test should only check the service's own logic, so the database is
replaced by a mock that I control. Making the mock return null or throw an error let me test
the failure paths (404 and 500) that are hard to reproduce with a real database.
*/

import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

describe('RoomsService', () => {
  let service: RoomsService;

  const mockRoom = {
    id: 1,
    name: 'Deluxe Ocean View',
    description: 'King-size bed, balcony with sea view',
    capacity: 2,
    price_per_night: 2500.5,
    image_url: null,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };

  const mockPrisma = {
    rooms: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCache = {
    clear: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    // Hide the service's error logs so the test output stays readable.
    module.useLogger(false);

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateRoomDto = {
      name: 'Deluxe Ocean View',
      capacity: 2,
      price_per_night: 2500.5,
    };

    it('creates a room, clears the cache and returns the room', async () => {
      mockPrisma.rooms.create.mockResolvedValue(mockRoom);

      const result = await service.create(dto);

      expect(mockPrisma.rooms.create).toHaveBeenCalledWith({ data: dto });
      expect(mockCache.clear).toHaveBeenCalled();
      expect(result).toEqual(mockRoom);
    });

    it('throws InternalServerErrorException when the database rejects the data', async () => {
      mockPrisma.rooms.create.mockRejectedValue(new Error('Invalid data'));

      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockCache.clear).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all rooms with pagination metadata', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([mockRoom]);
      mockPrisma.rooms.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { id: 'asc' },
      });
      expect(result).toEqual({
        data: [mockRoom],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('passes the filters to the repository', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      await service.findAll({
        page: 2,
        limit: 5,
        isActive: true,
        minCapacity: 2,
        maxPrice: 3000,
      });

      const where = {
        is_active: true,
        capacity: { gte: 2 },
        price_per_night: { lte: 3000 },
      };
      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith({
        where,
        skip: 5,
        take: 5,
        orderBy: { id: 'asc' },
      });
      expect(mockPrisma.rooms.count).toHaveBeenCalledWith({ where });
    });

    it('returns an empty list when there are no rooms', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns the room with the given id', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);

      const result = await service.findOne(1);

      expect(mockPrisma.rooms.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockRoom);
    });

    it('throws NotFoundException when the room does not exist', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto: UpdateRoomDto = { price_per_night: 3000 };

    it('calls the repository update with the id and data', async () => {
      const updated = { ...mockRoom, price_per_night: 3000 };
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.rooms.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockPrisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(mockCache.clear).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException and does not update when the room does not exist', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.update(99, dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.rooms.update).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when the update fails', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.rooms.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('calls the repository delete and returns the deleted room', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.rooms.delete.mockResolvedValue(mockRoom);

      const result = await service.remove(1);

      expect(mockPrisma.rooms.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCache.clear).toHaveBeenCalled();
      expect(result).toEqual(mockRoom);
    });

    it('throws NotFoundException and does not delete when the room does not exist', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.rooms.delete).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when the delete fails', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.rooms.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(1)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockCache.clear).not.toHaveBeenCalled();
    });
  });
});
