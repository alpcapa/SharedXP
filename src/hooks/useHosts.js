import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetches active (non-paused) hosts from Supabase.
 * Returns hosts shaped for BuddyCard and recommendations carousels.
 *
 * @param {object} opts
 * @param {string[]} [opts.sports]    Filter to hosts who offer any of these sports (case-insensitive)
 * @param {string}   [opts.excludeId] Exclude a specific user ID (e.g. the profile being viewed)
 */
export const useHosts = ({ sports, excludeId } = {}) => {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from("host_profiles")
      .select(
        `pause_hosting, city, country,
         profile:profiles!user_id(id, full_name, first_name, last_name, photo_url),
         host_sports(sport, pricing, pricing_currency, level, description, about, equipment_available, paused)`
      )
      .eq("pause_hosting", false)
      .then(({ data, error }) => {
        if (cancelled || error || !data) {
          if (!cancelled) setLoading(false);
          return;
        }

        const sportSet =
          Array.isArray(sports) && sports.length > 0
            ? new Set(sports.map((s) => String(s).toLowerCase()))
            : null;

        const mapped = data
          .map((hp) => {
            const profile = hp.profile;
            if (!profile) return null;
            if (excludeId && profile.id === excludeId) return null;

            const activeSports = (hp.host_sports || []).filter((s) => !s.paused);
            if (activeSports.length === 0) return null;

            // When filtering by sport, pick the matching sport as the primary one
            const primarySport = sportSet
              ? activeSports.find((s) => sportSet.has(String(s.sport).toLowerCase())) ?? null
              : activeSports[0];
            if (!primarySport) return null;

            return {
              id: profile.id,
              name:
                profile.full_name ||
                [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                "Host",
              image: profile.photo_url || "",
              city: hp.city || "",
              country: hp.country || "",
              sport: primarySport.sport || "",
              bio: primarySport.description || primarySport.about || "",
              equipmentAvailable: primarySport.equipment_available || false,
              price: primarySport.pricing || 0,
              pricingCurrency: primarySport.pricing_currency || "EUR",
              level: primarySport.level || "",
              rating: null,
              paused: false,
            };
          })
          .filter(Boolean);

        setHosts(mapped);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId, sports?.join(",")]);

  return { hosts, loading };
};
