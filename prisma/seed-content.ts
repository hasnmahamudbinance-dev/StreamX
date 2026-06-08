import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo movie
  const movie = await prisma.uploadedContent.create({
    data: {
      title: 'Galactic Horizon',
      originalTitle: 'Galactic Horizon',
      description: 'In the year 2157, humanity faces its greatest challenge as a mysterious signal from beyond the galaxy threatens to tear the fabric of space-time apart. A team of elite astronauts must embark on a perilous journey to the edge of the observable universe to find the source and save all of existence.',
      type: 'movie',
      status: 'published',
      releaseDate: '2025-03-15',
      genres: 'Science Fiction, Action, Adventure',
      language: 'en',
      runtime: 148,
      rating: 8.7,
      director: 'Elena Vasquez',
      cast: '["James Chen as Captain Reed","Sofia Martinez as Dr. Vega","Kwame Asante as Navigator Kofi","Yuki Tanaka as Engineer Sato"]',
      featured: true,
      views: 15842,
      watchTime: 1890000,
    },
  });

  console.log('Created movie:', movie.title);

  // Create a demo TV show
  const tvShow = await prisma.uploadedContent.create({
    data: {
      title: 'Neon Shadows',
      originalTitle: 'Neon Shadows',
      description: 'In a sprawling cyberpunk metropolis, a former detective turned private investigator navigates the dangerous underworld of corporate espionage, AI consciousness, and digital ghosts. Each season peels back another layer of the city\'s dark secrets.',
      type: 'tv',
      status: 'published',
      releaseDate: '2024-09-01',
      genres: 'Science Fiction, Thriller, Drama',
      language: 'en',
      runtime: 55,
      rating: 9.1,
      director: 'Marcus Webb',
      cast: '["Lena Park as Detective Kira","Raj Patel as Hacker Zero","Maria Santos as CEO Voss","Tom Wright as Inspector Stone"]',
      featured: true,
      views: 42310,
      watchTime: 8500000,
    },
  });

  console.log('Created TV show:', tvShow.title);

  // Create episodes for the TV show
  for (let s = 1; s <= 2; s++) {
    for (let e = 1; e <= 3; e++) {
      await prisma.episode.create({
        data: {
          contentId: tvShow.id,
          seasonNumber: s,
          episodeNumber: e,
          title: s === 1 
            ? ['The Signal', 'Ghost Protocol', 'Digital Rain'][e-1]
            : ['New Dawn', 'Mirror Image', 'End Game'][e-1],
          description: `Season ${s}, Episode ${e} of Neon Shadows`,
          runtime: 52 + Math.floor(Math.random() * 10),
          status: 'published',
        },
      });
    }
  }

  console.log('Created 6 episodes');

  // Create a draft movie
  const draftMovie = await prisma.uploadedContent.create({
    data: {
      title: 'The Last Frontier',
      description: 'An epic western set in 1890s Montana. A rancher must defend his land against a ruthless railroad baron while uncovering a conspiracy that reaches the highest levels of government.',
      type: 'movie',
      status: 'draft',
      genres: 'Western, Drama',
      language: 'en',
      runtime: 135,
      rating: 7.8,
      director: 'Sam Hunter',
    },
  });

  console.log('Created draft:', draftMovie.title);

  // Create an archived TV show
  await prisma.uploadedContent.create({
    data: {
      title: 'Echo Chamber',
      description: 'A psychological thriller about a podcaster who discovers their listeners are being manipulated by a mysterious frequency hidden in the audio.',
      type: 'tv',
      status: 'archived',
      genres: 'Thriller, Horror',
      language: 'en',
      runtime: 45,
      rating: 6.5,
    },
  });

  console.log('Created archived: Echo Chamber');

  // Add some analytics events
  const contentItems = await prisma.uploadedContent.findMany();
  for (const item of contentItems) {
    for (let i = 0; i < 5; i++) {
      await prisma.contentAnalytics.create({
        data: {
          contentId: item.id,
          action: ['view', 'play', 'complete', 'pause', 'seek'][i],
          position: Math.floor(Math.random() * 3600),
          duration: item.runtime * 60,
          quality: ['480p', '720p', '1080p'][Math.floor(Math.random() * 3)],
          device: ['desktop', 'mobile'][Math.floor(Math.random() * 2)],
        },
      });
    }
  }

  console.log('Created analytics events');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
