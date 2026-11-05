import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (role USER)' })
  @ApiResponse({
    status: 201,
    description: 'User created',
    schema: { example: { id: 1, username: 'alice', role: 'USER' } },
  })
  @ApiResponse({ status: 400, description: 'Request body failed validation' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and get a JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Copy access_token into the Authorize button',
    schema: {
      example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
