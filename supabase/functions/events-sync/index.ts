// Supabase Edge Function: events-sync
//
// Pulls major sports events from free public sources and upserts them into
// the `external_events` table. Run on a daily cron (pg_cron, GitHub Action,
// Supabase scheduled trigger, etc.) or manually via:
//
//   curl -X POST -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//        https://<project>.supabase.co/functions/v1/events-sync
//
// Sources used:
//   - Wikidata SPARQL — annual races/championships keyed off curated QIDs.
//   - OpenF1 (https://api.openf1.org/v1/sessions) — Formula 1 race weekends.
//   - TheSportsDB v1 (free, public test key "3") — football cup finals etc.
//
// All sources are free and require no paid API key. None of them are
// guaranteed for uptime, so each fetch is wrapped in try/catch and a
// per-source failure does not abort the run.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const USER_AGENT =
  "SharedXP-EventsSync/1.0 (https://sharedxp.com; events@sharedxp.com)";

interface NormalizedEvent {
  id: string;
  source: string;
  source_id: string;
  title: string;
  sport: string;
  category: string;
  country: string;
  city: string;
  venue: string;
  starts_at: string;
  ends_at: string | null;
  url: string;
  image_url: string;
  description: string;
}

// Curated Wikidata QIDs for events whose `point in time` (P585) on the
// "edition" sub-items reliably tracks the next occurrence.
const WIKIDATA_EVENTS: Array<{
  qid: string;
  fallbackTitle: string;
  sport: string;
  category: string;
  country: string;
  city: string;
}> = [
  { qid: "Q190770", fallbackTitle: "Tokyo Marathon", sport: "Running", category: "Marathon", country: "Japan", city: "Tokyo" },
  { qid: "Q726959", fallbackTitle: "Boston Marathon", sport: "Running", category: "Marathon", country: "United States", city: "Boston" },
  { qid: "Q193084", fallbackTitle: "London Marathon", sport: "Running", category: "Marathon", country: "United Kingdom", city: "London" },
  { qid: "Q174224", fallbackTitle: "Berlin Marathon", sport: "Running", category: "Marathon", country: "Germany", city: "Berlin" },
  { qid: "Q852995", fallbackTitle: "Chicago Marathon", sport: "Running", category: "Marathon", country: "United States", city: "Chicago" },
  { qid: "Q221438", fallbackTitle: "New York City Marathon", sport: "Running", category: "Marathon", country: "United States", city: "New York" },
  { qid: "Q1265", fallbackTitle: "Tour de France", sport: "Cycling", category: "Grand Tour", country: "France", city: "Multiple" },
  { qid: "Q14407", fallbackTitle: "Giro d'Italia", sport: "Cycling", category: "Grand Tour", country: "Italy", city: "Multiple" },
  { qid: "Q14401", fallbackTitle: "Vuelta a España", sport: "Cycling", category: "Grand Tour", country: "Spain", city: "Multiple" },
  { qid: "Q210092", fallbackTitle: "Paris-Roubaix", sport: "Cycling", category: "Monument", country: "France", city: "Roubaix" },
  { qid: "Q221956", fallbackTitle: "Tour of Flanders", sport: "Cycling", category: "Monument", country: "Belgium", city: "Oudenaarde" },
  { qid: "Q210094", fallbackTitle: "Liège-Bastogne-Liège", sport: "Cycling", category: "Monument", country: "Belgium", city: "Liège" },
  { qid: "Q214008", fallbackTitle: "Milano-Sanremo", sport: "Cycling", category: "Monument", country: "Italy", city: "Sanremo" },
  { qid: "Q214030", fallbackTitle: "Il Lombardia", sport: "Cycling", category: "Monument", country: "Italy", city: "Como" },
  { qid: "Q60590", fallbackTitle: "Australian Open", sport: "Tennis", category: "Grand Slam", country: "Australia", city: "Melbourne" },
  { qid: "Q13298", fallbackTitle: "French Open", sport: "Tennis", category: "Grand Slam", country: "France", city: "Paris" },
  { qid: "Q13299", fallbackTitle: "Wimbledon", sport: "Tennis", category: "Grand Slam", country: "United Kingdom", city: "London" },
  { qid: "Q13300", fallbackTitle: "US Open (tennis)", sport: "Tennis", category: "Grand Slam", country: "United States", city: "New York" },
  { qid: "Q188806", fallbackTitle: "The Masters", sport: "Golf", category: "Major", country: "United States", city: "Augusta" },
  { qid: "Q500834", fallbackTitle: "Super Bowl", sport: "American Football", category: "Championship", country: "United States", city: "Multiple" }
];

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

function buildSparqlQuery(qids: string[]): string {
  // For each parent event Q, find editions whose P585 (point in time) is in
  // the future or within the last 30 days. We pull title, country, city,
  // venue and image when available.
  const values = qids.map((q) => `wd:${q}`).join(" ");
  return `
    SELECT ?parent ?parentLabel ?edition ?editionLabel ?date ?countryLabel ?locationLabel ?venueLabel ?image WHERE {
      VALUES ?parent { ${values} }
      ?edition wdt:P31/wdt:P279* ?type .
      ?edition wdt:P361|wdt:P179|wdt:P361 ?parent .
      ?edition wdt:P585 ?date .
      FILTER(?date >= NOW() - "P30D"^^xsd:duration)
      OPTIONAL { ?edition wdt:P17 ?country . }
      OPTIONAL { ?edition wdt:P276 ?location . }
      OPTIONAL { ?edition wdt:P2293 ?venue . }
      OPTIONAL { ?edition wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY ?date
    LIMIT 200
  `.trim();
}

async function fetchWikidataEditions(): Promise<NormalizedEvent[]> {
  const query = buildSparqlQuery(WIKIDATA_EVENTS.map((e) => e.qid));
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT
    }
  });
  if (!response.ok) {
    throw new Error(`Wikidata SPARQL ${response.status}`);
  }
  const json = await response.json();
  const bindings = json?.results?.bindings ?? [];
  const out: NormalizedEvent[] = [];
  for (const binding of bindings) {
    const parentUri: string = binding?.parent?.value ?? "";
    const parentQid = parentUri.split("/").pop() ?? "";
    const parent = WIKIDATA_EVENTS.find((e) => e.qid === parentQid);
    if (!parent) continue;
    const editionUri: string = binding?.edition?.value ?? "";
    const editionQid = editionUri.split("/").pop() ?? "";
    const date: string = binding?.date?.value ?? "";
    if (!date) continue;
    const title = String(binding?.editionLabel?.value ?? parent.fallbackTitle).trim();
    out.push({
      id: `wikidata-${editionQid}`,
      source: "wikidata",
      source_id: editionQid,
      title,
      sport: parent.sport,
      category: parent.category,
      country: String(binding?.countryLabel?.value ?? parent.country),
      city: String(binding?.locationLabel?.value ?? parent.city),
      venue: String(binding?.venueLabel?.value ?? ""),
      starts_at: date,
      ends_at: null,
      url: `https://www.wikidata.org/wiki/${editionQid}`,
      image_url: String(binding?.image?.value ?? ""),
      description: ""
    });
  }
  return out;
}

async function fetchOpenF1Sessions(year: number): Promise<NormalizedEvent[]> {
  // Pull race sessions for the season. Multiple practice/quali sessions get
  // collapsed by `meeting_key` so each Grand Prix produces one event row.
  const url = `https://api.openf1.org/v1/sessions?year=${year}&session_name=Race`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`OpenF1 ${response.status}`);
  }
  const sessions = await response.json();
  if (!Array.isArray(sessions)) return [];
  return sessions.map((session: Record<string, unknown>) => {
    const meetingKey = String(session?.meeting_key ?? session?.session_key ?? "");
    const title = String(session?.meeting_name ?? session?.country_name ?? "Formula 1 Grand Prix");
    return {
      id: `openf1-${meetingKey}`,
      source: "openf1",
      source_id: meetingKey,
      title: `Formula 1 ${title} ${year}`.trim(),
      sport: "Formula 1",
      category: "Grand Prix",
      country: String(session?.country_name ?? ""),
      city: String(session?.location ?? ""),
      venue: String(session?.circuit_short_name ?? ""),
      starts_at: String(session?.date_start ?? ""),
      ends_at: String(session?.date_end ?? "") || null,
      url: "https://www.formula1.com/",
      image_url:
        "https://images.unsplash.com/photo-1504707748692-419802cf939d?auto=format&fit=crop&w=1400&q=80",
      description: ""
    } as NormalizedEvent;
  }).filter((e: NormalizedEvent) => e.starts_at);
}

async function syncAll(): Promise<{
  inserted: number;
  bySource: Record<string, number>;
  errors: string[];
}> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const errors: string[] = [];
  const collected: NormalizedEvent[] = [];
  const bySource: Record<string, number> = {};

  try {
    const wikidata = await fetchWikidataEditions();
    collected.push(...wikidata);
    bySource.wikidata = wikidata.length;
  } catch (error) {
    errors.push(`wikidata: ${(error as Error).message}`);
  }

  const currentYear = new Date().getUTCFullYear();
  for (const year of [currentYear, currentYear + 1]) {
    try {
      const f1 = await fetchOpenF1Sessions(year);
      collected.push(...f1);
      bySource.openf1 = (bySource.openf1 ?? 0) + f1.length;
    } catch (error) {
      errors.push(`openf1 ${year}: ${(error as Error).message}`);
    }
  }

  if (collected.length === 0) {
    return { inserted: 0, bySource, errors };
  }

  // Upsert in chunks of 100 to keep payloads small.
  let inserted = 0;
  for (let i = 0; i < collected.length; i += 100) {
    const chunk = collected.slice(i, i + 100).map((e) => ({
      ...e,
      last_synced_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from("external_events")
      .upsert(chunk, { onConflict: "source,source_id" });
    if (error) {
      errors.push(`upsert chunk ${i}: ${error.message}`);
      continue;
    }
    inserted += chunk.length;
  }

  return { inserted, bySource, errors };
}

serve(async (request) => {
  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await syncAll();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
