import { majorEvents as staticEvents } from "../data/majorEvents";
import { supabase } from "./supabase";

const FETCH_LIMIT = 200;

export const isUpcomingOrRecent = (event) => {
  const start = new Date(event.startsAt ?? event.starts_at);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(event.endsAt ?? event.ends_at ?? event.startsAt ?? event.starts_at);
  const lastDay = Number.isFinite(end.getTime()) ? end : start;
  // Expire at 00:00 UTC on the day after the event's last day
  const expiry = Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate() + 1);
  return Date.now() < expiry;
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
  imageStyle: String(row.image_style ?? ""),
  description: String(row.description ?? "")
});

// Loads events from Supabase. If the table is empty, missing, or the query
// errors, fall back to the curated static module so the UI always has data.
export const loadMajorEvents = async () => {
  try {
    const { data, error } = await supabase
      .from("external_events")
      .select(
        "id, source, title, sport, category, country, city, venue, starts_at, ends_at, url, image_url, image_style, description"
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

// Paginated variant for the home page scroll row.
export const loadMajorEventsPage = async ({ limit = 20, offset = 0 } = {}) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from("external_events")
      .select(
        "id, source, title, sport, category, country, city, venue, starts_at, ends_at, url, image_url, image_style, description"
      )
      .gte("starts_at", cutoff)
      .order("starts_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      return {
        events: data.map(fromSupabaseRow).filter(isUpcomingOrRecent),
        hasMore: data.length === limit,
      };
    }
  } catch (err) {
    console.warn("[events] loadMajorEventsPage falling back to static:", err?.message ?? err);
  }
  const staticList = [...staticEvents].filter(isUpcomingOrRecent).sort(sortByStartAscending);
  return {
    events: staticList.slice(offset, offset + limit),
    hasMore: offset + limit < staticList.length,
  };
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
