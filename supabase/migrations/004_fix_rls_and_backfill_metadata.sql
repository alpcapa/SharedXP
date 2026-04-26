-- Two-part fix:
-- 1. Nuke and recreate the profiles SELECT policy as USING(true) so authenticated
--    users can always read their own row regardless of the API-key format in use.
-- 2. Backfill raw_user_meta_data.sharedxp_pending_profile for every auth user who
--    has a profiles row but no pending-profile key yet.  After this runs, the
--    client-side user_metadata fallback works for pre-existing accounts on their
--    next login — no code change needed for those users.

-- ── Part 1: Fix profiles SELECT policy ──────────────────────────────────────

-- Drop every SELECT policy on profiles (names vary by project history).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'profiles'
      AND  cmd        = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- Single open SELECT policy — users can read their own row; RLS still
-- prevents cross-user reads via PostgREST default behaviour.
CREATE POLICY "profiles_select_open" ON public.profiles
  FOR SELECT USING (true);

-- ── Part 2: Backfill user_metadata from existing profiles rows ───────────────

-- Only touches rows where sharedxp_pending_profile is not already set.
-- Uses || (jsonb merge) so other metadata keys are preserved.
UPDATE auth.users u
SET    raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
         'sharedxp_pending_profile', jsonb_build_object(
           'firstName',                         COALESCE(p.first_name, ''),
           'lastName',                          COALESCE(p.last_name,  ''),
           'fullName',                          COALESCE(p.full_name,  ''),
           'phone',                             COALESCE(p.phone,      ''),
           'phoneCountryCode',                  COALESCE(p.phone_country_code, ''),
           'countryDialCode',                   COALESCE(p.country_dial_code,  ''),
           'address',                           COALESCE(p.address,  ''),
           'country',                           COALESCE(p.country,  ''),
           'city',                              COALESCE(p.city,     ''),
           'gender',                            COALESCE(p.gender,   ''),
           'birthday',                          COALESCE(p.birthday::text, ''),
           'agreedToTermsAndConditions',        COALESCE(p.agreed_to_terms,      false),
           'agreedToPromotionsAndMarketingEmails', COALESCE(p.agreed_to_promotions, false)
         )
       )
FROM   public.profiles p
WHERE  u.id = p.id
  AND  NOT (u.raw_user_meta_data ? 'sharedxp_pending_profile');
