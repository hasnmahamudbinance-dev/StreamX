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

  // Create subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free',
      description: 'Get started with basic streaming',
      price: 0,
      currency: 'USD',
      interval: 'month',
      maxResolution: '720p',
      maxDevices: 1,
      maxProfiles: 1,
      allowDownloads: false,
      allowOffline: false,
      trialDays: 0,
      features: JSON.stringify(['HD streaming', 'Limited content library', '1 device', 'Ad-supported']),
      active: true,
      order: 1,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'premium' },
    update: {},
    create: {
      name: 'premium',
      displayName: 'Premium',
      description: 'The best streaming experience',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      maxResolution: '4k',
      maxDevices: 4,
      maxProfiles: 5,
      allowDownloads: true,
      allowOffline: true,
      trialDays: 7,
      features: JSON.stringify(['4K Ultra HD', 'Full content library', '4 devices', 'No ads', 'Downloads', 'Offline viewing', 'Priority support']),
      active: true,
      order: 2,
    },
  });

  const familyPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'family' },
    update: {},
    create: {
      name: 'family',
      displayName: 'Family',
      description: 'Perfect for the whole family',
      price: 14.99,
      currency: 'USD',
      interval: 'month',
      maxResolution: '4k',
      maxDevices: 6,
      maxProfiles: 8,
      allowDownloads: true,
      allowOffline: true,
      trialDays: 14,
      features: JSON.stringify(['4K Ultra HD', 'Full content library', '6 devices', 'No ads', 'Downloads', 'Offline viewing', 'Kids profiles', 'Family sharing']),
      active: true,
      order: 3,
    },
  });

  console.log('Subscription plans created:', freePlan.name, premiumPlan.name, familyPlan.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
