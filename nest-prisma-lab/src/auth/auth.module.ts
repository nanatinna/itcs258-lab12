import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

const jwtModule = JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 3600,
  },
});

@Module({
  imports: [jwtModule],
  providers: [AuthService, PrismaService, JwtAuthGuard, RolesGuard],
  controllers: [AuthController],
  exports: [jwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
