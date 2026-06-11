// Supabase Edge Function: gdpr-erasure
//
// Anonymises accounts that have been closed for more than 30 days and have
// not yet been anonymised (full_name != 'Deleted User'). Run daily via cron:
//
//   curl -X POST -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//        https://<project>.supabase.co/functions/v1/gdpr-erasure
//
// What it does per account:
//   1. Wipes PII fields in `profiles` (name, email placeholder, phone, address, etc.)
//   2. Wipes financial/identifying fields in `host_profiles`
//   3. Deletes avatar and host-sport images from storage
//   4. Updates the Supabase Auth email to the same placeholder (closes the auth.users gap)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const GRACE_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error: fetchErr } = await admin
    .from("profiles")
    .select("id, photo_url")
    .not("closed_at", "is", null)
    .lt("closed_at", cutoff)
    .neq("full_name", "Deleted User");

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id;
    const placeholderEmail = `deleted_${userId}@deleted.sharedxp.com`;

    // 1. Anonymise profiles
    const { error: profileErr } = await admin.from("profiles").update({
      first_name: "Deleted",
      last_name: "User",
      full_name: "Deleted User",
      email: placeholderEmail,
      phone: "",
      phone_country_code: "",
      country_dial_code: "",
      address: "",
      city: "",
      country: "",
      photo_url: "",
      birthday: "",
      gender: "",
    }).eq("id", userId);
    if (profileErr) { errors.push(`profiles ${userId}: ${profileErr.message}`); continue; }

    // 2. Anonymise host_profiles (best effort — may not exist)
    await admin.from("host_profiles").update({
      stripe_email: "",
      account_holder_name: "",
      citizen_id_number: "",
      tax_number: "",
      bank_name: "",
      account_number: "",
      routing_number: "",
      postcode: "",
      latitude: null,
      longitude: null,
    }).eq("user_id", userId);

    // 3. Delete avatar from storage (best effort)
    if (profile.photo_url) {
      const avatarPath = extractStoragePath(profile.photo_url, "Avatars");
      if (avatarPath) {
        await admin.storage.from("Avatars").remove([avatarPath]);
      }
    }

    // 4. Delete host-sport images from storage (best effort)
    const { data: sportImages } = await admin
      .from("host_sport_images")
      .select("image_url, host_sport_id")
      .eq("host_sport_id.host_profile_id.user_id", userId);
    if (sportImages?.length) {
      const paths = sportImages
        .map((img: { image_url: string }) => extractStoragePath(img.image_url, "host-sport-images"))
        .filter(Boolean) as string[];
      if (paths.length) await admin.storage.from("host-sport-images").remove(paths);
    }

    // 5. Update auth email to placeholder (closes the auth.users PII gap)
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: placeholderEmail,
    });
    if (authErr) errors.push(`auth ${userId}: ${authErr.message}`);

    processed++;
  }

  return new Response(
    JSON.stringify({ processed, errors: errors.length ? errors : undefined }),
    { headers: { "Content-Type": "application/json" } },
  );
});

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}
