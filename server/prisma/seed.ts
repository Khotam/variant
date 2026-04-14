import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const khotamHash = await bcrypt.hash('khotam123', 10);
  const azizHash = await bcrypt.hash('aziz123', 10);

  const khotam = await prisma.user.upsert({
    where: { username: 'khotam' },
    update: {},
    create: {
      username: 'khotam',
      passwordHash: khotamHash,
      displayName: 'Khotam',
    },
  });

  const aziz = await prisma.user.upsert({
    where: { username: 'aziz' },
    update: {},
    create: {
      username: 'aziz',
      passwordHash: azizHash,
      displayName: 'Aziz',
    },
  });

  console.log('Created users:', khotam.displayName, aziz.displayName);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
