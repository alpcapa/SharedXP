-- Addresses Supabase Security Advisor warnings.
--
-- Warnings fixed here:
--   • Function Search Path Mutable        — public.handle_new_user
--   • Public Can Execute SECURITY DEFINER — public.handle_new_user()
--   • Signed-In Can Execute SECURITY DEF. — public.handle_new_user()
--   • RLS Policy Always True              — public.profiles (2 policies)
--   • RLS Policy Always True              — public.pending_profiles INSERT
--   • Public Bucket Allows Listing        — storage.Avatars
--   • Public Bucket Allows Listing        — storage.host-sport-images
--
-- Warnings NOT fixed here (require manual dashboard action):
--   • RLS Policy Always True — pending_profiles UPDATE: must remain open
--     (anon users update the row before authentication; auth.email() = NULL).
--   • Leaked Password Protection: enable in Supabase Dashboard under
--     Authentication → Settings → Leaked Password Protection.

-- ── 1. handle_new_user: restore SET search_path and revoke public execute ────
-- Migration 005 recreated the function without SET search_path = public,
-- reintroducing the search_path-injection risk that 001 had guarded against.
-- Also revoke EXECUTE from PUBLIC: this is a trigger-only function and must
-- not be directly callable by application roles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending JSONB;
BEGIN
  pending := COALESCE(NEW.raw_user_meta_data -> 'sharedxp_pending_profile', '{}'::jsonb);

  INSERT INTO public.profiles (
    id, email, first_name, last_name, full_name,
    phone, phone_country_code, country_dial_code,
    address, country, city, birthday, gender,
    agreed_to_terms, agreed_to_promotions, signed_up_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(pending->>'firstName', ''), ''),
    COALESCE(NULLIF(pending->>'lastName',  ''), ''),
    COALESCE(
      NULLIF(pending->>'fullName', ''),
      NULLIF(TRIM(CONCAT_WS(' ',
        NULLIF(pending->>'firstName', ''),
        NULLIF(pending->>'lastName',  '')
      )), ''),
      ''
    ),
    COALESCE(NULLIF(pending->>'phone',            ''), ''),
    COALESCE(NULLIF(pending->>'phoneCountryCode', ''), ''),
    COALESCE(NULLIF(pending->>'countryDialCode',  ''), ''),
    COALESCE(NULLIF(pending->>'address',          ''), ''),
    COALESCE(NULLIF(pending->>'country',          ''), ''),
    COALESCE(NULLIF(pending->>'city',             ''), ''),
    COALESCE(NULLIF(pending->>'birthday',         ''), ''),
    COALESCE(NULLIF(pending->>'gender',           ''), ''),
    COALESCE((pending->>'agreedToTermsAndConditions')::boolean,           false),
    COALESCE((pending->>'agreedToPromotionsAndMarketingEmails')::boolean,  false),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  IF pending ? 'languages' AND jsonb_typeof(pending->'languages') = 'array' THEN
    INSERT INTO public.user_languages (user_id, language, position)
    SELECT NEW.id, elem.value, (elem.ordinality - 1)::int
    FROM jsonb_array_elements_text(pending->'languages') WITH ORDINALITY AS elem(value, ordinality)
    WHERE TRIM(elem.value) != ''
    ON CONFLICT (user_id, position) DO NOTHING;
  END IF;

  IF pending ? 'sports' AND jsonb_typeof(pending->'sports') = 'array' THEN
    INSERT INTO public.user_sports (user_id, sport, position)
    SELECT NEW.id, elem.value, (elem.ordinality - 1)::int
    FROM jsonb_array_elements_text(pending->'sports') WITH ORDINALITY AS elem(value, ordinality)
    WHERE TRIM(elem.value) != ''
    ON CONFLICT (user_id, position) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Only the trigger (which runs as the table owner) needs to invoke this
-- function. Revoking from PUBLIC covers the anon and authenticated roles
-- that inherit from it.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ── 2. Narrow profiles SELECT policy ─────────────────────────────────────────
-- "profiles_host_read" (USING (is_host = TRUE)) allows any caller to read any
-- host profile row without checking auth context — flagged as always-true.
-- "profiles_select_open" (USING (true)) is the same problem, more broadly.
-- Replace both with a single policy: host profiles are publicly readable
-- (required for browsing by unauthenticated visitors); non-host profiles are
-- readable only by the owning user.
--
-- NOTE: host profiles deliberately expose all columns (including phone,
-- address, birthday) to unauthenticated visitors because hosts must be
-- discoverable to guests who haven't signed in. This matches the prior
-- profiles_select_open behaviour. If field-level privacy is required in
-- future, consider a SECURITY DEFINER view that projects only the fields
-- appropriate for public display.

DROP POLICY IF EXISTS "profiles_own_read"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_host_read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_open" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (is_host = TRUE OR auth.uid() = id);

-- ── 3. Tighten pending_profiles INSERT policy ─────────────────────────────────
-- The INSERT policy used WITH CHECK (TRUE). Require the payload to be a JSON
-- object (not an array or scalar). The policy must still be open to anon
-- because the user is not yet authenticated at sign-up time.

DROP POLICY IF EXISTS "pending_profiles_insert" ON public.pending_profiles;
CREATE POLICY "pending_profiles_insert" ON public.pending_profiles
  FOR INSERT WITH CHECK (jsonb_typeof(data) = 'object');

-- ── 4. Restrict storage bucket listing to own subfolder ───────────────────────
-- Authenticated uploads now go into a {user_id}/ subfolder (see AuthContext).
-- Allow authenticated users to list only objects within their own subfolder.
-- Unauthenticated access to individual public URLs is served by the CDN and
-- is unaffected by these policies.
--
-- IMPORTANT: Any broad SELECT ("list all") storage policies that were created
-- via the Supabase Dashboard must be removed manually from
-- Storage → Policies, because their generated names are unknown here.
-- Until those are removed these narrower policies will not take effect
-- (RLS evaluates policies with OR logic).

DROP POLICY IF EXISTS "avatars_list_own" ON storage.objects;
CREATE POLICY "avatars_list_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'Avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "host_sport_images_list_own" ON storage.objects;
CREATE POLICY "host_sport_images_list_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'host-sport-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
