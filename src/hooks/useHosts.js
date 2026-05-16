import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const useHosts = ({ sports, excludeId } = {}) => {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from("host_profiles")
      .select(
        `pause_hosting, city, country, cancellation_policy,
         profile:profiles!user_id(id, full_name, first_name, last_name, photo_url, gender, birthday),
         host_sports(sport, pricing, pricing_currency, level, description, about, equipment_available, paused)`
      )
      .eq("pause_hosting", false)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[useHosts] fetch error:", error);
          setLoading(false);
          return;
        }
        if (!data) {
          setLoading(false);
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
              gender: profile.gender || "",
              birthday: profile.birthday || "",
              city: hp.city || "",
              country: hp.country || "",
              sports: activeSports,
              // primary-sport shorthands kept for any caller that reads them directly
              sport: primarySport.sport || "",
              equipmentAvailable: primarySport.equipment_available || false,
              price: primarySport.pricing || 0,
              pricingCurrency: primarySport.pricing_currency || "EUR",
              level: primarySport.level || "",
              cancellationPolicy: hp.cancellation_policy || "flexible",
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
