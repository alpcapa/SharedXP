import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Generate upcoming dates for the given availability day names (e.g. ["Mon","Wed"])
// within the next 90 days, returning at most 12 date strings (YYYY-MM-DD).
const generateAvailableDates = (availabilityDays) => {
  if (!Array.isArray(availabilityDays) || availabilityDays.length === 0) return [];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const targetDays = new Set(
    availabilityDays.map((d) => DAY_NAMES.indexOf(d)).filter((i) => i !== -1)
  );
  if (targetDays.size === 0) return [];
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= 90 && dates.length < 12; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (targetDays.has(date.getDay())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
  }
  return dates;
};

// Generate hourly time slots between startTime ("HH:MM") and endTime ("HH:MM").
const generateAvailableTimes = (startTime, endTime) => {
  const [startH = 9] = (startTime || "09:00").split(":").map(Number);
  const [endH = 18] = (endTime || "18:00").split(":").map(Number);
  const times = [];
  for (let h = startH; h <= endH; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
  }
  return times.length > 0 ? times : ["09:00"];
};

// Map a host_profiles row (with nested relations) to the buddy-shaped object
// that the rest of the app expects.
export const mapHostToBuddy = (hp) => {
  const profile = hp.profiles;
  if (!profile) return null;

  const sports = (hp.host_sports || [])
    .filter((s) => !s.paused)
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const primary = sports[0];

  return {
    id: hp.id,
    userId: profile.id,
    name: profile.first_name || (profile.full_name || "").split(" ")[0] || "Host",
    fullName: profile.full_name || "",
    email: profile.email || "",
    sport: primary?.sport || "",
    gender: profile.gender || "",
    bio: primary?.description || primary?.about || "",
    equipmentAvailable: primary?.equipment_available ?? false,
    price: primary?.pricing ?? 0,
    pricingCurrency: primary?.pricing_currency || "EUR",
    priceUnit: "per session",
    rating: 0,
    reviewCount: 0,
    image: profile.photo_url || "",
    location: [hp.city, hp.country].filter(Boolean).join(", "),
    city: hp.city || "",
    country: hp.country || "",
    coordinates:
      hp.latitude != null && hp.longitude != null
        ? { lat: hp.latitude, lng: hp.longitude }
        : null,
    memberSince: profile.signed_up_at
      ? String(new Date(profile.signed_up_at).getFullYear())
      : "",
    signedUpAt: profile.signed_up_at || "",
    level: primary?.level || "",
    language: "",
    languages: [],
    about: primary?.about || "",
    gallery: sports.flatMap((s) =>
      (s.host_sport_images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => img.image_url)
    ),
    availableDates: primary ? generateAvailableDates(primary.availability_days) : [],
    availableTimes: primary
      ? generateAvailableTimes(primary.availability_start_time, primary.availability_end_time)
      : [],
    sports: sports.map((s) => ({
      sport: s.sport || "",
      description: s.description || "",
      about: s.about || "",
      pricing: s.pricing ?? 0,
      pricingCurrency: s.pricing_currency || "EUR",
      level: s.level || "",
      equipmentAvailable: s.equipment_available ?? false,
      equipmentDetails: s.equipment_details || "",
      availability: {
        days: s.availability_days || [],
        startTime: s.availability_start_time || "09:00",
        endTime: s.availability_end_time || "18:00",
      },
      images: (s.host_sport_images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => img.image_url),
      availableDates: generateAvailableDates(s.availability_days),
      availableTimes: generateAvailableTimes(
        s.availability_start_time,
        s.availability_end_time
      ),
    })),
    reviews: [],
  };
};

const HOST_SELECT = `
  id, country, city, latitude, longitude, pause_hosting,
  profiles!user_id (id, email, full_name, first_name, photo_url, gender, signed_up_at),
  host_sports (
    id, sport, description, about, pricing, pricing_currency, level,
    paused, equipment_available, equipment_details,
    availability_days, availability_start_time, availability_end_time,
    host_sport_images (id, image_url, position)
  )
`.trim();

// Fetch all active (non-paused) host profiles from Supabase.
export const fetchAllHosts = async () => {
  const { data, error } = await supabase
    .from("host_profiles")
    .select(HOST_SELECT)
    .eq("pause_hosting", false);
  if (error) throw error;
  return (data || []).map(mapHostToBuddy).filter(Boolean);
};

// Fetch a single host profile by its host_profiles.id (UUID).
export const fetchHost = async (hostId) => {
  const { data, error } = await supabase
    .from("host_profiles")
    .select(HOST_SELECT)
    .eq("id", hostId)
    .single();
  if (error) throw error;
  return data ? mapHostToBuddy(data) : null;
};

// Hook: returns all active hosts plus loading/error state.
const useHosts = () => {
  const [hosts, setHosts] = useState([]);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [hostsError, setHostsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllHosts()
      .then((mapped) => {
        if (!cancelled) {
          setHosts(mapped);
          setHostsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHostsError(err.message || "Failed to load hosts.");
          setHostsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { hosts, hostsLoading, hostsError };
};

export default useHosts;
