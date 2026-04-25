import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const PENDING_PROFILE_KEY = "sharedxp-pending-profile";

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
  if (!authUser) return null;
  const p = profile || {};
  return {
    id: authUser.id,
    email: p.email || authUser.email || "",
    fullName: p.full_name || "",
    firstName: p.first_name || "",
    lastName: p.last_name || "",
    phone: p.phone || "",
    phoneCountryCode: p.phone_country_code || "",
    countryDialCode: p.country_dial_code || "",
    address: p.address || "",
    country: p.country || "",
    city: p.city || "",
    photo: p.photo_url || "",
    birthday: p.birthday || "",
    gender: p.gender || "",
    languages: normalizeLanguages(
      (languages || []).sort((a, b) => a.position - b.position).map((l) => l.language)
    ),
    sports: normalizeSports(
      (sports || []).sort((a, b) => a.position - b.position).map((s) => s.sport)
    ),
    signedUpAt: p.signed_up_at || authUser.created_at || new Date().toISOString(),
    isHost: p.is_host || false,
    hostProfile: buildHostProfileObject(hostProfile, hostSports),
    history: getLocalHistory(authUser.id),
    hostHistory: getLocalHostHistory(authUser.id),
    agreedToTermsAndConditions: p.agreed_to_terms || false,
    agreedToPromotionsAndMarketingEmails: p.agreed_to_promotions || false,
  };
};

// Returns a fully-assembled user object, or null when the profiles row is
// missing (e.g. the pending profile hasn't been upserted yet after email
// confirmation, or the user has no profile row in the database).
const fetchUserProfile = async (authUser) => {
  if (!authUser) return null;

  const [profileResult, languagesResult, sportsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).single(),
    supabase.from("user_languages").select("*").eq("user_id", authUser.id).order("position").catch(() => ({ data: [] })),
    supabase.from("user_sports").select("*").eq("user_id", authUser.id).order("position").catch(() => ({ data: [] })),
  ]);

  const profile = profileResult.data;
  if (!profile) {
    console.error("[useAuth] fetchUserProfile: no profile row found for", authUser.id, profileResult.error);
    // Return minimal user from auth data so login still shows the user as logged in
    // even when the DB query is blocked (e.g. RLS misconfiguration).
    return buildUserObject(authUser, { email: authUser.email }, [], [], null, null);
  }

  let hostProfile = null;
  let hostSports = [];

  if (profile.is_host) {
    try {
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
    } catch (e) {
      console.error("Failed to fetch host profile:", e);
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

  const [langResult, sportResult] = await Promise.all([
    langRows.length > 0 ? supabase.from("user_languages").insert(langRows) : Promise.resolve({ error: null }),
    sportRows.length > 0 ? supabase.from("user_sports").insert(sportRows) : Promise.resolve({ error: null }),
  ]);
  if (langResult?.error) console.error("Failed to insert languages:", langResult.error);
  if (sportResult?.error) console.error("Failed to insert sports:", sportResult.error);
};

// Shared promise used to coordinate concurrent callers of applyPendingProfile.
// When getSession and onAuthStateChange both fire at the same time (e.g. right
// after email confirmation), only the first caller performs the DB upsert.  The
// second caller awaits this promise so it too blocks until the upsert is
// committed, ensuring fetchUserProfile always reads the fully-populated row.
//
// The promise is assigned BEFORE any `await` in _doApplyPendingProfile (the
// synchronous JS execution up to the first await runs inline when the async
// function is called), so concurrent callers always see it set.
let _applyPendingProfilePromise = null;

// Inner implementation — separated so _applyPendingProfilePromise can be
// assigned synchronously before any await inside this function runs.
const _doApplyPendingProfile = async (authUser) => {
  // Step 1: try localStorage (synchronous — works when confirmation happens in
  // the same browser where sign-up occurred).
  const pendingRaw = localStorage.getItem(PENDING_PROFILE_KEY);
  let pending = null;

  if (pendingRaw) {
    try {
      const parsed = JSON.parse(pendingRaw);
      if (parsed?.email === authUser.email) {
        pending = parsed;
        // Claim synchronously before any await so no concurrent caller can
        // also pick this up.
        localStorage.removeItem(PENDING_PROFILE_KEY);
      }
    } catch {
      localStorage.removeItem(PENDING_PROFILE_KEY);
    }
  }

  // Step 2: fall back to user_metadata stored at sign-up time.  This is the
  // most reliable cross-browser source: it lives in the Supabase auth user
  // record, is included in the session object, and requires no localStorage
  // or extra network request — works in WKWebView, SFSafariViewController,
  // and any other isolated browser context.
  if (!pending) {
    const meta = authUser.user_metadata?.sharedxp_pending_profile;
    if (meta) {
      pending = { ...meta, email: authUser.email };
    }
  }

  // Step 3: fall back to the Supabase pending_profiles table (legacy fallback
  // for accounts created before user_metadata was used, or when it was not set).
  if (!pending) {
    try {
      const { data: row } = await supabase
        .from("pending_profiles")
        .select("data")
        .eq("email", authUser.email)
        .maybeSingle();
      if (row?.data) pending = { ...row.data, email: authUser.email };
    } catch {
      // Table may not exist in older deployments — non-fatal.
    }
  }

  if (!pending) return;

  // Step 4: upsert the full profile into the profiles table.
  try {
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: authUser.id,
      email: pending.email,
      first_name: pending.firstName || "",
      last_name: pending.lastName || "",
      full_name:
        pending.fullName ||
        `${pending.firstName || ""} ${pending.lastName || ""}`.trim(),
      phone: pending.phone || "",
      phone_country_code: pending.phoneCountryCode || "",
      country_dial_code: pending.countryDialCode || "",
      address: pending.address || "",
      country: pending.country || "",
      city: pending.city || "",
      photo_url: pending.photo || "",
      birthday: pending.birthday || "",
      gender: pending.gender || "",
      is_host: false,
      agreed_to_terms: pending.agreedToTermsAndConditions || false,
      agreed_to_promotions: pending.agreedToPromotionsAndMarketingEmails || false,
      signed_up_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;
    await upsertLanguagesAndSports(authUser.id, pending.languages, pending.sports);
    // Clean up the Supabase pending row after a successful upsert.
    supabase.from("pending_profiles").delete().eq("email", authUser.email).catch((e) => {
      console.error("Failed to delete pending_profiles row:", e);
    });
  } catch (e) {
    console.error("Failed to save pending profile:", e);
    // Restore localStorage so the next sign-in can retry.
    if (pendingRaw) {
      try {
        localStorage.setItem(PENDING_PROFILE_KEY, pendingRaw);
      } catch {
        // localStorage quota exceeded – profile data is unfortunately lost
      }
    }
  }
};

// Upserts the pending profile (saved during sign-up) for the confirmed auth user.
// Coordinates concurrent callers (getSession + onAuthStateChange fire together)
// and handles cross-browser email confirmation via a Supabase fallback.
const applyPendingProfile = async (authUser) => {
  // If another concurrent call is already in flight, wait for it and return.
  // _applyPendingProfilePromise is assigned below before any await, so this
  // check is always accurate (no TOCTOU — JS is single-threaded).
  if (_applyPendingProfilePromise) {
    await _applyPendingProfilePromise;
    return;
  }

  // Assign BEFORE awaiting so concurrent callers see the promise immediately.
  _applyPendingProfilePromise = _doApplyPendingProfile(authUser);
  try {
    await _applyPendingProfilePromise;
  } finally {
    _applyPendingProfilePromise = null;
  }
};

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) { settled = true; setAuthLoading(false); }
    };

    // 8-second failsafe so a hanging DB query never freezes the app
    const timeout = setTimeout(finish, 8000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          await applyPendingProfile(session.user);
          const user = await fetchUserProfile(session.user);
          if (user) setCurrentUser(user);
        } catch (e) {
          console.error("fetchUserProfile failed:", e);
          // Still mark the user as logged in using minimal auth data so a
          // transient DB error doesn't leave the UI stuck on Login/Sign Up.
          setCurrentUser(buildUserObject(session.user, { email: session.user?.email }, [], [], null, null));
        }
      }
      clearTimeout(timeout);
      finish();
    }).catch(() => { clearTimeout(timeout); finish(); });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Apply pending profile on SIGNED_IN (normal login / email confirm when
        // the event fires after the listener is registered) AND on INITIAL_SESSION
        // (when the SIGNED_IN from _initialize fires before the listener exists and
        // the library falls back to emitting INITIAL_SESSION for late subscribers).
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          await applyPendingProfile(session.user);
        }
        try {
          const user = await fetchUserProfile(session.user);
          if (user) setCurrentUser(user);
          else console.error("[useAuth] onAuthStateChange: fetchUserProfile returned null for event", event, session.user?.id);
        } catch (e) {
          console.error("onAuthStateChange fetchUserProfile failed:", e);
          // Still mark the user as logged in using minimal auth data so a
          // transient DB error doesn't leave the UI stuck on Login/Sign Up.
          setCurrentUser(buildUserObject(session.user, { email: session.user?.email }, [], [], null, null));
        }
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
        try {
          const normalizedEmail = newUser.email.trim().toLowerCase();

          // Destructure to exclude sensitive / over-sized fields from Supabase storage.
          // password, confirmPassword: never stored anywhere outside Supabase auth.
          // photo: base64 data URLs can be several MB, bloating the JWT and the
          //        pending_profiles table row; the photo is added back for localStorage
          //        below so the same-browser fast-path can still show it on confirmation.
          const { password, confirmPassword: _confirmPassword, photo, ...profileDataForMeta } = newUser;
          const pendingMeta = { ...profileDataForMeta, email: normalizedEmail };

          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              // Stored in auth.users.raw_user_meta_data — available from the
              // session in any browser after email confirmation, no localStorage
              // or extra table query needed.
              data: { sharedxp_pending_profile: pendingMeta },
            },
          });

          if (error) return { success: false, message: error.message || "Sign up failed." };
          if (!data?.user) return { success: false, message: "Sign up failed — no user returned." };
          if (data.user.identities?.length === 0) {
            return { success: false, message: "An account with this email already exists. Please sign in instead." };
          }

          // Also save to localStorage (same-browser fast path — includes photo).
          const pendingPayload = { ...profileDataForMeta, photo, email: normalizedEmail };
          try {
            localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(pendingPayload));
          } catch {
            try {
              // Quota exceeded (e.g. large photo) — strip photo and retry
              localStorage.setItem(
                PENDING_PROFILE_KEY,
                JSON.stringify({ ...profileDataForMeta, photo: "", email: normalizedEmail })
              );
            } catch {
              // localStorage unavailable — user_metadata / Supabase fallback will be used
            }
          }

          // Also persist to pending_profiles table as a tertiary fallback.
          // Non-fatal: same-browser flows use localStorage; cross-browser flows
          // now use user_metadata as the primary source.
          supabase
            .from("pending_profiles")
            .upsert({ email: normalizedEmail, data: pendingMeta }, { onConflict: "email" })
            .then(({ error: upsertError }) => {
              if (upsertError) console.error("Failed to persist pending profile to Supabase:", upsertError);
            })
            .catch((e) => {
              console.error("Failed to persist pending profile to Supabase:", e);
            });

          return { success: true };
        } catch (e) {
          console.error("onEmailSignUp unexpected error:", e);
          return { success: false, message: "Sign up failed. Please try again." };
        }
      },

      onEmailLogin: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          const msg = error.message || "";
          // Check both the error code (newer Supabase versions) and the message
          // text (older versions / fallback) to reliably detect unconfirmed emails.
          if (
            error.code === "email_not_confirmed" ||
            msg.toLowerCase().includes("email not confirmed")
          ) {
            return {
              success: false,
              message: "Please confirm your email address before logging in. Check your inbox for the confirmation email.",
            };
          }
          return { success: false, message: "Incorrect email or password." };
        }

        if (data?.user) {
          try {
            await applyPendingProfile(data.user);
            const user = await fetchUserProfile(data.user);
            if (user) setCurrentUser(user);
          } catch (e) {
            console.error("Login fetchUserProfile failed:", e);
            // Still mark the user as logged in using minimal auth data so a
            // transient DB error doesn't leave the UI stuck on Login/Sign Up.
            setCurrentUser(buildUserObject(data.user, { email: data.user?.email }, [], [], null, null));
          }
        }

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
        if (!currentUser) return { success: false, message: "Not logged in." };

        const { data: savedHostProfile, error: hpError } = await supabase
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

        if (hpError || !savedHostProfile) {
          console.error("host_profiles upsert failed:", hpError);
          return { success: false, message: hpError?.message || "Failed to save host profile. Check Supabase RLS policies." };
        }

        if (hostProfile.sports?.length > 0) {
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
        return { success: true };
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
