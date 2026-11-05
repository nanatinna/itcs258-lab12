/*
AI Declaration:
I used Claude to help me set up Swagger/OpenAPI documentation for the Room API, including fixing
the @nestjs/swagger version conflict (v12 needs NestJS 12, so I used v11) and writing the inline
response schemas. I reviewed every part and I understand the entire implementation.

Reflection:
I learned that API documentation can be generated straight from the code with decorators, so the
docs stay in sync with the real endpoints. Writing the response schemas made me think about what
each endpoint actually returns (including errors like 401, 403 and 429), and "Try it out" in
Swagger UI let me test protected endpoints with a JWT without using Postman.
*/

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'nest-lab',
    }),
  });

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Hotel Booking System API')
    .setDescription(
      'REST API for the Hotel Booking System.\n\n' +
        '- **Rooms**: create, list (with pagination and filters), view, update, enable/disable and delete hotel rooms.\n' +
        '- **Bookings**: manage room bookings made by users.\n\n' +
        'Protected endpoints need a JWT: log in with `POST /auth/login`, then click **Authorize** and paste the `access_token`.\n\n' +
        '**Rate limiting:** each client can make at most **100 requests per minute**. ' +
        'Requests over the limit get `429 Too Many Requests`.',
    )
    .setVersion('1.0.0')
    .addTag('rooms', 'Room management endpoints')
    .addTag('bookings', 'Booking management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the access_token from POST /auth/login',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
