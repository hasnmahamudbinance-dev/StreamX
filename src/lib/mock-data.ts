// Mock data for StreamX when TMDB API is unavailable

const mockMovies = [
  {
    id: 550,
    title: "Fight Club",
    overview:
      "A ticking-clock thriller about a man who discovers an underground fight club that evolves into something much, much more. An unforgettable and twisted exploration of masculinity, consumerism, and the search for identity in modern America.",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
    release_date: "1999-10-15",
    vote_average: 8.4,
    vote_count: 26280,
    genre_ids: [18, 53],
    popularity: 61.416,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    overview:
      "Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden.",
    poster_path: "/9cjIGRjChCU7uSXkNbuZfbWMCnC.jpg",
    backdrop_path: "/kXrqoFWqDYdgU2UvK9Dn1x6B5x0.jpg",
    release_date: "1994-09-23",
    vote_average: 8.7,
    vote_count: 26420,
    genre_ids: [18, 80],
    popularity: 67.289,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 238,
    title: "The Godfather",
    overview:
      "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the family business.",
    poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdrop_path: "/tmU7Ge9sCq4CSWbfJYnMiP2v4Y1.jpg",
    release_date: "1972-03-14",
    vote_average: 8.7,
    vote_count: 18880,
    genre_ids: [18, 80],
    popularity: 55.216,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 155,
    title: "The Dark Knight",
    overview:
      "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
    poster_path: "/qJ2tW6WMUDux911BTUgMe1nNaD.jpg",
    backdrop_path: "/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg",
    release_date: "2008-07-18",
    vote_average: 8.5,
    vote_count: 30540,
    genre_ids: [18, 28, 80, 53],
    popularity: 75.231,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 496243,
    title: "Parasite",
    overview:
      "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdrop_path: "/TU9NIjwzjoKPwQHoHshkFcQUCG8.jpg",
    release_date: "2019-05-30",
    vote_average: 8.5,
    vote_count: 16980,
    genre_ids: [35, 18, 53],
    popularity: 69.832,
    adult: false,
    original_language: "ko",
    media_type: "movie",
  },
  {
    id: 680,
    title: "Pulp Fiction",
    overview:
      "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
    poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    release_date: "1994-09-10",
    vote_average: 8.5,
    vote_count: 25830,
    genre_ids: [53, 80],
    popularity: 58.895,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 13,
    title: "Forrest Gump",
    overview:
      "A man with a low IQ has accomplished great things in his life and been present during significant historic events\u2014in each case, far exceeding what anyone imagined he could do.",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    backdrop_path: "/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg",
    release_date: "1994-07-06",
    vote_average: 8.5,
    vote_count: 25770,
    genre_ids: [35, 18, 10749],
    popularity: 62.195,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 497,
    title: "The Green Mile",
    overview:
      "A supernatural tale set on death row in a Southern prison, where gentle giant John Coffey possesses the mysterious power to heal people's ailments.",
    poster_path: "/velWPhVMQeQKcxggneVbwWWTMk.jpg",
    backdrop_path: "/mMZR3N3ILEZ0i0fAUFCuWDfKF9R.jpg",
    release_date: "1999-12-10",
    vote_average: 8.5,
    vote_count: 16270,
    genre_ids: [18, 14, 80],
    popularity: 53.971,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 603,
    title: "The Matrix",
    overview:
      "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdrop_path: "/7D430eqZj8y3oVkLFfsWXGRcpEG.jpg",
    release_date: "1999-03-31",
    vote_average: 8.2,
    vote_count: 24790,
    genre_ids: [28, 878],
    popularity: 66.432,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 157336,
    title: "Interstellar",
    overview:
      "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK1DVfjko.jpg",
    release_date: "2014-11-05",
    vote_average: 8.4,
    vote_count: 30890,
    genre_ids: [12, 18, 878],
    popularity: 79.321,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 299534,
    title: "Avengers: Endgame",
    overview:
      "After the devastating events of Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos' actions and restore order.",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop_path: "/7RyHsO4yDXtBv1zYu3I8LbJt9QI.jpg",
    release_date: "2019-04-24",
    vote_average: 8.3,
    vote_count: 22690,
    genre_ids: [12, 28, 878],
    popularity: 78.156,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 299536,
    title: "Avengers: Infinity War",
    overview:
      "As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos.",
    poster_path: "/7WsyChQLEftFiDhRkZUHahFXChJ.jpg",
    backdrop_path: "/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg",
    release_date: "2018-04-25",
    vote_average: 8.3,
    vote_count: 23850,
    genre_ids: [12, 28, 878],
    popularity: 72.649,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 603692,
    title: "John Wick: Chapter 4",
    overview:
      "John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy with powerful alliances across the globe.",
    poster_path: "/vzo86psbZZTmg1SJGz6Is7UsM84.jpg",
    backdrop_path: "/r9oTasGQofvkQY5vlUXglneF64Z.jpg",
    release_date: "2023-03-22",
    vote_average: 7.7,
    vote_count: 5420,
    genre_ids: [28, 53, 80],
    popularity: 149.387,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 438631,
    title: "Dune: Part Two",
    overview:
      "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    release_date: "2024-02-27",
    vote_average: 8.2,
    vote_count: 4860,
    genre_ids: [12, 878, 18],
    popularity: 372.493,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 786892,
    title: "Oppenheimer",
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg",
    release_date: "2023-07-19",
    vote_average: 8.1,
    vote_count: 8320,
    genre_ids: [18, 36],
    popularity: 219.289,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 949,
    title: "Hotel Rwanda",
    overview:
      "Inspired by true events, this film takes place in Rwanda in the 1990s when more than a million Tutsis were slaughtered in a genocide that went largely unnoticed by the rest of the world.",
    poster_path: "/d9aSO4OB4ZoVQ6JMrPZ6DdCjyBL.jpg",
    backdrop_path: "/a0YsNFmLGB34j6H0GZxAh5jaItM.jpg",
    release_date: "2004-12-22",
    vote_average: 8.1,
    vote_count: 5060,
    genre_ids: [18, 36, 10752],
    popularity: 19.536,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 122,
    title: "LOTR: The Return of the King",
    overview:
      "Aragorn is revealed as the heir to the ancient kings as he, Gandalf and the other members of the broken fellowship struggle to save Gondor from Sauron's forces.",
    poster_path: "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
    backdrop_path: "/kiWxxqWeQhbNWIzIqT5BwgMVZk7.jpg",
    release_date: "2003-12-01",
    vote_average: 8.5,
    vote_count: 21730,
    genre_ids: [12, 14, 28],
    popularity: 56.216,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 244786,
    title: "Whiplash",
    overview:
      "Under the direction of a ruthless instructor, a talented young drummer begins to pursue perfection at any cost, even his humanity.",
    poster_path: "/7fn624j544nKTnEuUGkCpGWOBJz.jpg",
    backdrop_path: "/6bbZ6XlDq6W8VhIzIhLjUoRMgEL.jpg",
    release_date: "2014-10-10",
    vote_average: 8.4,
    vote_count: 15790,
    genre_ids: [18, 10402],
    popularity: 47.889,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
  {
    id: 346,
    title: "Seven Samurai",
    overview:
      "A poor village under attack by bandits recruits seven unemployed samurai to help them defend themselves.",
    poster_path: "/t1Z7NFVP1VeyqPmBVhh3fgsJ3ID.jpg",
    backdrop_path: "/b4xZfK2mSuEHvKDkcJi7r9kSFfL.jpg",
    release_date: "1954-04-26",
    vote_average: 8.5,
    vote_count: 3120,
    genre_ids: [28, 18],
    popularity: 21.578,
    adult: false,
    original_language: "ja",
    media_type: "movie",
  },
  {
    id: 76341,
    title: "Mad Max: Fury Road",
    overview:
      "An apocalyptic story set in the furthest reaches of our planet, in a stark desert landscape where humanity is broken, and most everyone is crazed fighting for the necessities of life.",
    poster_path: "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
    backdrop_path: "/nl79FQ8xWZnh5PHOePWH5ottGkZ.jpg",
    release_date: "2015-05-13",
    vote_average: 7.6,
    vote_count: 22780,
    genre_ids: [28, 12, 878, 53],
    popularity: 54.872,
    adult: false,
    original_language: "en",
    media_type: "movie",
  },
];

const mockTVShows = [
  {
    id: 1396,
    name: "Breaking Bad",
    overview:
      "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live, he becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future.",
    poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    first_air_date: "2008-01-20",
    vote_average: 8.9,
    vote_count: 13080,
    genre_ids: [18, 80],
    popularity: 233.387,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 1399,
    name: "Game of Thrones",
    overview:
      "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north.",
    poster_path: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg",
    backdrop_path: "/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
    first_air_date: "2011-04-17",
    vote_average: 8.5,
    vote_count: 22140,
    genre_ids: [10759, 18, 10765],
    popularity: 174.133,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 84958,
    name: "Loki",
    overview:
      "After stealing the Tesseract during the events of 'Avengers: Endgame,' an alternate version of Loki is brought to the mysterious Time Variance Authority.",
    poster_path: "/kEl2t3OhXc3Zb9FBh11AuRgsc3B.jpg",
    backdrop_path: "/kEl2t3OhXc3Zb9FBh11AuRgsc3B.jpg",
    first_air_date: "2021-06-09",
    vote_average: 8.1,
    vote_count: 12340,
    genre_ids: [10765, 18, 10759],
    popularity: 197.765,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 66732,
    name: "Stranger Things",
    overview:
      "When a young boy disappears, his mother, a police chief and his friends must confront terrifying forces in order to get him back.",
    poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdrop_path: "/yN8iiRA9MFcY0FYeMu0jhMOvfqW.jpg",
    first_air_date: "2016-07-15",
    vote_average: 8.6,
    vote_count: 14090,
    genre_ids: [18, 10765, 9648],
    popularity: 177.658,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 94997,
    name: "House of the Dragon",
    overview:
      "The Targaryen dynasty is at the absolute apex of its power with more than 15 dragons under their yoke, but all is not well. The seeds of destruction have already been planted.",
    poster_path: "/z2Pi2LMqkOsCtF8suw0uE0MvrCi.jpg",
    backdrop_path: "/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg",
    first_air_date: "2022-08-21",
    vote_average: 8.3,
    vote_count: 4550,
    genre_ids: [10765, 18, 10759],
    popularity: 143.278,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 100088,
    name: "The Last of Us",
    overview:
      "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.",
    poster_path: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    backdrop_path: "/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    first_air_date: "2023-01-15",
    vote_average: 8.4,
    vote_count: 7890,
    genre_ids: [18, 10765, 10759],
    popularity: 194.571,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 76479,
    name: "The Boys",
    overview:
      "A group of vigilantes known informally as 'The Boys' set out to take down corrupt superheroes with no more than blue-collar grit and a willingness to fight dirty.",
    poster_path: "/mY7SeH4HFFxW1hiI6cWuwVH70OY.jpg",
    backdrop_path: "/mY7SeH4HFFxW1hiI6cWuwVH70OY.jpg",
    first_air_date: "2019-07-25",
    vote_average: 8.5,
    vote_count: 9870,
    genre_ids: [10765, 18, 10759, 35],
    popularity: 186.433,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 93405,
    name: "Squid Game",
    overview:
      "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes: a survival game that has a whopping 45.6 billion-won prize at stake.",
    poster_path: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    backdrop_path: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    first_air_date: "2021-09-17",
    vote_average: 7.8,
    vote_count: 13240,
    genre_ids: [18, 10765, 53],
    popularity: 374.512,
    origin_country: ["KR"],
    original_language: "ko",
    media_type: "tv",
  },
  {
    id: 70523,
    name: "Dark",
    overview:
      "A missing child sets four families on a frenetic hunt for answers as they unearth a mind-bending mystery that spans three generations in the small German town of Winden.",
    poster_path: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    backdrop_path: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    first_air_date: "2017-12-01",
    vote_average: 8.4,
    vote_count: 5120,
    genre_ids: [18, 10765, 9648],
    popularity: 88.123,
    origin_country: ["DE"],
    original_language: "de",
    media_type: "tv",
  },
  {
    id: 71912,
    name: "The Witcher",
    overview:
      "Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world where people often prove more wicked than beasts.",
    poster_path: "/cXUgU4GqIhDZDyOoq6VsKQj5a0R.jpg",
    backdrop_path: "/cXUgU4GqIhDZDyOoq6VsKQj5a0R.jpg",
    first_air_date: "2019-12-20",
    vote_average: 8.1,
    vote_count: 8340,
    genre_ids: [10765, 18, 10759],
    popularity: 159.438,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 70524,
    name: "Peaky Blinders",
    overview:
      "A gangster family epic set in 1900s England, centering on a gang who sew razor blades in the peaks of their caps, and their fierce boss Tommy Shelby.",
    poster_path: "/bG2c1FFR0H8X4EbRR9TSvfFRV4s.jpg",
    backdrop_path: "/bG2c1FFR0H8X4EbRR9TSvfFRV4s.jpg",
    first_air_date: "2013-09-12",
    vote_average: 8.5,
    vote_count: 8790,
    genre_ids: [18, 80],
    popularity: 124.872,
    origin_country: ["GB"],
    original_language: "en",
    media_type: "tv",
  },
  {
    id: 60574,
    name: "Peacemaker",
    overview:
      "The continuing story of Peacemaker \u2013 a compellingly vainglorious man who believes in peace at any cost, no matter how many people he has to kill to get it.",
    poster_path: "/uJ1ElVFMwFhFL1uX3iZxzg9jHSl.jpg",
    backdrop_path: "/uJ1ElVFMwFhFL1uX3iZxzg9jHSl.jpg",
    first_air_date: "2022-01-13",
    vote_average: 7.9,
    vote_count: 3450,
    genre_ids: [10759, 35, 10765],
    popularity: 66.543,
    origin_country: ["US"],
    original_language: "en",
    media_type: "tv",
  },
];

const mockGenres = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

// Shuffle array helper
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getMockData(endpoint: string, params: Record<string, string> = {}): any {
  const page = parseInt(params.page || "1");
  const allContent = [...mockMovies, ...mockTVShows];

  // Trending
  if (endpoint.includes("/trending")) {
    const mediaType = endpoint.includes("/movie")
      ? "movie"
      : endpoint.includes("/tv")
        ? "tv"
        : "all";
    const results =
      mediaType === "movie"
        ? mockMovies
        : mediaType === "tv"
          ? mockTVShows
          : shuffle(allContent);
    return {
      page,
      results: results.slice(0, 20),
      total_pages: 1,
      total_results: results.length,
    };
  }

  // Popular
  if (endpoint.includes("/popular")) {
    const mediaType = endpoint.includes("/tv") ? "tv" : "movie";
    const results = mediaType === "tv" ? shuffle(mockTVShows) : shuffle(mockMovies);
    return {
      page,
      results: results.slice(0, 20),
      total_pages: 1,
      total_results: results.length,
    };
  }

  // Top rated
  if (endpoint.includes("/top_rated")) {
    const mediaType = endpoint.includes("/tv") ? "tv" : "movie";
    const results =
      mediaType === "tv"
        ? [...mockTVShows].sort((a, b) => b.vote_average - a.vote_average)
        : [...mockMovies].sort((a, b) => b.vote_average - a.vote_average);
    return {
      page,
      results: results.slice(0, 20),
      total_pages: 1,
      total_results: results.length,
    };
  }

  // Now playing
  if (endpoint.includes("/now_playing")) {
    return {
      page,
      results: shuffle(mockMovies).slice(0, 20),
      total_pages: 1,
      total_results: mockMovies.length,
    };
  }

  // On the air
  if (endpoint.includes("/on_the_air")) {
    return {
      page,
      results: shuffle(mockTVShows).slice(0, 20),
      total_pages: 1,
      total_results: mockTVShows.length,
    };
  }

  // Upcoming
  if (endpoint.includes("/upcoming")) {
    return {
      page,
      results: shuffle(mockMovies).slice(0, 20),
      total_pages: 1,
      total_results: mockMovies.length,
    };
  }

  // Search
  if (endpoint.includes("/search/")) {
    const query = (params.query || "").toLowerCase();
    if (!query) return { page: 1, results: [], total_pages: 0, total_results: 0 };
    const results = allContent.filter((item) => {
      const title = (item as any).title || (item as any).name || "";
      return title.toLowerCase().includes(query);
    });
    return {
      page,
      results,
      total_pages: 1,
      total_results: results.length,
    };
  }

  // Genres
  if (endpoint.includes("/genre/")) {
    return { genres: mockGenres };
  }

  // Discover
  if (endpoint.includes("/discover/")) {
    const mediaType = endpoint.includes("/tv") ? "tv" : "movie";
    const genreId = params.with_genres ? parseInt(params.with_genres) : null;
    let results = mediaType === "tv" ? [...mockTVShows] : [...mockMovies];
    if (genreId) {
      results = results.filter((item) => item.genre_ids?.includes(genreId));
    }
    return {
      page,
      results: shuffle(results),
      total_pages: 1,
      total_results: results.length,
    };
  }

  // Details
  if (endpoint.match(/\/(movie|tv)\/\d+$/)) {
    const id = parseInt(endpoint.split("/").pop() || "0");
    const isMovie = endpoint.includes("/movie/");
    const item = isMovie
      ? mockMovies.find((m) => m.id === id)
      : mockTVShows.find((t) => t.id === id);

    if (item) {
      return {
        ...item,
        genres: (item.genre_ids || [])
          .map((gid) => mockGenres.find((g) => g.id === gid))
          .filter(Boolean),
        tagline: isMovie ? "An unforgettable experience" : undefined,
        runtime: isMovie ? 148 : undefined,
        number_of_seasons: !isMovie ? 5 : undefined,
        number_of_episodes: !isMovie ? 50 : undefined,
        status: "Released",
        seasons: !isMovie
          ? [
              {
                id: 1,
                name: "Season 1",
                season_number: 1,
                episode_count: 10,
                poster_path: item.poster_path,
                overview: "The beginning of the journey",
                air_date: item.first_air_date,
              },
              {
                id: 2,
                name: "Season 2",
                season_number: 2,
                episode_count: 10,
                poster_path: null,
                overview: "The story continues",
                air_date: "2020-01-01",
              },
              {
                id: 3,
                name: "Season 3",
                season_number: 3,
                episode_count: 10,
                poster_path: null,
                overview: "Things get darker",
                air_date: "2021-01-01",
              },
            ]
          : undefined,
        credits: {
          cast: [
            {
              id: 1,
              name: "Actor One",
              character: "Main Character",
              profile_path: null,
              order: 0,
            },
            {
              id: 2,
              name: "Actor Two",
              character: "Supporting",
              profile_path: null,
              order: 1,
            },
            {
              id: 3,
              name: "Actor Three",
              character: "Antagonist",
              profile_path: null,
              order: 2,
            },
            {
              id: 4,
              name: "Actor Four",
              character: "Mentor",
              profile_path: null,
              order: 3,
            },
            {
              id: 5,
              name: "Actor Five",
              character: "Love Interest",
              profile_path: null,
              order: 4,
            },
          ],
          crew: [
            {
              id: 10,
              name: "Director One",
              job: "Director",
              department: "Directing",
              profile_path: null,
            },
            {
              id: 11,
              name: "Writer One",
              job: "Writer",
              department: "Writing",
              profile_path: null,
            },
          ],
        },
        videos: {
          results: [
            {
              id: "1",
              key: "dQw4w9WgXcQ",
              name: "Official Trailer",
              site: "YouTube",
              type: "Trailer",
              official: true,
            },
          ],
        },
        similar: {
          results: shuffle(allContent).slice(0, 10),
        },
        recommendations: {
          results: shuffle(allContent).slice(0, 10),
        },
      };
    }

    // Return a generic item if not found in mock data
    return {
      id,
      title: isMovie ? "Unknown Movie" : undefined,
      name: !isMovie ? "Unknown TV Show" : undefined,
      overview:
        "Content details are not available in demo mode. Connect a valid TMDB API key to see real content.",
      poster_path: null,
      backdrop_path: null,
      release_date: isMovie ? "2024-01-01" : undefined,
      first_air_date: !isMovie ? "2024-01-01" : undefined,
      vote_average: 7.5,
      vote_count: 1000,
      genres: [{ id: 18, name: "Drama" }],
      tagline: isMovie ? "Demo content" : undefined,
      runtime: isMovie ? 120 : undefined,
      number_of_seasons: !isMovie ? 1 : undefined,
      number_of_episodes: !isMovie ? 10 : undefined,
      status: "Released",
      seasons: !isMovie
        ? [
            {
              id: 1,
              name: "Season 1",
              season_number: 1,
              episode_count: 10,
              poster_path: null,
              overview: "Season 1",
              air_date: "2024-01-01",
            },
          ]
        : undefined,
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      similar: { results: shuffle(allContent).slice(0, 6) },
      recommendations: { results: shuffle(allContent).slice(0, 6) },
    };
  }

  // Default
  return {
    page: 1,
    results: shuffle(allContent).slice(0, 20),
    total_pages: 1,
    total_results: allContent.length,
  };
}
