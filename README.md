# ITCS258 Lab 12 - Docker Compose (6788063)

- gacha-workshop/ : Parts 01-04. Express + PostgreSQL + named volume pgdata.
  Copy .env.example to .env, set STUDENT_ID, then: docker compose up -d --build --wait
  Open http://localhost:8085/test
- nest-prisma-lab/ : Part 05. My NestJS hotel API + MySQL + Redis + named volume mysqldata.
  Add the lines from .env.compose.example to .env, then: docker compose up -d --build --wait
  API: http://localhost:8086
