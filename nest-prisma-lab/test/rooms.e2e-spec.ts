/*
AI Declaration:
I used Claude to help me write the end-to-end tests for the Room API, including how to replace the
Redis cache with an in-memory mock, seed a test ADMIN user with bcrypt, and clean up in afterAll.
I reviewed every test and I understand the entire implementation.

Reflection:
I learned that an E2E test runs the whole app (routing, guards, pipes, service and real database),
so it catches problems the smaller tests can't, like a missing token returning 401. Because the
tests share one room across the full lifecycle, I also saw why cleanup matters: without it, every
run would leave test data behind in the database.
*/

import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// The parts of a room response that the tests read.
interface RoomBody {
  id: number;
  name: string;
  price_per_night: string | number;
}

describe('Rooms API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let roomId: number;

  const admin = {
    username: `e2e_admin_${Date.now()}`,
    password: 'E2eAdminPass123!',
  };

  const newRoom = {
    name: 'E2E Test Room',
    description: 'Room created by the E2E test',
    capacity: 2,
    price_per_night: 1500,
  };

  // In-memory replacement for the Redis store, so the test does not need Redis.
  const cache = new Map<string, unknown>();
  const mockCacheManager = {
    get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
    set: jest.fn((key: string, value: unknown) => {
      cache.set(key, value);
      return Promise.resolve(value);
    }),
    del: jest.fn((key: string) => Promise.resolve(cache.delete(key))),
    clear: jest.fn(() => {
      cache.clear();
      return Promise.resolve(true);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue(mockCacheManager)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get(PrismaService);

    // Seed a test ADMIN user, then log in through the real endpoint to get a JWT.
    await prisma.users.create({
      data: {
        username: admin.username,
        password: await bcrypt.hash(admin.password, 10),
        role: 'ADMIN',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(admin)
      .expect(200);
    accessToken = (res.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (prisma) {
      if (roomId) {
        await prisma.rooms.deleteMany({ where: { id: roomId } });
      }
      await prisma.users.deleteMany({ where: { username: admin.username } });
    }
    if (app) {
      await app.close();
    }
  });

  it('POST /rooms creates a room (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newRoom)
      .expect(201);

    expect(res.body).toMatchObject({
      name: newRoom.name,
      capacity: newRoom.capacity,
      is_active: true,
    });
    const room = res.body as RoomBody;
    expect(Number(room.price_per_night)).toBe(newRoom.price_per_night);
    roomId = room.id;
  });

  it('POST /rooms without a token is rejected (401)', async () => {
    await request(app.getHttpServer()).post('/rooms').send(newRoom).expect(401);
  });

  it('GET /rooms includes the created room', async () => {
    const res = await request(app.getHttpServer())
      .get('/rooms')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const ids = (res.body as { data: RoomBody[] }).data.map((room) => room.id);
    expect(ids).toContain(roomId);
  });

  it('GET /rooms/:id returns the created room', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ id: roomId, name: newRoom.name });
  });

  it('PUT /rooms/:id updates the room (200)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Test Room (updated)', price_per_night: 1800 })
      .expect(200);

    const room = res.body as RoomBody;
    expect(room.name).toBe('E2E Test Room (updated)');
    expect(Number(room.price_per_night)).toBe(1800);
  });

  it('PUT /rooms/:id with an unknown id returns 404', async () => {
    await request(app.getHttpServer())
      .put('/rooms/999999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Does not exist' })
      .expect(404);
  });

  it('DELETE /rooms/:id deletes the room (200)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((res.body as RoomBody).id).toBe(roomId);
  });

  it('GET /rooms/:id after delete returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
