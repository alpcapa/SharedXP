import { majorEvents as staticEvents } from "../data/majorEvents";
import { supabase } from "./supabase";

const FETCH_LIMIT = 200;

const isUpcomingOrRecent = (event) => {
  const start = new Date(event.startsAt ?? event.starts_at);
  if (Number.isNaN(start.getTime())) return false;
  // keep events that haven't ended more than 7 days ago
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const end = new Date(event.endsAt ?? event.ends_at ?? event.startsAt ?? event.starts_at);
  return (Number.isFinite(end.getTime()) ? end.getTime() : start.getTime()) >= cutoff;
};

const sortByStartAscending = (a, b) => {
  const aStart = new Date(a.startsAt ?? a.starts_at).getTime();
  const bStart = new Date(b.startsAt ?? b.starts_at).getTime();
  return aStart - bStart;
};

const fromSupabaseRow = (row) => ({
  id: String(row.id),
  source: String(row.source ?? ""),
  title: String(row.title ?? ""),
  sport: String(row.sport ?? ""),
  category: String(row.category ?? ""),
  country: String(row.country ?? ""),
  city: String(row.city ?? ""),
  venue: String(row.venue ?? ""),
  startsAt: row.starts_at ?? "",
  endsAt: row.ends_at ?? "",
  url: String(row.url ?? ""),
  imageUrl: String(row.image_url ?? ""),
  description: String(row.description ?? "")
});

// Loads events from Supabase. If the table is empty, missing, or the query
// errors, fall back to the curated static module so the UI always has data.
export const loadMajorEvents = async () => {
  try {
    const { data, error } = await supabase
      .from("external_events")
      .select(
        "id, source, title, sport, category, country, city, venue, starts_at, ends_at, url, image_url, description"
      )
      .order("starts_at", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      return data.map(fromSupabaseRow).filter(isUpcomingOrRecent).sort(sortByStartAscending);
    }
  } catch (error) {
    console.warn("[events] Falling back to static major events:", error?.message ?? error);
  }
  return [...staticEvents].filter(isUpcomingOrRecent).sort(sortByStartAscending);
};

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

const RANGE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

export const formatEventDateRange = (startsAt, endsAt) => {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const end = endsAt ? new Date(endsAt) : null;
  const year = start.getUTCFullYear();
  if (!end || Number.isNaN(end.getTime())) {
    return `${RANGE_FORMAT.format(start)}`;
  }
  const sameDay =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate();
  if (sameDay) {
    return RANGE_FORMAT.format(start);
  }
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameYear) {
    return `${MONTH_FORMAT.format(start)} – ${MONTH_FORMAT.format(end)}, ${year}`;
  }
  return `${RANGE_FORMAT.format(start)} – ${RANGE_FORMAT.format(end)}`;
};
