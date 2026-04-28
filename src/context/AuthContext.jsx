import { createContext, useContext, useEffect, useMemo, useState } from “react”;
import { supabase } from “../lib/supabase”;

const padStringArray = (arr, n) =>
Array.from({ length: n }, (_, i) =>
typeof arr?.[i] === “string” ? arr[i].trim() : “”
);
const normalizeLanguages = (langs) => padStringArray(langs, 4);
const normalizeSports = (sports) => padStringArray(sports, 4);

const inferCityFromAddress = (address) => {
if (!address) return “”;
const parts = address.split(”,”).map((p) => p.trim()).filter(Boolean);
return parts.length >= 2 ? parts[1] : parts[0] ?? “”;
};

const buildHostProfileObject = (hostProfile, hostSports) => {
if (!hostProfile) return null;
return {
country: hostProfile.country || “”,
city: hostProfile.city || “”,
pauseHosting: hostProfile.pause_hosting || false,
bankDetailsComplete: hostProfile.bank_details_complete || false,
sports: (hostSports || []).map((hs) => ({
sport: hs.sport || “”,
description: hs.description || “”,
about: hs.about || “”,
pricing: hs.pricing || 0,
pricingCurrency: hs.pricing_currency || “EUR”,
level: hs.level || “”,
paused: hs.paused || false,
equipmentAvailable: hs.equipment_available || false,
equipmentDetails: hs.equipment_details || “”,
availability: {
days: hs.availability_days || [],
startTime: hs.availability_start_time || “09:00”,
endTime: hs.availability_end_time || “18:00”,
},
images: (hs.host_sport_images || [])
.sort((a, b) => a.position - b.position)
.map((img) => img.image_url),
})),
stripe: {
stripeEmail: hostProfile.stripe_email || “”,
accountHolderName: hostProfile.account_holder_name || “”,
citizenIdNumber: hostProfile.citizen_id_number || “”,
taxNumber: hostProfile.tax_number || “”,
bankName: hostProfile.bank_name || “”,
accountNumber: hostProfile.account_number || “”,
routingNumber: hostProfile.routing_number || “”,
payoutCurrency: hostProfile.payout_currency || “EUR”,
},
consents: {
agreeTermsAndConditions: hostProfile.agree_terms || false,
agreePromotionsAndMarketingEmails: hostProfile.agree_promotions || false,
agreeHostingRelatedEmailsAndCalls: hostProfile.agree_hosting_emails || false,
},
};
};

const bookingRowToAttended = (row) => ({
id: row.id,
eventName: row.event_name,
label: row.event_name,
hostName: row.counterparty_name,
sport: row.sport,
photo: row.photo,
photoGallery: row.photo_gallery || [],
rating: row.rating,
hostRatings: row.host_ratings || {},
attendeeRating: row.attendee_rating,
review: row.review,
sharedToField: row.shared_to_field,
completedAt: row.completed_at,
confirmationStatus: row.confirmation_status,
confirmedAt: row.confirmed_at,
paymentReleased: row.payment_released,
});

const bookingRowToHosted = (row) => ({
id: row.id,
eventName: row.event_name,
label: row.event_name,
participantName: row.counterparty_name,
participantPhoto: row.counterparty_photo,
sport: row.sport,
photo: row.photo,
photoGallery: row.photo_gallery || [],
rating: row.rating,
attendeeRating: row.attendee_rating,
review: row.review,
sharedToField: row.shared_to_field,
completedAt: row.completed_at,
confirmationStatus: row.confirmation_status,
confirmedAt: row.confirmed_at,
paymentReleased: row.payment_released,
});

const splitBookings = (rows) => {
const out = { history: [], hostHistory: [] };
for (const row of rows || []) {
if (row.role === “attended”) out.history.push(bookingRowToAttended(row));
else if (row.role === “hosted”) out.hostHistory.push(bookingRowToHosted(row));
}
return out;
};

const fetchUserBookings = async (userId) => {
const { data, error } = await supabase
.from(“bookings”)
.select(”*”)
.eq(“user_id”, userId)
.order(“completed_at”, { ascending: false, nullsFirst: false });
if (error) {
console.error(”[auth] fetchUserBookings:”, error);
return { history: [], hostHistory: [] };
}
return splitBookings(data);
};

const toBookingRow = (userId, role, item) => ({
user_id: userId,
role,
event_name: item.eventName ?? item.label ?? “”,
sport: item.sport ?? “”,
counterparty_name:
role === “attended”
? item.hostName ?? “”
: item.participantName ?? “”,
counterparty_photo:
role === “hosted” ? item.participantPhoto ?? “” : “”,
photo: item.photo ?? “”,
photo_gallery: Array.isArray(item.photoGallery) ? item.photoGallery : [],
rating: Number.isFinite(Number(item.rating)) ? Number(item.rating) : 0,
host_ratings:
item.hostRatings && typeof item.hostRatings === “object”
? item.hostRatings
: {},
attendee_rating: Number.isFinite(Number(item.attendeeRating))
? Number(item.attendeeRating)
: 0,
review: item.review ?? “”,
shared_to_field: !!item.sharedToField,
completed_at: item.completedAt || null,
confirmation_status: item.confirmationStatus || “pending”,
confirmed_at: item.confirmedAt || null,
payment_released: !!item.paymentReleased,
});

// Replace-all sync. The HistoryPage always saves the entire array, so we
// mirror that semantic in the DB: drop the user’s rows for this role then
// re-insert. Not the most efficient, but correctness-preserving without
// requiring HistoryPage to track per-item operations.
const syncBookings = async (userId, role, items) => {
const { error: delError } = await supabase
.from(“bookings”)
.delete()
.eq(“user_id”, userId)
.eq(“role”, role);
if (delError) {
console.error(”[auth] syncBookings delete:”, delError);
return;
}
const rows = (Array.isArray(items) ? items : []).map((item) =>
toBookingRow(userId, role, item)
);
if (!rows.length) return;
const { error: insError } = await supabase.from(“bookings”).insert(rows);
if (insError) console.error(”[auth] syncBookings insert:”, insError);
};

const buildUserObject = (
authUser,
profile,
languages,
sports,
hostProfile,
hostSports,
bookings
) => {
if (!authUser) return null;
const p = profile || {};
return {
id: authUser.id,
email: p.email || authUser.email || “”,
fullName:
p.full_name ||
`${p.first_name || ""} ${p.last_name || ""}`.trim() ||
“”,
firstName: p.first_name || “”,
lastName: p.last_name || “”,
phone: p.phone || “”,
phoneCountryCode: p.phone_country_code || “”,
countryDialCode: p.country_dial_code || “”,
address: p.address || “”,
country: p.country || “”,
city: p.city || “”,
photo: p.photo_url || “”,
birthday: p.birthday || “”,
gender: p.gender || “”,
languages: normalizeLanguages(
(languages || [])
.slice()
.sort((a, b) => a.position - b.position)
.map((l) => l.language)
),
sports: normalizeSports(
(sports || [])
.slice()
.sort((a, b) => a.position - b.position)
.map((s) => s.sport)
),
signedUpAt: p.signed_up_at || authUser.created_at || new Date().toISOString(),
isHost: p.is_host || false,
hostProfile: buildHostProfileObject(hostProfile, hostSports),
history: bookings?.history ?? [],
hostHistory: bookings?.hostHistory ?? [],
agreedToTermsAndConditions: p.agreed_to_terms || false,
agreedToPromotionsAndMarketingEmails: p.agreed_to_promotions || false,
};
};

// Maps the user_metadata.sharedxp_pending_profile shape (camelCase, written by
// onEmailSignUp) onto the profiles table column shape (snake_case). Used as a
// last-resort fallback when the DB profile row is unreachable — the row should
// already exist via the handle_new_user trigger (migration 005).
const metaToProfileShape = (meta, authUser) => ({
email: authUser.email,
full_name:
meta.fullName ||
`${meta.firstName || ""} ${meta.lastName || ""}`.trim(),
first_name: meta.firstName || “”,
last_name: meta.lastName || “”,
phone: meta.phone || “”,
phone_country_code: meta.phoneCountryCode || “”,
country_dial_code: meta.countryDialCode || “”,
address: meta.address || “”,
country: meta.country || “”,
city: meta.city || “”,
photo_url: meta.photoUrl || “”,
birthday: meta.birthday || “”,
gender: meta.gender || “”,
is_host: false,
agreed_to_terms: meta.agreedToTermsAndConditions || false,
agreed_to_promotions: meta.agreedToPromotionsAndMarketingEmails || false,
signed_up_at: authUser.created_at || new Date().toISOString(),
});

const fetchUserProfile = async (authUser) => {
if (!authUser) return null;

const [profileResult, languagesResult, sportsResult, bookings] =
await Promise.all([
supabase.from(“profiles”).select(”*”).eq(“id”, authUser.id),
supabase
.from(“user_languages”)
.select(”*”)
.eq(“user_id”, authUser.id)
.order(“position”),
supabase
.from(“user_sports”)
.select(”*”)
.eq(“user_id”, authUser.id)
.order(“position”),
fetchUserBookings(authUser.id),
]);

let profile = profileResult.data?.[0] ?? null;

// Fallback: profile row missing (e.g. handle_new_user trigger didn’t run, or
// RLS is misconfigured). Reconstruct a minimal profile from user_metadata so
// the UI can still render a logged-in state.
if (!profile) {
const meta = authUser.user_metadata?.sharedxp_pending_profile;
profile = meta
? metaToProfileShape(meta, authUser)
: { email: authUser.email };
}

let hostProfile = null;
let hostSports = [];
if (profile.is_host) {
const { data: hp } = await supabase
.from(“host_profiles”)
.select(”*”)
.eq(“user_id”, authUser.id)
.maybeSingle();
hostProfile = hp;
if (hp) {
const { data: hs } = await supabase
.from(“host_sports”)
.select(”*, host_sport_images(*)”)
.eq(“host_profile_id”, hp.id);
hostSports = hs || [];
}
}

return buildUserObject(
authUser,
profile,
languagesResult.data || [],
sportsResult.data || [],
hostProfile,
hostSports,
bookings
);
};

const upsertLanguagesAndSports = async (userId, languages, sports) => {
const langRows = normalizeLanguages(languages)
.map((language, position) => ({ user_id: userId, language, position }))
.filter((r) => r.language);
const sportRows = normalizeSports(sports)
.map((sport, position) => ({ user_id: userId, sport, position }))
.filter((r) => r.sport);

await Promise.all([
supabase.from(“user_languages”).delete().eq(“user_id”, userId),
supabase.from(“user_sports”).delete().eq(“user_id”, userId),
]);

const [langResult, sportResult] = await Promise.all([
langRows.length
? supabase.from(“user_languages”).insert(langRows)
: Promise.resolve({ error: null }),
sportRows.length
? supabase.from(“user_sports”).insert(sportRows)
: Promise.resolve({ error: null }),
]);
if (langResult?.error) console.error(”[auth] insert languages:”, langResult.error);
if (sportResult?.error) console.error(”[auth] insert sports:”, sportResult.error);
};

// Uploads a base64 data URL to Supabase Storage and returns the public URL.
// Returns an empty string if upload fails (non-fatal — profile saves without photo).
const uploadAvatarFromDataUrl = async (dataUrl, userEmail) => {
try {
const res = await fetch(dataUrl);
const blob = await res.blob();
const ext = blob.type.split(”/”)[1]?.replace(“jpeg”, “jpg”) || “jpg”;
// Use email + timestamp for a unique, deterministic filename
const safeName = userEmail.replace(/[^a-zA-Z0-9]/g, “_”);
const fileName = `${safeName}_${Date.now()}.${ext}`;

```
const { data: uploadData, error: uploadError } = await supabase.storage
  .from("Avatars")
  .upload(fileName, blob, { contentType: blob.type, upsert: true });

if (uploadError) {
  console.error("[auth] avatar upload:", uploadError);
  return "";
}

const { data: { publicUrl } } = supabase.storage
  .from("Avatars")
  .getPublicUrl(uploadData.path);

return publicUrl || "";
```

} catch (e) {
console.error(”[auth] uploadAvatarFromDataUrl:”, e);
return “”;
}
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
const [currentUser, setCurrentUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
let mounted = true;

```
const loadUser = async (authUser) => {
  try {
    const u = await fetchUserProfile(authUser);
    if (mounted && u) setCurrentUser(u);
  } catch (e) {
    console.error("[auth] fetchUserProfile failed:", e);
    // Keep the UI in a logged-in state with whatever we have on the auth
    // session, so a transient DB error doesn't strand the user on Login.
    if (mounted) {
      setCurrentUser(
        buildUserObject(
          authUser,
          { email: authUser.email },
          [],
          [],
          null,
          null,
          { history: [], hostHistory: [] }
        )
      );
    }
  }
};

supabase.auth
  .getSession()
  .then(({ data: { session } }) => {
    if (!mounted) return;
    // Resolve the loading gate as soon as the session is known. The profile
    // fetch continues in the background — the UI just shows the
    // logged-out shell until it completes (no arbitrary timeouts needed).
    setAuthLoading(false);
    if (session?.user) loadUser(session.user);
  })
  .catch((e) => {
    if (!mounted) return;
    console.error("[auth] getSession failed:", e);
    setAuthLoading(false);
  });

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  if (!mounted) return;
  if (session?.user) loadUser(session.user);
  else setCurrentUser(null);
});

return () => {
  mounted = false;
  subscription.unsubscribe();
};
```

}, []);

const value = useMemo(
() => ({
currentUser,
authLoading,

```
  onLogout: async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  },

  onEmailSignUp: async (newUser) => {
    try {
      const normalizedEmail = newUser.email.trim().toLowerCase();

      const {
        password,
        confirmPassword: _confirmPassword,
        photo,
        ...profileMeta
      } = newUser;

      // Upload photo to Supabase Storage before creating the auth user.
      // This gives us a permanent public URL instead of a base64 blob,
      // which is safe to store in user_metadata and the profiles table.
      let photoUrl = "";
      if (photo && photo.startsWith("data:")) {
        photoUrl = await uploadAvatarFromDataUrl(photo, normalizedEmail);
      }

      // user_metadata is the single source of truth the handle_new_user
      // trigger reads to populate profiles + user_languages + user_sports.
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            sharedxp_pending_profile: {
              ...profileMeta,
              email: normalizedEmail,
              photoUrl,
            },
          },
        },
      });

      if (error) {
        return { success: false, message: error.message || "Sign up failed." };
      }
      if (!data?.user) {
        return { success: false, message: "Sign up failed — no user returned." };
      }
      if (data.user.identities?.length === 0) {
        return {
          success: false,
          message:
            "An account with this email already exists. Please sign in instead.",
        };
      }

      // If we have a photoUrl and the user session is immediately available
      // (email confirmation disabled), write photo_url directly to the profile.
      // When email confirmation is required the handle_new_user trigger will
      // pick up photoUrl from user_metadata instead.
      if (photoUrl && data.session) {
        await supabase
          .from("profiles")
          .update({ photo_url: photoUrl })
          .eq("id", data.user.id);
      }

      return { success: true };
    } catch (e) {
      console.error("[auth] onEmailSignUp:", e);
      return { success: false, message: "Sign up failed. Please try again." };
    }
  },

  onEmailLogin: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const msg = error.message || "";
        if (
          error.code === "email_not_confirmed" ||
          msg.toLowerCase().includes("email not confirmed")
        ) {
          return {
            success: false,
            message:
              "Please confirm your email address before logging in. Check your inbox for the confirmation email.",
          };
        }
        return {
          success: false,
          message: error.message || "Incorrect email or password.",
        };
      }
      // Profile loading happens via onAuthStateChange SIGNED_IN; awaiting
      // it here would freeze the UI on slow DB responses.
      return { success: true };
    } catch (e) {
      console.error("[auth] onEmailLogin:", e);
      return { success: false, message: "Login failed. Please try again." };
    }
  },

  onSocialLogin: async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider: provider === "apple" ? "apple" : "google",
      options: { redirectTo: window.location.origin },
    });
  },

  onToggleHost: async () => {
    if (!currentUser) return;
    await supabase
      .from("profiles")
      .update({ is_host: true })
      .eq("id", currentUser.id);

    const { data: existing } = await supabase
      .from("host_profiles")
      .select("id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

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
    if (authUser) setCurrentUser(await fetchUserProfile(authUser));
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
          agree_promotions:
            hostProfile.consents?.agreePromotionsAndMarketingEmails || false,
          agree_hosting_emails:
            hostProfile.consents?.agreeHostingRelatedEmailsAndCalls || false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (hpError || !savedHostProfile) {
      console.error("[auth] host_profiles upsert failed:", hpError);
      return {
        success: false,
        message:
          hpError?.message ||
          "Failed to save host profile. Check Supabase RLS policies.",
      };
    }

    if (hostProfile.sports?.length > 0) {
      await supabase
        .from("host_sports")
        .delete()
        .eq("host_profile_id", savedHostProfile.id);

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
            availability_start_time:
              sportConfig.availability?.startTime || "09:00",
            availability_end_time:
              sportConfig.availability?.endTime || "18:00",
          })
          .select()
          .single();

        if (savedSport && sportConfig.images?.length > 0) {
          const imageRows = sportConfig.images
            .filter(Boolean)
            .map((url, i) => ({
              host_sport_id: savedSport.id,
              image_url: url,
              position: i,
            }));
          if (imageRows.length > 0) {
            await supabase.from("host_sport_images").insert(imageRows);
          }
        }
      }
    }

    await supabase
      .from("profiles")
      .update({ is_host: true })
      .eq("id", currentUser.id);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) setCurrentUser(await fetchUserProfile(authUser));
    return { success: true };
  },

  onUpdateProfile: async (profileUpdates) => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please log in to update your profile.",
      };
    }

    const previousEmail = currentUser.email.trim().toLowerCase();
    const nextEmail = (profileUpdates.email ?? currentUser.email)
      .trim()
      .toLowerCase();
    const nextPhone = (
      profileUpdates.phone ?? currentUser.phone ?? ""
    ).trim();
    const previousPhone = (currentUser.phone ?? "").trim();
    const hasCriticalChanges =
      nextEmail !== previousEmail || nextPhone !== previousPhone;

    if (nextEmail !== previousEmail) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", nextEmail)
        .neq("id", currentUser.id)
        .maybeSingle();
      if (existing) {
        return {
          success: false,
          message: "This email is already in use by another account.",
        };
      }
    }

    const normalizedCity =
      typeof profileUpdates.city === "string"
        ? profileUpdates.city.trim()
        : inferCityFromAddress(profileUpdates.address);

    // If an updated photo comes in as a base64 data URL, upload it to
    // Storage first and use the resulting public URL instead.
    let resolvedPhotoUrl = profileUpdates.photo ?? currentUser.photo ?? "";
    if (resolvedPhotoUrl.startsWith("data:")) {
      const uploaded = await uploadAvatarFromDataUrl(resolvedPhotoUrl, nextEmail);
      if (uploaded) resolvedPhotoUrl = uploaded;
    }

    await supabase
      .from("profiles")
      .update({
        email: nextEmail,
        phone: nextPhone,
        phone_country_code:
          profileUpdates.phoneCountryCode ?? currentUser.phoneCountryCode ?? "",
        country_dial_code:
          profileUpdates.countryDialCode ?? currentUser.countryDialCode ?? "",
        address: profileUpdates.address ?? currentUser.address ?? "",
        country: profileUpdates.country ?? currentUser.country ?? "",
        city: normalizedCity || currentUser.city || "",
        photo_url: resolvedPhotoUrl,
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
    if (authUser) setCurrentUser(await fetchUserProfile(authUser));
    return { success: true, requiresReauthentication: false };
  },

  onSaveHistory: (historyItems) => {
    if (!currentUser) return;
    const items = Array.isArray(historyItems) ? historyItems : [];
    // Optimistic local update; DB sync runs in background. Errors are
    // logged inside syncBookings but don't roll back the UI state.
    setCurrentUser((prev) => (prev ? { ...prev, history: items } : null));
    syncBookings(currentUser.id, "attended", items);
  },

  onSaveHostHistory: (hostHistoryItems) => {
    if (!currentUser) return;
    const items = Array.isArray(hostHistoryItems) ? hostHistoryItems : [];
    setCurrentUser((prev) =>
      prev ? { ...prev, hostHistory: items } : null
    );
    syncBookings(currentUser.id, "hosted", items);
  },
}),
[currentUser, authLoading]
```

);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
const ctx = useContext(AuthContext);
if (!ctx) throw new Error(“useAuth must be used inside <AuthProvider>”);
return ctx;
};

export default useAuth;
