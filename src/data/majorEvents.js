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

// Image URLs come from Unsplash (free, attribution-friendly) and match the
// look of existing imagery in the app.
const IMG = {
  running:
    "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1400&q=80",
  marathon:
    "https://images.unsplash.com/photo-1530143584546-02191bc84eb5?auto=format&fit=crop&w=1400&q=80",
  tennis:
    "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1400&q=80",
  cycling:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80",
  cyclingRoad:
    "https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1400&q=80",
  football:
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1400&q=80",
  americanFootball:
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80",
  golf:
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1400&q=80",
  triathlon:
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80",
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
    imageUrl: "/BerlinMarathon.png",
    imageStyle: "contain",
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
    imageUrl: "/ChicagoMarathon.jpeg",
    imageStyle: "contain",
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
    imageUrl: "/NewYorkMarathon.png",
    imageStyle: "contain",
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
    imageUrl: "/SydneyMarathon.png",
    imageStyle: "contain",
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
    imageUrl: "/Comrades_Marathon_Logo.png",
    imageStyle: "contain",
    description:
      "An iconic 87-89 km ultramarathon between Pietermaritzburg and Durban, alternating direction each year."
  },
  {
    id: "great-north-run-2026",
    source: "manual",
    title: "Great North Run 2026",
    sport: "Running",
    category: "Half Marathon",
    country: "United Kingdom",
    city: "Newcastle",
    venue: "Newcastle to South Shields",
    startsAt: "2026-09-13T09:00:00Z",
    endsAt: "2026-09-13T18:00:00Z",
    url: "https://www.greatrun.org/great-north-run/",
    imageUrl: "/GreatNorthRun.jpeg",
    imageStyle: "contain",
    description: "The world's largest half marathon from Newcastle city centre to South Shields."
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
    imageUrl: "/roland-garros-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/Wimbledon_logo.png",
    imageStyle: "contain",
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
    imageUrl: "/us-open-tennis-logo.svg",
    imageStyle: "contain",
    description:
      "The final Grand Slam of the year — hard courts under the lights of Arthur Ashe Stadium."
  },
  {
    id: "wta-finals-2026",
    source: "manual",
    title: "WTA Finals 2026",
    sport: "Tennis",
    category: "Year-End Championship",
    country: "Saudi Arabia",
    city: "Riyadh",
    venue: "King Saud University Indoor Arena",
    startsAt: "2026-10-25T00:00:00Z",
    endsAt: "2026-11-01T23:59:59Z",
    url: "https://www.wtatennis.com/",
    imageUrl: "/WTAFinals.webp",
    imageStyle: "contain",
    description: "Season-ending championship for the top eight women's singles players and doubles teams."
  },
  {
    id: "atp-finals-2026",
    source: "manual",
    title: "ATP Finals 2026",
    sport: "Tennis",
    category: "Year-End Championship",
    country: "Italy",
    city: "Turin",
    venue: "Pala Alpitour",
    startsAt: "2026-11-09T00:00:00Z",
    endsAt: "2026-11-16T23:59:59Z",
    url: "https://www.atptour.com/en/atp-tour/nitto-atp-finals",
    imageUrl: "/ATPFinals.png",
    imageStyle: "contain",
    description: "Season-ending championship for the top eight ATP singles players of the year."
  },
  {
    id: "davis-cup-finals-2026",
    source: "manual",
    title: "Davis Cup Finals 2026",
    sport: "Tennis",
    category: "Team Competition",
    country: "Spain",
    city: "Malaga",
    venue: "Palacio de Deportes Martin Carpena",
    startsAt: "2026-11-21T00:00:00Z",
    endsAt: "2026-11-29T23:59:59Z",
    url: "https://www.daviscupfinals.com/",
    imageUrl: "/DavisCup.png",
    imageStyle: "contain",
    description: "The World Cup of Tennis — 16 nations compete for the oldest team trophy in the sport."
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
    imageUrl: "/giro-ditalia-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/Tourdefrance_logo.png",
    imageStyle: "contain",
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
    imageUrl: "/vuelta-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/IlLombardia.png",
    imageStyle: "contain",
    description:
      "The Race of the Falling Leaves — closing Monument of the season around Lake Como."
  },
  {
    id: "giro-ditalia-women-2026",
    source: "manual",
    title: "Giro d'Italia Women 2026",
    sport: "Cycling",
    category: "Stage Race",
    country: "Italy",
    city: "Multiple",
    venue: "Across Italy",
    startsAt: "2026-05-30T00:00:00Z",
    endsAt: "2026-06-07T23:59:59Z",
    url: "https://www.giroditalia.it/",
    description: "The premier women's stage race in cycling, riding the same iconic Italian roads as the men's Giro."
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/f1-logo.svg",
    imageStyle: "contain",
    description: "The traditional season finale at Yas Marina — twilight to night under the lights."
  },

  // ── Football / Soccer ───────────────────────────────────────────────
  {
    id: "uefa-europa-league-final-2026",
    source: "manual",
    title: "UEFA Europa League Final 2026",
    sport: "Football",
    category: "Cup Final",
    country: "Turkey",
    city: "Istanbul",
    venue: "Beşiktaş Park",
    startsAt: "2026-05-20T19:00:00Z",
    endsAt: "2026-05-20T21:00:00Z",
    url: "https://www.uefa.com/uefaeuropaleague/",
    imageUrl: "/EuropaCupFinal.jpeg",
    imageStyle: "contain",
    description: "The final of UEFA's second-tier European club competition."
  },
  {
    id: "uefa-womens-cl-final-2026",
    source: "manual",
    title: "UEFA Women's Champions League Final 2026",
    sport: "Football",
    category: "Cup Final",
    country: "TBD",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-05-23T17:00:00Z",
    endsAt: "2026-05-23T19:00:00Z",
    url: "https://www.uefa.com/womenschampionsleague/",
    description: "The showpiece final of European women's club football."
  },
  {
    id: "uefa-conference-league-final-2026",
    source: "manual",
    title: "UEFA Conference League Final 2026",
    sport: "Football",
    category: "Cup Final",
    country: "TBD",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-05-27T19:00:00Z",
    endsAt: "2026-05-27T21:00:00Z",
    url: "https://www.uefa.com/uefaconferenceleague/",
    description: "The final of UEFA's third-tier European club competition."
  },
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
    imageUrl: "/ucl-logo.svg",
    imageStyle: "contain",
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
    imageUrl: "/fifa-worldcup-2026-logo.png",
    imageStyle: "contain",
    description:
      "The first 48-team World Cup, co-hosted by the United States, Canada and Mexico across 16 cities."
  },
  {
    id: "copa-libertadores-final-2026",
    source: "manual",
    title: "Copa Libertadores Final 2026",
    sport: "Football",
    category: "Club Final",
    country: "South America",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-11-07T21:00:00Z",
    endsAt: "2026-11-07T23:00:00Z",
    url: "https://www.conmebol.com/",
    imageUrl: "/CopaLibertadores.png",
    imageStyle: "contain",
    description: "The final of South America's premier club football competition."
  },

  // ── Basketball ──────────────────────────────────────────────────────
  {
    id: "euroleague-final-four-2026",
    source: "manual",
    title: "EuroLeague Final Four 2026",
    sport: "Basketball",
    category: "Championship",
    country: "TBD",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-05-22T00:00:00Z",
    endsAt: "2026-05-24T23:59:59Z",
    url: "https://www.euroleague.net/",
    description: "The season-ending Final Four of Europe's premier basketball club competition."
  },
  {
    id: "nba-finals-2026",
    source: "manual",
    title: "NBA Finals 2026",
    sport: "Basketball",
    category: "Championship",
    country: "United States",
    city: "Multiple",
    venue: "TBD",
    startsAt: "2026-06-04T00:00:00Z",
    endsAt: "2026-06-21T23:59:59Z",
    url: "https://www.nba.com/",
    imageUrl: "/NbaFinals.png",
    imageStyle: "contain",
    description: "The best-of-seven championship series of the National Basketball Association."
  },

  // ── Rugby ───────────────────────────────────────────────────────────
  {
    id: "european-rugby-champions-cup-final-2026",
    source: "manual",
    title: "European Rugby Champions Cup Final 2026",
    sport: "Rugby Union",
    category: "Cup Final",
    country: "TBD",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-05-23T15:00:00Z",
    endsAt: "2026-05-23T17:00:00Z",
    url: "https://www.epcrugby.com/champions-cup/",
    description: "The final of Europe's premier club rugby union competition."
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
  {
    id: "us-open-golf-2026",
    source: "manual",
    title: "US Open Golf 2026",
    sport: "Golf",
    category: "Major",
    country: "United States",
    city: "TBD",
    venue: "TBD",
    startsAt: "2026-06-18T00:00:00Z",
    endsAt: "2026-06-21T23:59:59Z",
    url: "https://www.usopen.com/",
    imageUrl: "/USOpen.png",
    imageStyle: "contain",
    description: "The third golf major of the year — one of the toughest tests in championship golf."
  },

  // ── Motorsport (MotoGP / Endurance) ────────────────────────────────
  {
    id: "motogp-hungarian-gp-2026",
    source: "manual",
    title: "Hungarian Motorcycle Grand Prix 2026",
    sport: "Motorcycle Racing",
    category: "MotoGP",
    country: "Hungary",
    city: "Budapest",
    venue: "Hungaroring",
    startsAt: "2026-06-07T13:00:00Z",
    endsAt: "2026-06-07T15:00:00Z",
    url: "https://www.motogp.com/",
    description: "Round 8 of the MotoGP World Championship at the Hungaroring."
  },
  {
    id: "le-mans-24h-2026",
    source: "manual",
    title: "24 Hours of Le Mans 2026",
    sport: "Endurance Racing",
    category: "WEC",
    country: "France",
    city: "Le Mans",
    venue: "Circuit de la Sarthe",
    startsAt: "2026-06-13T10:00:00Z",
    endsAt: "2026-06-14T10:00:00Z",
    url: "https://www.lemans.org/",
    description: "The world's oldest active sports car endurance race — 24 hours at the Circuit de la Sarthe."
  },
  {
    id: "motogp-czech-gp-2026",
    source: "manual",
    title: "Czech Republic Motorcycle Grand Prix 2026",
    sport: "Motorcycle Racing",
    category: "MotoGP",
    country: "Czech Republic",
    city: "Brno",
    venue: "Automotodrom Brno",
    startsAt: "2026-06-21T13:00:00Z",
    endsAt: "2026-06-21T15:00:00Z",
    url: "https://www.motogp.com/",
    description: "Round 9 of the MotoGP World Championship at Automotodrom Brno."
  },
  {
    id: "motogp-dutch-tt-2026",
    source: "manual",
    title: "Dutch TT 2026",
    sport: "Motorcycle Racing",
    category: "MotoGP",
    country: "Netherlands",
    city: "Assen",
    venue: "TT Circuit Assen",
    startsAt: "2026-06-28T13:00:00Z",
    endsAt: "2026-06-28T15:00:00Z",
    url: "https://www.motogp.com/",
    description: "Round 10 of the MotoGP World Championship — the Cathedral of Motorsport at Assen."
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
    imageUrl: "/IronmanKona.png",
    imageStyle: "contain",
    description: "The full-distance Ironman world title, contested on the Big Island lava fields."
  },
  {
    id: "ironman-european-2026",
    source: "manual",
    title: "Ironman European Championship 2026",
    sport: "Triathlon",
    category: "World Championship Series",
    country: "Germany",
    city: "Frankfurt",
    venue: "Frankfurt am Main",
    startsAt: "2026-06-28T06:00:00Z",
    endsAt: "2026-06-28T23:59:59Z",
    url: "https://www.ironman.com/",
    description: "The European Championship of full-distance triathlon held in Frankfurt."
  },

  // ── Archery ─────────────────────────────────────────────────────────
  {
    id: "european-archery-championships-2026",
    source: "manual",
    title: "European Archery Championships 2026",
    sport: "Archery",
    category: "Continental Championship",
    country: "Turkey",
    city: "Antalya",
    venue: "",
    startsAt: "2026-05-18T00:00:00Z",
    endsAt: "2026-05-24T23:59:59Z",
    url: "https://www.worldarchery.sport/",
    imageUrl: "/EuropeanArchery.png",
    imageStyle: "contain",
    description: "The biennial continental championship for European archery nations."
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
