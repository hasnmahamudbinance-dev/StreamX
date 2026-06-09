import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@streamx.com' },
    update: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'active',
    },
    create: {
      email: 'admin@streamx.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'active',
    },
  });

  console.log('Admin user created:', admin.email);

  // Create a demo user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@streamx.com' },
    update: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'active',
    },
    create: {
      email: 'user@streamx.com',
      name: 'Demo User',
      password: userPassword,
      role: 'user',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'active',
    },
  });

  console.log('Demo user created:', user.email);

  // Create default profiles for existing users
  const existingAdminProfile = await prisma.profile.findFirst({
    where: { userId: admin.id, isDefault: true },
  });
  if (!existingAdminProfile) {
    await prisma.profile.create({
      data: {
        userId: admin.id,
        profileName: 'Admin',
        isDefault: true,
      },
    });
  }

  const existingUserProfile = await prisma.profile.findFirst({
    where: { userId: user.id, isDefault: true },
  });
  if (!existingUserProfile) {
    await prisma.profile.create({
      data: {
        userId: user.id,
        profileName: 'Demo User',
        isDefault: true,
      },
    });
  }

  console.log('Default profiles created');

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

  // ─── Subscription Plans ────────────────────────────────────────
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {},
    create: {
      name: 'Free',
      displayName: 'Basic',
      description: 'Get started with free streaming',
      price: 0,
      currency: 'USD',
      interval: 'month',
      trialDays: 0,
      maxResolution: '720p',
      maxDevices: 1,
      maxProfiles: 1,
      allowDownloads: false,
      allowOffline: false,
      features: JSON.stringify([
        '720p streaming quality',
        'Watch on 1 device at a time',
        'Up to 1 profile',
        'Limited content library',
        'Ad-supported viewing',
      ]),
      active: true,
      order: 1,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Premium' },
    update: {},
    create: {
      name: 'Premium',
      displayName: 'Premium',
      description: 'The best value for movie lovers',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      trialDays: 7,
      maxResolution: '4k',
      maxDevices: 2,
      maxProfiles: 3,
      allowDownloads: true,
      allowOffline: true,
      features: JSON.stringify([
        '4K Ultra HD streaming quality',
        'Watch on 2 devices at a time',
        'Up to 3 profiles',
        'Full content library',
        'Ad-free viewing',
        'Download content',
        'Offline viewing',
        '7-day free trial',
      ]),
      active: true,
      order: 2,
    },
  });

  const familyPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Family' },
    update: {},
    create: {
      name: 'Family',
      displayName: 'Family',
      description: 'Perfect for the whole household',
      price: 14.99,
      currency: 'USD',
      interval: 'month',
      trialDays: 14,
      maxResolution: '4k',
      maxDevices: 4,
      maxProfiles: 5,
      allowDownloads: true,
      allowOffline: true,
      features: JSON.stringify([
        '4K Ultra HD + HDR streaming quality',
        'Watch on 4 devices at a time',
        'Up to 5 profiles',
        'Full content library',
        'Ad-free viewing',
        'Download content on all devices',
        'Offline viewing',
        'Kids profiles with parental controls',
        '14-day free trial',
      ]),
      active: true,
      order: 3,
    },
  });

  console.log('Subscription plans created:', freePlan.name, premiumPlan.name, familyPlan.name);

  // ─── Coupon Codes ──────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: 'STREAMX20' },
    update: {},
    create: {
      code: 'STREAMX20',
      description: '20% off your first subscription',
      discountType: 'percentage',
      discountValue: 20,
      maxUses: 100,
      usedCount: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      active: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME5' },
    update: {},
    create: {
      code: 'WELCOME5',
      description: '$5 off your subscription',
      discountType: 'fixed',
      discountValue: 5,
      maxUses: 50,
      usedCount: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      active: true,
    },
  });

  console.log('Coupon codes created');

  // ─── Demo User Subscription ────────────────────────────────────
  const existingSub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!existingSub) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: premiumPlan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create a demo payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 9.99,
        currency: 'USD',
        status: 'completed',
        provider: 'stripe',
        description: 'Premium - New Subscription',
      },
    });

    console.log('Demo user subscription created');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
