import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: npx ts-node scripts/promote-admin.ts <username>');
    process.exit(1);
  }

  const user = await prisma.users.update({
    where: { username },
    data: { role: 'ADMIN' },
  });

  console.log(`Promoted "${user.username}" to ADMIN.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
