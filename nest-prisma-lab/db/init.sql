-- Creates the tables from prisma/schema.prisma.
-- MySQL runs this only once, when the mysqldata volume is empty.
CREATE TABLE IF NOT EXISTS users (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  created_at DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id              INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)   NOT NULL,
  description     TEXT           NULL,
  capacity        INT            NOT NULL,
  price_per_night DECIMAL(10,2)  NOT NULL,
  image_url       VARCHAR(255)   NULL,
  is_active       BOOLEAN        NULL DEFAULT TRUE,
  created_at      DATETIME(0)    NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME(0)    NULL DEFAULT CURRENT_TIMESTAMP
);