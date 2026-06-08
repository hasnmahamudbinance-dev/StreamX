import { db } from '../src/lib/db';

async function main() {
  // Get demo user
  const user = await db.user.findUnique({ where: { email: 'user@streamx.com' } });
  if (!user) {
    console.error('Demo user not found. Run the main seed first.');
    return;
  }

  const now = new Date();
  
  const historyItems = [
    {
      userId: user.id,
      contentId: '550',
      contentType: 'movie',
      title: 'Fight Club',
      posterPath: '/pB8BM7pdSp6B6IhKQDW9aX6Z668.jpg',
      overview: 'A ticking-Loss, insomniac office worker looking for a way to change his life crosses paths with a devil-may-care soap maker.',
      rating: 8.4,
      releaseDate: '1999-10-15',
      progress: 7260,
      duration: 7260,
      watchedAt: new Date(now.getTime() - 30 * 60000), // 30 min ago
    },
    {
      userId: user.id,
      contentId: '1396',
      contentType: 'tv',
      title: 'Breaking Bad',
      posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      overview: 'A high school chemistry teacher diagnosed with lung cancer turns to manufacturing and selling methamphetamine.',
      rating: 8.9,
      releaseDate: '2008-01-20',
      progress: 2340,
      duration: 2700,
      watchedAt: new Date(now.getTime() - 3 * 3600000), // 3 hours ago
    },
    {
      userId: user.id,
      contentId: '155',
      contentType: 'movie',
      title: 'The Dark Knight',
      posterPath: '/qJ2tW6WMUDux911kpUpRauGBRs.jpg',
      overview: 'Batman raises the stakes in his war on crime.',
      rating: 9.0,
      releaseDate: '2008-07-18',
      progress: 5400,
      duration: 9120,
      watchedAt: new Date(now.getTime() - 8 * 3600000), // 8 hours ago
    },
    {
      userId: user.id,
      contentId: '1399',
      contentType: 'tv',
      title: 'Game of Thrones',
      posterPath: '/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg',
      overview: 'Nine noble families fight for control over the lands of Westeros.',
      rating: 8.5,
      releaseDate: '2011-04-17',
      progress: 3600,
      duration: 3600,
      watchedAt: new Date(now.getTime() - 26 * 3600000), // yesterday
    },
    {
      userId: user.id,
      contentId: '27205',
      contentType: 'movie',
      title: 'Inception',
      posterPath: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
      overview: 'A thief who steals corporate secrets through dream-sharing technology.',
      rating: 8.8,
      releaseDate: '2010-07-16',
      progress: 5400,
      duration: 8880,
      watchedAt: new Date(now.getTime() - 50 * 3600000), // ~2 days ago
    },
    {
      userId: user.id,
      contentId: '603',
      contentType: 'movie',
      title: 'The Matrix',
      posterPath: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      overview: 'A computer hacker discovers that reality as he knows it is a simulation.',
      rating: 8.7,
      releaseDate: '1999-03-31',
      progress: 8160,
      duration: 8160,
      watchedAt: new Date(now.getTime() - 74 * 3600000), // ~3 days ago
    },
    {
      userId: user.id,
      contentId: '94997',
      contentType: 'tv',
      title: 'House of the Dragon',
      posterPath: '/z2Pi2LMGsSGnHfJBBCpv7B6DBU6.jpg',
      overview: 'The Targaryen dynasty is at the absolute apex of its power.',
      rating: 8.4,
      releaseDate: '2022-08-21',
      progress: 1800,
      duration: 3600,
      watchedAt: new Date(now.getTime() - 5 * 86400000), // 5 days ago
    },
    {
      userId: user.id,
      contentId: '414906',
      contentType: 'movie',
      title: 'The Batman',
      posterPath: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
      overview: 'When a sadistic serial killer begins murdering key political figures in Gotham.',
      rating: 7.7,
      releaseDate: '2022-03-04',
      progress: 10800,
      duration: 10800,
      watchedAt: new Date(now.getTime() - 7 * 86400000), // 7 days ago
    },
    {
      userId: user.id,
      contentId: '76341',
      contentType: 'movie',
      title: 'Mad Max: Fury Road',
      posterPath: '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
      overview: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler.',
      rating: 7.6,
      releaseDate: '2015-05-15',
      progress: 3600,
      duration: 7200,
      watchedAt: new Date(now.getTime() - 10 * 86400000), // 10 days ago
    },
    {
      userId: user.id,
      contentId: '100088',
      contentType: 'tv',
      title: 'The Last of Us',
      posterPath: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      overview: 'Joel and Ellie travel across a post-apocalyptic America.',
      rating: 8.8,
      releaseDate: '2023-01-15',
      progress: 2700,
      duration: 2700,
      watchedAt: new Date(now.getTime() - 14 * 86400000), // 2 weeks ago
    },
  ];

  for (const item of historyItems) {
    await db.watchHistory.upsert({
      where: {
        userId_contentId_contentType: {
          userId: item.userId,
          contentId: item.contentId,
          contentType: item.contentType,
        },
      },
      update: {
        title: item.title,
        posterPath: item.posterPath,
        overview: item.overview,
        rating: item.rating,
        releaseDate: item.releaseDate,
        progress: item.progress,
        duration: item.duration,
        watchedAt: item.watchedAt,
      },
      create: item,
    });
  }

  console.log(`Seeded ${historyItems.length} watch history items for demo user`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
