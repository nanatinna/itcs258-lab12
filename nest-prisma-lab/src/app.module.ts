import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import KeyvRedis from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Redis cache, shared by every module. TTL is in milliseconds: 5 minutes.
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: 5 * 60 * 1000,
        stores: [
          new KeyvRedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'),
        ],
      }),
    }),
    // Global rate limit: 100 requests per minute per client IP.
    // THROTTLE_DISABLED=true turns it off so the cache benchmark is not cut short by 429s.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    PrismaModule,
    RoomsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
