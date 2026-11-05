/*
AI Declaration:
I used Claude to help me write the integration tests for RoomsController, especially how to
override JwtAuthGuard, RolesGuard and the cache interceptor with overrideGuard/overrideInterceptor.
I reviewed every test and I understand the entire implementation.

Reflection:
I learned that an integration test checks how the layers work together: the HTTP request goes
through routing, ParseIntPipe and ValidationPipe into the controller, which must call the right
service method. Turning off the guards and cache let me focus on the controller-service link only.
*/

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { of } from 'rxjs';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsCacheInterceptor } from './rooms-cache.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('RoomsController (integration)', () => {
  let app: INestApplication<App>;

  const mockRoom = {
    id: 1,
    name: 'Deluxe Ocean View',
    description: 'King-size bed, balcony with sea view',
    capacity: 2,
    price_per_night: 2500.5,
    image_url: null,
    is_active: true,
  };

  const mockRoomsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };

  // Let every request through, without checking a JWT or role.
  const allowAll = { canActivate: () => true };
  // Skip the cache: just call the route handler.
  const noCache = {
    intercept: (_context: ExecutionContext, next: { handle: () => unknown }) =>
      next.handle() ?? of(undefined),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [{ provide: RoomsService, useValue: mockRoomsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAll)
      .overrideGuard(RolesGuard)
      .useValue(allowAll)
      .overrideInterceptor(RoomsCacheInterceptor)
      .useValue(noCache)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /rooms', () => {
    const body = {
      name: 'Deluxe Ocean View',
      capacity: 2,
      price_per_night: 2500.5,
    };

    it('calls service.create and returns the created room', async () => {
      mockRoomsService.create.mockResolvedValue(mockRoom);

      const res = await request(app.getHttpServer())
        .post('/rooms')
        .send(body)
        .expect(201);

      expect(mockRoomsService.create).toHaveBeenCalledWith(body);
      expect(res.body).toEqual(mockRoom);
    });

    it('returns 400 and does not call the service when the body is invalid', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: '', capacity: 0 })
        .expect(400);

      expect(mockRoomsService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /rooms', () => {
    it('calls service.findAll and returns the list of rooms', async () => {
      const list = {
        data: [mockRoom],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockRoomsService.findAll.mockResolvedValue(list);

      const res = await request(app.getHttpServer()).get('/rooms').expect(200);

      expect(mockRoomsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        isActive: undefined,
        minCapacity: undefined,
        maxPrice: undefined,
      });
      expect(res.body).toEqual(list);
    });
  });

  describe('GET /rooms/:id', () => {
    it('calls service.findOne with a number id and returns the room', async () => {
      mockRoomsService.findOne.mockResolvedValue(mockRoom);

      const res = await request(app.getHttpServer())
        .get('/rooms/1')
        .expect(200);

      expect(mockRoomsService.findOne).toHaveBeenCalledWith(1);
      expect(res.body).toEqual(mockRoom);
    });

    it('returns 404 when the service throws NotFoundException', async () => {
      mockRoomsService.findOne.mockRejectedValue(
        new NotFoundException('Room 99 not found'),
      );

      const res = await request(app.getHttpServer())
        .get('/rooms/99')
        .expect(404);

      expect(mockRoomsService.findOne).toHaveBeenCalledWith(99);
      expect(res.body).toMatchObject({ message: 'Room 99 not found' });
    });

    it('returns 400 when the id is not a number', async () => {
      await request(app.getHttpServer()).get('/rooms/abc').expect(400);

      expect(mockRoomsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PUT /rooms/:id', () => {
    it('calls service.update with the id and body', async () => {
      const body = { price_per_night: 3000 };
      const updated = { ...mockRoom, ...body };
      mockRoomsService.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .put('/rooms/1')
        .send(body)
        .expect(200);

      expect(mockRoomsService.update).toHaveBeenCalledWith(1, body);
      expect(res.body).toEqual(updated);
    });

    it('returns 404 when the room does not exist', async () => {
      mockRoomsService.update.mockRejectedValue(
        new NotFoundException('Room 99 not found'),
      );

      await request(app.getHttpServer())
        .put('/rooms/99')
        .send({ price_per_night: 3000 })
        .expect(404);
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('calls service.remove and returns the deleted room', async () => {
      mockRoomsService.remove.mockResolvedValue(mockRoom);

      const res = await request(app.getHttpServer())
        .delete('/rooms/1')
        .expect(200);

      expect(mockRoomsService.remove).toHaveBeenCalledWith(1);
      expect(res.body).toEqual(mockRoom);
    });

    it('returns 404 when the service throws NotFoundException', async () => {
      mockRoomsService.remove.mockRejectedValue(
        new NotFoundException('Room 99 not found'),
      );

      const res = await request(app.getHttpServer())
        .delete('/rooms/99')
        .expect(404);

      expect(mockRoomsService.remove).toHaveBeenCalledWith(99);
      expect(res.body).toMatchObject({ message: 'Room 99 not found' });
    });
  });
});
