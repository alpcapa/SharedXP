-- ── Part 1: Fix profiles SELECT policy ──────────────────────────────────────
-- Drop every existing SELECT policy by name so we can replace them cleanly.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_open" ON public.profiles;

CREATE POLICY "profiles_select_open" ON public.profiles
  FOR SELECT USING (true);

-- ── Part 2: Backfill user_metadata from existing profiles rows ───────────────
-- Uses correlated subquery with full table names so no short aliases are needed.
-- Only updates rows where sharedxp_pending_profile is not yet set.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'sharedxp_pending_profile',
  (SELECT jsonb_build_object(
    'firstName',                            COALESCE(profiles.first_name, ''),
    'lastName',                             COALESCE(profiles.last_name,  ''),
    'fullName',                             COALESCE(profiles.full_name,  ''),
    'phone',                                COALESCE(profiles.phone,      ''),
    'phoneCountryCode',                     COALESCE(profiles.phone_country_code, ''),
    'countryDialCode',                      COALESCE(profiles.country_dial_code,  ''),
    'address',                              COALESCE(profiles.address,  ''),
    'country',                              COALESCE(profiles.country,  ''),
    'city',                                 COALESCE(profiles.city,     ''),
    'gender',                               COALESCE(profiles.gender,   ''),
    'birthday',                             COALESCE(profiles.birthday::text, ''),
    'agreedToTermsAndConditions',           COALESCE(profiles.agreed_to_terms,      false),
    'agreedToPromotionsAndMarketingEmails', COALESCE(profiles.agreed_to_promotions, false)
  )
  FROM public.profiles
  WHERE profiles.id = auth.users.id)
)
WHERE auth.users.id IN (SELECT profiles.id FROM public.profiles)
  AND NOT (auth.users.raw_user_meta_data ? 'sharedxp_pending_profile');
