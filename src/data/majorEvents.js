// Curated list of major sports events worldwide.
//
// This module is the immediate, dependable source the Events UI reads from
// when the Supabase `external_events` table is empty or unreachable. The
// migration `009_external_events.sql` seeds the same rows, and the
// `events-sync` edge function refreshes them daily from free public sources
// (TheSportsDB, OpenF1, Wikidata).
//
// Schema mirrors the `external_events` table so swapping the source is a
// drop-in replacement.

export const MAJOR_EVENTS_SOURCES = [
  { name: "TheSportsDB", url: "https://www.thesportsdb.com" },
  { name: "OpenF1", url: "https://openf1.org" },
  { name: "Wikidata", url: "https://www.wikidata.org" }
];

// Image URLs come from Unsplash (free, attribution-friendly). The IDs marked
// "verified" below are also used in src/data/fieldPosts.js so they're known to
// match their sport. The rest are best-effort and can be swapped if any look
// wrong on the page.
const IMG = {
  // Verified runner photos (also used on The Field).
  running:
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80",
  marathon:
    "https://images.unsplash.com/photo-1549570652-97324981a6fd?auto=format&fit=crop&w=1400&q=80",
  // Verified tennis photo (also used on The Field).
  tennis:
    "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=1400&q=80",
  // Verified cycling photos (also used on The Field).
  cycling:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80",
  cyclingRoad:
    "https://images.unsplash.com/photo-1559348349-86f1f65817fe?auto=format&fit=crop&w=1400&q=80",
  formula1:
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?auto=format&fit=crop&w=1400&q=80",
  football:
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1400&q=80",
  americanFootball:
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1400&q=80",
  golf:
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1400&q=80",
  // Triathlon — use the verified runner photo (Ironman ends with a marathon).
  triathlon:
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80",
  olympicsWinter:
    "https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1400&q=80"
};

// Each event must include a stable `id` (also used as `source_id` when seeded
// into Supabase). Dates are ISO-8601 in UTC. `source` records where the
// canonical record lives so we can refresh it later.
export const majorEvents = [
  // ── Marathons (Abbott World Marathon Majors + popular) ──────────────
  {
    id: "tokyo-marathon-2026",
    source: "wikidata",
    title: "Tokyo Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "Japan",
    city: "Tokyo",
    venue: "Tokyo Metropolitan Government Building",
    startsAt: "2026-03-01T00:00:00Z",
    endsAt: "2026-03-01T23:59:59Z",
    url: "https://www.marathon.tokyo/en/",
    imageUrl: IMG.marathon,
    description:
      "An Abbott World Marathon Majors race. Tokyo's flagship marathon winding through the capital with elite and mass-participation fields."
  },
  {
    id: "boston-marathon-2026",
    source: "wikidata",
    title: "Boston Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "United States",
    city: "Boston",
    venue: "Hopkinton to Boylston Street",
    startsAt: "2026-04-20T00:00:00Z",
    endsAt: "2026-04-20T23:59:59Z",
    url: "https://www.baa.org/races/boston-marathon",
    imageUrl: IMG.marathon,
    description:
      "The world's oldest annual marathon, run on Patriots' Day. A point-to-point course famed for Heartbreak Hill."
  },
  {
    id: "london-marathon-2026",
    source: "wikidata",
    title: "TCS London Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "United Kingdom",
    city: "London",
    venue: "Greenwich to The Mall",
    startsAt: "2026-04-26T00:00:00Z",
    endsAt: "2026-04-26T23:59:59Z",
    url: "https://www.tcslondonmarathon.com/",
    imageUrl: IMG.marathon,
    description:
      "An Abbott World Marathon Majors race past Tower Bridge, the Cutty Sark and Buckingham Palace."
  },
  {
    id: "berlin-marathon-2026",
    source: "wikidata",
    title: "BMW Berlin Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "Germany",
    city: "Berlin",
    venue: "Tiergarten",
    startsAt: "2026-09-27T00:00:00Z",
    endsAt: "2026-09-27T23:59:59Z",
    url: "https://www.bmw-berlin-marathon.com/en/",
    imageUrl: IMG.marathon,
    description:
      "The fastest course on the World Marathon Majors circuit and frequent home of world records."
  },
  {
    id: "chicago-marathon-2026",
    source: "wikidata",
    title: "Chicago Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "United States",
    city: "Chicago",
    venue: "Grant Park",
    startsAt: "2026-10-11T00:00:00Z",
    endsAt: "2026-10-11T23:59:59Z",
    url: "https://www.chicagomarathon.com/",
    imageUrl: IMG.marathon,
    description:
      "A flat, fast loop through 29 Chicago neighborhoods — one of the six Abbott World Marathon Majors."
  },
  {
    id: "nyc-marathon-2026",
    source: "wikidata",
    title: "TCS New York City Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "United States",
    city: "New York",
    venue: "Staten Island to Central Park",
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: "2026-11-01T23:59:59Z",
    url: "https://www.nyrr.org/tcsnycmarathon",
    imageUrl: IMG.marathon,
    description:
      "The world's largest marathon, crossing all five boroughs from the Verrazzano Bridge to Central Park."
  },
  {
    id: "sydney-marathon-2026",
    source: "wikidata",
    title: "Sydney Marathon 2026",
    sport: "Running",
    category: "Marathon",
    country: "Australia",
    city: "Sydney",
    venue: "North Sydney to Sydney Opera House",
    startsAt: "2026-08-30T00:00:00Z",
    endsAt: "2026-08-30T23:59:59Z",
    url: "https://www.sydneymarathon.com/",
    imageUrl: IMG.marathon,
    description:
      "The newest member of the Abbott World Marathon Majors, finishing at the Opera House."
  },
  {
    id: "comrades-marathon-2026",
    source: "wikidata",
    title: "Comrades Marathon 2026",
    sport: "Running",
    category: "Ultramarathon",
    country: "South Africa",
    city: "Durban",
    venue: "Pietermaritzburg ↔ Durban",
    startsAt: "2026-06-14T00:00:00Z",
    endsAt: "2026-06-14T23:59:59Z",
    url: "https://www.comrades.com/",
    imageUrl: IMG.running,
    description:
      "An iconic 87-89 km ultramarathon between Pietermaritzburg and Durban, alternating direction each year."
  },

  // ── Tennis Grand Slams ──────────────────────────────────────────────
  {
    id: "australian-open-2026",
    source: "wikidata",
    title: "Australian Open 2026",
    sport: "Tennis",
    category: "Grand Slam",
    country: "Australia",
    city: "Melbourne",
    venue: "Melbourne Park",
    startsAt: "2026-01-19T00:00:00Z",
    endsAt: "2026-02-01T23:59:59Z",
    url: "https://ausopen.com/",
    imageUrl: IMG.tennis,
    description:
      "The first tennis Grand Slam of the year, played on hard courts at Melbourne Park."
  },
  {
    id: "roland-garros-2026",
    source: "wikidata",
    title: "Roland-Garros 2026 (French Open)",
    sport: "Tennis",
    category: "Grand Slam",
    country: "France",
    city: "Paris",
    venue: "Stade Roland Garros",
    startsAt: "2026-05-25T00:00:00Z",
    endsAt: "2026-06-07T23:59:59Z",
    url: "https://www.rolandgarros.com/",
    imageUrl: IMG.tennis,
    description:
      "The clay-court Grand Slam in Paris — two weeks of grueling baseline tennis at Stade Roland Garros."
  },
  {
    id: "wimbledon-2026",
    source: "wikidata",
    title: "Wimbledon 2026 (The Championships)",
    sport: "Tennis",
    category: "Grand Slam",
    country: "United Kingdom",
    city: "London",
    venue: "All England Lawn Tennis Club",
    startsAt: "2026-06-29T00:00:00Z",
    endsAt: "2026-07-12T23:59:59Z",
    url: "https://www.wimbledon.com/",
    imageUrl: IMG.tennis,
    description:
      "The oldest tennis tournament in the world. Grass courts, white kits and strawberries with cream."
  },
  {
    id: "us-open-tennis-2026",
    source: "wikidata",
    title: "US Open 2026 (Tennis)",
    sport: "Tennis",
    category: "Grand Slam",
    country: "United States",
    city: "New York",
    venue: "USTA Billie Jean King National Tennis Center",
    startsAt: "2026-08-31T00:00:00Z",
    endsAt: "2026-09-13T23:59:59Z",
    url: "https://www.usopen.org/",
    imageUrl: IMG.tennis,
    description:
      "The final Grand Slam of the year — hard courts under the lights of Arthur Ashe Stadium."
  },

  // ── Cycling: Grand Tours + Monuments ────────────────────────────────
  {
    id: "milano-sanremo-2026",
    source: "wikidata",
    title: "Milano-Sanremo 2026",
    sport: "Cycling",
    category: "Monument",
    country: "Italy",
    city: "Sanremo",
    venue: "Milan to Sanremo",
    startsAt: "2026-03-21T00:00:00Z",
    endsAt: "2026-03-21T23:59:59Z",
    url: "https://www.milanosanremo.it/",
    imageUrl: IMG.cyclingRoad,
    description:
      "La Classicissima — the longest one-day pro race, opening the cycling Monument calendar."
  },
  {
    id: "tour-of-flanders-2026",
    source: "wikidata",
    title: "Tour of Flanders 2026",
    sport: "Cycling",
    category: "Monument",
    country: "Belgium",
    city: "Oudenaarde",
    venue: "Antwerp to Oudenaarde",
    startsAt: "2026-04-05T00:00:00Z",
    endsAt: "2026-04-05T23:59:59Z",
    url: "https://www.rondevanvlaanderen.be/",
    imageUrl: IMG.cyclingRoad,
    description:
      "Cobbled climbs through Flanders — De Ronde is the most prestigious one-day race in Belgian cycling."
  },
  {
    id: "paris-roubaix-2026",
    source: "wikidata",
    title: "Paris-Roubaix 2026",
    sport: "Cycling",
    category: "Monument",
    country: "France",
    city: "Roubaix",
    venue: "Compiègne to Roubaix Velodrome",
    startsAt: "2026-04-12T00:00:00Z",
    endsAt: "2026-04-12T23:59:59Z",
    url: "https://www.paris-roubaix.fr/",
    imageUrl: IMG.cyclingRoad,
    description:
      "The Hell of the North — 250+ km over brutal cobbled sectors finishing in the Roubaix velodrome."
  },
  {
    id: "liege-bastogne-liege-2026",
    source: "wikidata",
    title: "Liège-Bastogne-Liège 2026",
    sport: "Cycling",
    category: "Monument",
    country: "Belgium",
    city: "Liège",
    venue: "Liège ↔ Bastogne",
    startsAt: "2026-04-26T00:00:00Z",
    endsAt: "2026-04-26T23:59:59Z",
    url: "https://www.liege-bastogne-liege.be/",
    imageUrl: IMG.cyclingRoad,
    description:
      "La Doyenne — the oldest of the cycling Monuments, raced over the punchy climbs of the Ardennes."
  },
  {
    id: "giro-d-italia-2026",
    source: "wikidata",
    title: "Giro d'Italia 2026",
    sport: "Cycling",
    category: "Grand Tour",
    country: "Italy",
    city: "Multiple",
    venue: "Across Italy",
    startsAt: "2026-05-08T00:00:00Z",
    endsAt: "2026-05-31T23:59:59Z",
    url: "https://www.giroditalia.it/",
    imageUrl: IMG.cyclingRoad,
    description:
      "Three weeks of racing for the Maglia Rosa across Italy's mountains, coastlines and cobbles."
  },
  {
    id: "tour-de-france-2026",
    source: "wikidata",
    title: "Tour de France 2026",
    sport: "Cycling",
    category: "Grand Tour",
    country: "France",
    city: "Multiple",
    venue: "Across France",
    startsAt: "2026-07-04T00:00:00Z",
    endsAt: "2026-07-26T23:59:59Z",
    url: "https://www.letour.fr/",
    imageUrl: IMG.cyclingRoad,
    description:
      "La Grande Boucle — cycling's biggest stage race, finishing on the Champs-Élysées."
  },
  {
    id: "vuelta-a-espana-2026",
    source: "wikidata",
    title: "Vuelta a España 2026",
    sport: "Cycling",
    category: "Grand Tour",
    country: "Spain",
    city: "Multiple",
    venue: "Across Spain",
    startsAt: "2026-08-22T00:00:00Z",
    endsAt: "2026-09-13T23:59:59Z",
    url: "https://www.lavuelta.es/",
    imageUrl: IMG.cyclingRoad,
    description:
      "Three weeks of climbing under the Spanish sun for the red Maillot Rojo."
  },
  {
    id: "il-lombardia-2026",
    source: "wikidata",
    title: "Il Lombardia 2026",
    sport: "Cycling",
    category: "Monument",
    country: "Italy",
    city: "Como",
    venue: "Bergamo to Como (alternates)",
    startsAt: "2026-10-10T00:00:00Z",
    endsAt: "2026-10-10T23:59:59Z",
    url: "https://www.ilombardia.it/",
    imageUrl: IMG.cyclingRoad,
    description:
      "The Race of the Falling Leaves — closing Monument of the season around Lake Como."
  },

  // ── Formula 1 (2026 calendar — provisional dates) ───────────────────
  {
    id: "f1-bahrain-2026",
    source: "openf1",
    title: "Formula 1 Bahrain Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Bahrain",
    city: "Sakhir",
    venue: "Bahrain International Circuit",
    startsAt: "2026-03-08T00:00:00Z",
    endsAt: "2026-03-08T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "Season opener under the desert lights at Sakhir."
  },
  {
    id: "f1-australia-2026",
    source: "openf1",
    title: "Formula 1 Australian Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Australia",
    city: "Melbourne",
    venue: "Albert Park Circuit",
    startsAt: "2026-03-22T00:00:00Z",
    endsAt: "2026-03-22T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "Round through the parklands of Melbourne's Albert Park."
  },
  {
    id: "f1-japan-2026",
    source: "openf1",
    title: "Formula 1 Japanese Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Japan",
    city: "Suzuka",
    venue: "Suzuka International Racing Course",
    startsAt: "2026-04-12T00:00:00Z",
    endsAt: "2026-04-12T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The drivers' favourite — Suzuka's flowing figure-eight layout."
  },
  {
    id: "f1-monaco-2026",
    source: "openf1",
    title: "Formula 1 Monaco Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Monaco",
    city: "Monte Carlo",
    venue: "Circuit de Monaco",
    startsAt: "2026-05-24T00:00:00Z",
    endsAt: "2026-05-24T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The crown jewel of the F1 calendar through the streets of Monte Carlo."
  },
  {
    id: "f1-canada-2026",
    source: "openf1",
    title: "Formula 1 Canadian Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Canada",
    city: "Montreal",
    venue: "Circuit Gilles Villeneuve",
    startsAt: "2026-06-14T00:00:00Z",
    endsAt: "2026-06-14T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "Île Notre-Dame's Wall of Champions makes Montreal a perennial classic."
  },
  {
    id: "f1-britain-2026",
    source: "openf1",
    title: "Formula 1 British Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "United Kingdom",
    city: "Silverstone",
    venue: "Silverstone Circuit",
    startsAt: "2026-07-05T00:00:00Z",
    endsAt: "2026-07-05T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The home of British motorsport — high-speed sweepers at Silverstone."
  },
  {
    id: "f1-belgium-2026",
    source: "openf1",
    title: "Formula 1 Belgian Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Belgium",
    city: "Stavelot",
    venue: "Circuit de Spa-Francorchamps",
    startsAt: "2026-08-30T00:00:00Z",
    endsAt: "2026-08-30T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "Eau Rouge, Raidillon and Ardennes weather make Spa unmistakable."
  },
  {
    id: "f1-italy-2026",
    source: "openf1",
    title: "Formula 1 Italian Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Italy",
    city: "Monza",
    venue: "Autodromo Nazionale Monza",
    startsAt: "2026-09-06T00:00:00Z",
    endsAt: "2026-09-06T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The Temple of Speed — a tifosi-fueled cathedral of slipstreams."
  },
  {
    id: "f1-singapore-2026",
    source: "openf1",
    title: "Formula 1 Singapore Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "Singapore",
    city: "Singapore",
    venue: "Marina Bay Street Circuit",
    startsAt: "2026-09-20T00:00:00Z",
    endsAt: "2026-09-20T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The original night race — a humid 23-corner street circuit around Marina Bay."
  },
  {
    id: "f1-usa-2026",
    source: "openf1",
    title: "Formula 1 United States Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "United States",
    city: "Austin",
    venue: "Circuit of the Americas",
    startsAt: "2026-10-25T00:00:00Z",
    endsAt: "2026-10-25T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "Texan hospitality and a layout inspired by the world's best corners."
  },
  {
    id: "f1-las-vegas-2026",
    source: "openf1",
    title: "Formula 1 Las Vegas Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "United States",
    city: "Las Vegas",
    venue: "Las Vegas Strip Circuit",
    startsAt: "2026-11-21T00:00:00Z",
    endsAt: "2026-11-21T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "A Saturday-night Strip race past the Sphere, Bellagio and Caesars."
  },
  {
    id: "f1-abu-dhabi-2026",
    source: "openf1",
    title: "Formula 1 Abu Dhabi Grand Prix 2026",
    sport: "Formula 1",
    category: "Grand Prix",
    country: "United Arab Emirates",
    city: "Abu Dhabi",
    venue: "Yas Marina Circuit",
    startsAt: "2026-12-06T00:00:00Z",
    endsAt: "2026-12-06T23:59:59Z",
    url: "https://www.formula1.com/en/racing/2026.html",
    imageUrl: IMG.formula1,
    description: "The traditional season finale at Yas Marina — twilight to night under the lights."
  },

  // ── Football / Soccer ───────────────────────────────────────────────
  {
    id: "ucl-final-2026",
    source: "thesportsdb",
    title: "UEFA Champions League Final 2026",
    sport: "Football",
    category: "Cup Final",
    country: "Hungary",
    city: "Budapest",
    venue: "Puskás Aréna",
    startsAt: "2026-05-30T00:00:00Z",
    endsAt: "2026-05-30T23:59:59Z",
    url: "https://www.uefa.com/uefachampionsleague/",
    imageUrl: IMG.football,
    description: "European club football's showpiece final, hosted at the Puskás Aréna."
  },
  {
    id: "fifa-world-cup-2026",
    source: "wikidata",
    title: "FIFA World Cup 2026",
    sport: "Football",
    category: "World Cup",
    country: "United States",
    city: "Multiple",
    venue: "United States, Canada and Mexico",
    startsAt: "2026-06-11T00:00:00Z",
    endsAt: "2026-07-19T23:59:59Z",
    url: "https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026",
    imageUrl: IMG.football,
    description:
      "The first 48-team World Cup, co-hosted by the United States, Canada and Mexico across 16 cities."
  },

  // ── American Football ───────────────────────────────────────────────
  {
    id: "super-bowl-lx",
    source: "wikidata",
    title: "Super Bowl LX",
    sport: "American Football",
    category: "Championship",
    country: "United States",
    city: "Santa Clara",
    venue: "Levi's Stadium",
    startsAt: "2026-02-08T00:00:00Z",
    endsAt: "2026-02-08T23:59:59Z",
    url: "https://www.nfl.com/super-bowl/",
    imageUrl: IMG.americanFootball,
    description: "The 60th edition of the NFL championship game, hosted in the Bay Area."
  },

  // ── Golf ────────────────────────────────────────────────────────────
  {
    id: "the-masters-2026",
    source: "wikidata",
    title: "The Masters 2026",
    sport: "Golf",
    category: "Major",
    country: "United States",
    city: "Augusta",
    venue: "Augusta National Golf Club",
    startsAt: "2026-04-09T00:00:00Z",
    endsAt: "2026-04-12T23:59:59Z",
    url: "https://www.masters.com/",
    imageUrl: IMG.golf,
    description: "Azaleas, Amen Corner and the green jacket — golf's first Major of the year."
  },

  // ── Triathlon ───────────────────────────────────────────────────────
  {
    id: "ironman-kona-2026",
    source: "wikidata",
    title: "Ironman World Championship 2026 (Kona)",
    sport: "Triathlon",
    category: "World Championship",
    country: "United States",
    city: "Kailua-Kona",
    venue: "Kailua-Kona, Hawaii",
    startsAt: "2026-10-10T00:00:00Z",
    endsAt: "2026-10-10T23:59:59Z",
    url: "https://www.ironman.com/",
    imageUrl: IMG.running,
    description: "The full-distance Ironman world title, contested on the Big Island lava fields."
  },

  // ── Olympics ────────────────────────────────────────────────────────
  {
    id: "winter-olympics-2026",
    source: "wikidata",
    title: "Winter Olympics 2026 (Milano-Cortina)",
    sport: "Multi-sport",
    category: "Olympics",
    country: "Italy",
    city: "Milan",
    venue: "Milan and Cortina d'Ampezzo",
    startsAt: "2026-02-06T00:00:00Z",
    endsAt: "2026-02-22T23:59:59Z",
    url: "https://www.olympics.com/en/milano-cortina-2026",
    imageUrl: IMG.olympicsWinter,
    description:
      "The 25th Winter Olympic Games, jointly hosted across Milan and the Italian Alps."
  }
];

export const majorEventSports = [
  "All",
  ...[...new Set(majorEvents.map((event) => event.sport))].sort()
];

export const majorEventCountries = [
  "All",
  ...[...new Set(majorEvents.map((event) => event.country))].sort()
];
