import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@streamx.com' },
    update: {},
    create: {
      email: 'admin@streamx.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Admin user created:', admin.email);

  // Create a demo user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@streamx.com' },
    update: {},
    create: {
      email: 'user@streamx.com',
      name: 'Demo User',
      password: userPassword,
      role: 'user',
    },
  });

  console.log('Demo user created:', user.email);

  // Create some featured collections
  const actionCollection = await prisma.collection.upsert({
    where: { id: 'action-hits' },
    update: {},
    create: {
      id: 'action-hits',
      title: 'Action Hits',
      description: 'Best action movies to get your adrenaline pumping',
      type: 'featured',
      featured: true,
      order: 1,
    },
  });

  const scifiCollection = await prisma.collection.upsert({
    where: { id: 'scifi-essentials' },
    update: {},
    create: {
      id: 'scifi-essentials',
      title: 'Sci-Fi Essentials',
      description: 'Mind-bending science fiction',
      type: 'featured',
      featured: true,
      order: 2,
    },
  });

  console.log('Collections created');

  // Create some notifications
  await prisma.notification.createMany({
    data: [
      {
        title: 'Welcome to StreamX!',
        message: 'Discover your next favorite movie or TV show.',
        type: 'info',
      },
      {
        title: 'New on StreamX',
        message: 'Check out the latest trending movies this week.',
        type: 'announcement',
      },
    ],
  });

  console.log('Notifications created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
