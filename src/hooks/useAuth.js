import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// History stays in localStorage for Phase 1 (moves to DB in Phase 3).
// Keys are scoped to the Supabase user ID to avoid collisions.
const historyKey = (userId) => `sharedxp-history-${userId}`;
const hostHistoryKey = (userId) => `sharedxp-host-history-${userId}`;

const getLocalHistory = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(historyKey(userId)) || "[]");
  } catch {
    return [];
  }
};
const getLocalHostHistory = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(hostHistoryKey(userId)) || "[]");
  } catch {
    return [];
  }
};

const normalizeLanguages = (languages) =>
  Array.from({ length: 4 }, (_, i) =>
    typeof languages?.[i] === "string" ? languages[i].trim() : ""
  );
const normalizeSports = (sports) =>
  Array.from({ length: 4 }, (_, i) =>
    typeof sports?.[i] === "string" ? sports[i].trim() : ""
  );

const inferCityFromAddress = (address) => {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[1] : (parts[0] ?? "");
};

const buildHostProfileObject = (hostProfile, hostSports) => {
  if (!hostProfile) return null;
  return {
    country: hostProfile.country || "",
    city: hostProfile.city || "",
    pauseHosting: hostProfile.pause_hosting || false,
    bankDetailsComplete: hostProfile.bank_details_complete || false,
    sports: (hostSports || []).map((hs) => ({
      sport: hs.sport || "",
      description: hs.description || "",
      about: hs.about || "",
      pricing: hs.pricing || 0,
      pricingCurrency: hs.pricing_currency || "EUR",
      level: hs.level || "",
      paused: hs.paused || false,
      equipmentAvailable: hs.equipment_available || false,
      equipmentDetails: hs.equipment_details || "",
      availability: {
        days: hs.availability_days || [],
        startTime: hs.availability_start_time || "09:00",
        endTime: hs.availability_end_time || "18:00",
      },
      images: (hs.host_sport_images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => img.image_url),
    })),
    stripe: {
      stripeEmail: hostProfile.stripe_email || "",
      accountHolderName: hostProfile.account_holder_name || "",
      citizenIdNumber: hostProfile.citizen_id_number || "",
      taxNumber: hostProfile.tax_number || "",
      bankName: hostProfile.bank_name || "",
      accountNumber: hostProfile.account_number || "",
      routingNumber: hostProfile.routing_number || "",
      payoutCurrency: hostProfile.payout_currency || "EUR",
    },
    consents: {
      agreeTermsAndConditions: hostProfile.agree_terms || false,
      agreePromotionsAndMarketingEmails: hostProfile.agree_promotions || false,
      agreeHostingRelatedEmailsAndCalls: hostProfile.agree_hosting_emails || false,
    },
  };
};

const buildUserObject = (authUser, profile, languages, sports, hostProfile, hostSports) => {
  if (!authUser || !profile) return null;
  return {
    id: authUser.id,
    email: profile.email || authUser.email || "",
    fullName: profile.full_name || "",
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    phone: profile.phone || "",
    phoneCountryCode: profile.phone_country_code || "",
    countryDialCode: profile.country_dial_code || "",
    address: profile.address || "",
    country: profile.country || "",
    city: profile.city || "",
    photo: profile.photo_url || "",
    birthday: profile.birthday || "",
    gender: profile.gender || "",
    languages: normalizeLanguages(
      (languages || []).sort((a, b) => a.position - b.position).map((l) => l.language)
    ),
    sports: normalizeSports(
      (sports || []).sort((a, b) => a.position - b.position).map((s) => s.sport)
    ),
    signedUpAt: profile.signed_up_at || authUser.created_at || new Date().toISOString(),
    isHost: profile.is_host || false,
    hostProfile: buildHostProfileObject(hostProfile, hostSports),
    history: getLocalHistory(authUser.id),
    hostHistory: getLocalHostHistory(authUser.id),
    agreedToTermsAndConditions: profile.agreed_to_terms || false,
    agreedToPromotionsAndMarketingEmails: profile.agreed_to_promotions || false,
  };
};

const fetchUserProfile = async (authUser) => {
  if (!authUser) return null;

  const [profileResult, languagesResult, sportsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).single(),
    supabase.from("user_languages").select("*").eq("user_id", authUser.id).order("position"),
    supabase.from("user_sports").select("*").eq("user_id", authUser.id).order("position"),
  ]);

  const profile = profileResult.data;
  if (!profile) return null;

  let hostProfile = null;
  let hostSports = [];

  if (profile.is_host) {
    const { data: hp } = await supabase
      .from("host_profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .single();

    hostProfile = hp;

    if (hostProfile) {
      const { data: hs } = await supabase
        .from("host_sports")
        .select("*, host_sport_images(*)")
        .eq("host_profile_id", hostProfile.id);
      hostSports = hs || [];
    }
  }

  return buildUserObject(
    authUser,
    profile,
    languagesResult.data || [],
    sportsResult.data || [],
    hostProfile,
    hostSports
  );
};

const upsertLanguagesAndSports = async (userId, languages, sports) => {
  const langRows = normalizeLanguages(languages)
    .map((lang, i) => ({ user_id: userId, language: lang, position: i }))
    .filter((r) => r.language);

  const sportRows = normalizeSports(sports)
    .map((sport, i) => ({ user_id: userId, sport, position: i }))
    .filter((r) => r.sport);

  await Promise.all([
    supabase.from("user_languages").delete().eq("user_id", userId),
    supabase.from("user_sports").delete().eq("user_id", userId),
  ]);

  await Promise.all([
    langRows.length > 0 ? supabase.from("user_languages").insert(langRows) : Promise.resolve(),
    sportRows.length > 0 ? supabase.from("user_sports").insert(sportRows) : Promise.resolve(),
  ]);
};

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = await fetchUserProfile(session.user);
        setCurrentUser(user);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await fetchUserProfile(session.user);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(
    () => ({
      currentUser,
      authLoading,

      onLogout: async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
      },

      onEmailSignUp: async (newUser) => {
        const normalizedEmail = newUser.email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: newUser.password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) return { success: false, message: error.message };
        if (!data.user) return { success: false, message: "Sign up failed." };

        const userId = data.user.id;

        await supabase.from("profiles").upsert({
          id: userId,
          email: normalizedEmail,
          first_name: newUser.firstName || "",
          last_name: newUser.lastName || "",
          full_name:
            newUser.fullName ||
            `${newUser.firstName || ""} ${newUser.lastName || ""}`.trim(),
          phone: newUser.phone || "",
          phone_country_code: newUser.phoneCountryCode || "",
          country_dial_code: newUser.countryDialCode || "",
          address: newUser.address || "",
          country: newUser.country || "",
          city: newUser.city || inferCityFromAddress(newUser.address),
          photo_url: newUser.photo || "",
          birthday: newUser.birthday || "",
          gender: newUser.gender || "",
          is_host: false,
          agreed_to_terms: newUser.agreedToTermsAndConditions || false,
          agreed_to_promotions: newUser.agreedToPromotionsAndMarketingEmails || false,
          signed_up_at: new Date().toISOString(),
        });

        await upsertLanguagesAndSports(userId, newUser.languages, newUser.sports);
        return { success: true };
      },

      onEmailLogin: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) return { success: false, message: "Incorrect email or password." };
        return { success: true };
      },

      onSocialLogin: async (provider) => {
        await supabase.auth.signInWithOAuth({
          provider: provider === "apple" ? "apple" : "google",
          options: { redirectTo: window.location.origin },
        });
      },

      onToggleHost: async () => {
        if (!currentUser) return;

        await supabase.from("profiles").update({ is_host: true }).eq("id", currentUser.id);

        const { data: existing } = await supabase
          .from("host_profiles")
          .select("id")
          .eq("user_id", currentUser.id)
          .single();

        if (!existing) {
          await supabase.from("host_profiles").insert({
            user_id: currentUser.id,
            country: currentUser.country || "",
            city: currentUser.city || inferCityFromAddress(currentUser.address),
          });
        }

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setCurrentUser(await fetchUserProfile(authUser));
      },

      onSaveHostProfile: async (hostProfile) => {
        if (!currentUser) return;

        const { data: savedHostProfile } = await supabase
          .from("host_profiles")
          .upsert(
            {
              user_id: currentUser.id,
              country: hostProfile.country || currentUser.country || "",
              city: hostProfile.city || currentUser.city || "",
              pause_hosting: hostProfile.pauseHosting || false,
              bank_details_complete: hostProfile.bankDetailsComplete || false,
              stripe_email: hostProfile.stripe?.stripeEmail || currentUser.email,
              account_holder_name: hostProfile.stripe?.accountHolderName || "",
              citizen_id_number: hostProfile.stripe?.citizenIdNumber || "",
              tax_number: hostProfile.stripe?.taxNumber || "",
              bank_name: hostProfile.stripe?.bankName || "",
              account_number: hostProfile.stripe?.accountNumber || "",
              routing_number: hostProfile.stripe?.routingNumber || "",
              payout_currency: hostProfile.stripe?.payoutCurrency || "EUR",
              agree_terms: hostProfile.consents?.agreeTermsAndConditions || false,
              agree_promotions: hostProfile.consents?.agreePromotionsAndMarketingEmails || false,
              agree_hosting_emails: hostProfile.consents?.agreeHostingRelatedEmailsAndCalls || false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .select()
          .single();

        if (savedHostProfile && hostProfile.sports?.length > 0) {
          await supabase.from("host_sports").delete().eq("host_profile_id", savedHostProfile.id);

          for (const sportConfig of hostProfile.sports) {
            const { data: savedSport } = await supabase
              .from("host_sports")
              .insert({
                host_profile_id: savedHostProfile.id,
                sport: sportConfig.sport || "",
                description: sportConfig.description || "",
                about: sportConfig.about || "",
                pricing: sportConfig.pricing || 0,
                pricing_currency: sportConfig.pricingCurrency || "EUR",
                level: sportConfig.level || "",
                paused: sportConfig.paused || false,
                equipment_available: sportConfig.equipmentAvailable || false,
                equipment_details: sportConfig.equipmentDetails || "",
                availability_days: sportConfig.availability?.days || [],
                availability_start_time: sportConfig.availability?.startTime || "09:00",
                availability_end_time: sportConfig.availability?.endTime || "18:00",
              })
              .select()
              .single();

            if (savedSport && sportConfig.images?.length > 0) {
              const imageRows = sportConfig.images
                .filter(Boolean)
                .map((url, i) => ({ host_sport_id: savedSport.id, image_url: url, position: i }));
              if (imageRows.length > 0) {
                await supabase.from("host_sport_images").insert(imageRows);
              }
            }
          }
        }

        await supabase.from("profiles").update({ is_host: true }).eq("id", currentUser.id);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setCurrentUser(await fetchUserProfile(authUser));
      },

      onUpdateProfile: async (profileUpdates) => {
        if (!currentUser) {
          return { success: false, message: "Please log in to update your profile." };
        }

        const previousEmail = currentUser.email.trim().toLowerCase();
        const nextEmail = (profileUpdates.email ?? currentUser.email).trim().toLowerCase();
        const nextPhone = (profileUpdates.phone ?? currentUser.phone ?? "").trim();
        const hasCriticalChanges =
          nextEmail !== previousEmail || nextPhone !== (currentUser.phone ?? "").trim();

        if (nextEmail !== previousEmail) {
          const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", nextEmail)
            .neq("id", currentUser.id)
            .maybeSingle();

          if (existing) {
            return { success: false, message: "This email is already in use by another account." };
          }
        }

        const normalizedCity =
          typeof profileUpdates.city === "string"
            ? profileUpdates.city.trim()
            : inferCityFromAddress(profileUpdates.address);

        await supabase
          .from("profiles")
          .update({
            email: nextEmail,
            phone: nextPhone,
            phone_country_code: profileUpdates.phoneCountryCode ?? currentUser.phoneCountryCode ?? "",
            country_dial_code: profileUpdates.countryDialCode ?? currentUser.countryDialCode ?? "",
            address: profileUpdates.address ?? currentUser.address ?? "",
            country: profileUpdates.country ?? currentUser.country ?? "",
            city: normalizedCity || currentUser.city || "",
            photo_url: profileUpdates.photo ?? currentUser.photo ?? "",
            birthday: profileUpdates.birthday ?? currentUser.birthday ?? "",
            gender: profileUpdates.gender ?? currentUser.gender ?? "",
            agreed_to_promotions:
              profileUpdates.agreedToPromotionsAndMarketingEmails ??
              currentUser.agreedToPromotionsAndMarketingEmails ??
              false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);

        if (profileUpdates.languages || profileUpdates.sports) {
          await upsertLanguagesAndSports(
            currentUser.id,
            profileUpdates.languages ?? currentUser.languages,
            profileUpdates.sports ?? currentUser.sports
          );
        }

        if (hasCriticalChanges && nextEmail !== previousEmail) {
          await supabase.auth.updateUser({ email: nextEmail });
        }

        if (hasCriticalChanges) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          return { success: true, requiresReauthentication: true };
        }

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setCurrentUser(await fetchUserProfile(authUser));
        return { success: true, requiresReauthentication: false };
      },

      onSaveHistory: (historyItems) => {
        if (!currentUser) return;
        const items = Array.isArray(historyItems) ? historyItems : [];
        localStorage.setItem(historyKey(currentUser.id), JSON.stringify(items));
        setCurrentUser((prev) => (prev ? { ...prev, history: items } : null));
      },

      onSaveHostHistory: (hostHistoryItems) => {
        if (!currentUser) return;
        const items = Array.isArray(hostHistoryItems) ? hostHistoryItems : [];
        localStorage.setItem(hostHistoryKey(currentUser.id), JSON.stringify(items));
        setCurrentUser((prev) => (prev ? { ...prev, hostHistory: items } : null));
      },
    }),
    [currentUser, authLoading]
  );
};

export default useAuth;
