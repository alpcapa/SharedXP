-- ── Part 1: Fix handle_new_user to populate all profile fields at signup ──────
-- The previous trigger only inserted id/email/signed_up_at, leaving every
-- other column at its empty-string default. raw_user_meta_data already
-- contains sharedxp_pending_profile (written by onEmailSignUp before signUp
-- is called), so the trigger can populate the full row immediately —
-- eliminating the applyPendingProfile race condition entirely.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pending JSONB;
BEGIN
  pending := COALESCE(NEW.raw_user_meta_data -> 'sharedxp_pending_profile', '{}'::jsonb);

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    phone_country_code,
    country_dial_code,
    address,
    country,
    city,
    birthday,
    gender,
    agreed_to_terms,
    agreed_to_promotions,
    signed_up_at
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
    COALESCE(NULLIF(pending->>'phone',              ''), ''),
    COALESCE(NULLIF(pending->>'phoneCountryCode',   ''), ''),
    COALESCE(NULLIF(pending->>'countryDialCode',    ''), ''),
    COALESCE(NULLIF(pending->>'address',            ''), ''),
    COALESCE(NULLIF(pending->>'country',            ''), ''),
    COALESCE(NULLIF(pending->>'city',               ''), ''),
    COALESCE(NULLIF(pending->>'birthday',           ''), ''),
    COALESCE(NULLIF(pending->>'gender',             ''), ''),
    COALESCE((pending->>'agreedToTermsAndConditions')::boolean,           false),
    COALESCE((pending->>'agreedToPromotionsAndMarketingEmails')::boolean,  false),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert languages (stored separately in user_languages)
  IF pending ? 'languages' AND jsonb_typeof(pending->'languages') = 'array' THEN
    INSERT INTO public.user_languages (user_id, language, position)
    SELECT NEW.id, elem.value, (elem.ordinality - 1)::int
    FROM jsonb_array_elements_text(pending->'languages') WITH ORDINALITY AS elem(value, ordinality)
    WHERE TRIM(elem.value) != ''
    ON CONFLICT (user_id, position) DO NOTHING;
  END IF;

  -- Insert sports (stored separately in user_sports)
  IF pending ? 'sports' AND jsonb_typeof(pending->'sports') = 'array' THEN
    INSERT INTO public.user_sports (user_id, sport, position)
    SELECT NEW.id, elem.value, (elem.ordinality - 1)::int
    FROM jsonb_array_elements_text(pending->'sports') WITH ORDINALITY AS elem(value, ordinality)
    WHERE TRIM(elem.value) != ''
    ON CONFLICT (user_id, position) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Part 2: Backfill existing profiles from user_metadata ────────────────────
-- For users who signed up before this trigger fix, populate any empty profile
-- columns from their raw_user_meta_data.sharedxp_pending_profile.
-- Uses NULLIF so existing non-empty values are never overwritten.

UPDATE public.profiles
SET
  first_name = COALESCE(
    NULLIF(TRIM(meta->>'firstName'), ''),
    NULLIF(first_name, ''),
    ''
  ),
  last_name = COALESCE(
    NULLIF(TRIM(meta->>'lastName'), ''),
    NULLIF(last_name, ''),
    ''
  ),
  full_name = COALESCE(
    NULLIF(TRIM(meta->>'fullName'), ''),
    NULLIF(TRIM(CONCAT_WS(' ',
      NULLIF(TRIM(meta->>'firstName'), ''),
      NULLIF(TRIM(meta->>'lastName'),  '')
    )), ''),
    NULLIF(TRIM(CONCAT_WS(' ',
      NULLIF(first_name, ''),
      NULLIF(last_name,  '')
    )), ''),
    NULLIF(full_name, ''),
    ''
  ),
  phone = COALESCE(
    NULLIF(TRIM(meta->>'phone'), ''),
    NULLIF(phone, ''),
    ''
  ),
  phone_country_code = COALESCE(
    NULLIF(TRIM(meta->>'phoneCountryCode'), ''),
    NULLIF(phone_country_code, ''),
    ''
  ),
  country_dial_code = COALESCE(
    NULLIF(TRIM(meta->>'countryDialCode'), ''),
    NULLIF(country_dial_code, ''),
    ''
  ),
  address = COALESCE(
    NULLIF(TRIM(meta->>'address'), ''),
    NULLIF(address, ''),
    ''
  ),
  country = COALESCE(
    NULLIF(TRIM(meta->>'country'), ''),
    NULLIF(country, ''),
    ''
  ),
  city = COALESCE(
    NULLIF(TRIM(meta->>'city'), ''),
    NULLIF(city, ''),
    ''
  ),
  birthday = COALESCE(
    NULLIF(TRIM(meta->>'birthday'), ''),
    NULLIF(birthday, ''),
    ''
  ),
  gender = COALESCE(
    NULLIF(TRIM(meta->>'gender'), ''),
    NULLIF(gender, ''),
    ''
  ),
  agreed_to_terms = COALESCE(
    (meta->>'agreedToTermsAndConditions')::boolean,
    agreed_to_terms
  ),
  agreed_to_promotions = COALESCE(
    (meta->>'agreedToPromotionsAndMarketingEmails')::boolean,
    agreed_to_promotions
  ),
  updated_at = NOW()
FROM (
  SELECT
    auth.users.id AS user_id,
    auth.users.raw_user_meta_data -> 'sharedxp_pending_profile' AS meta
  FROM auth.users
  WHERE auth.users.raw_user_meta_data ? 'sharedxp_pending_profile'
    AND auth.users.raw_user_meta_data -> 'sharedxp_pending_profile' IS NOT NULL
) AS user_meta
WHERE public.profiles.id = user_meta.user_id
  AND user_meta.meta IS NOT NULL;
