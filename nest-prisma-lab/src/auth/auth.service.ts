/*
AI Declaration:
I used Claude to help me debug the AuthService due to it error happend when I try to implement password hashing and saving it to database.
I wrote all the other code, and I understand the entire implementation.

Reflection:
In this lab I have learn beyond my old knowledge from last semester about how to implement authentication and authorization in a NestJS application using JWT and bcrypt for password hashing.
I also learned how to use Prisma as an ORM to interact with the database. The process of validating user credentials, handling exceptions, and generating JWT tokens was particularly insightful. Overall, AI help me a lot to make me more confident in understanding these concepts and debugging the implementation.
*/

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.users.findUnique({
      where: { username: registerDto.username },
    });
    if (existing) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, SALT_ROUNDS);

    const user = await this.prisma.users.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
      },
    });

    return { id: user.id, username: user.username, role: user.role };
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { access_token: accessToken };
  }
}
