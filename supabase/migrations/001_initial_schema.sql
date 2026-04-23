-- ============================================================
-- SharedXP Phase 1 schema
-- Run this in the Supabase SQL editor after creating your project.
-- ============================================================

-- -------------------------
-- PROFILES
-- Extends auth.users with all app-level profile data.
-- A trigger (below) auto-creates a minimal row on every signup.
-- -------------------------
CREATE TABLE public.profiles (
  id                UUID        REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  email             TEXT        NOT NULL,
  first_name        TEXT        NOT NULL DEFAULT '',
  last_name         TEXT        NOT NULL DEFAULT '',
  full_name         TEXT        NOT NULL DEFAULT '',
  phone             TEXT        NOT NULL DEFAULT '',
  phone_country_code TEXT       NOT NULL DEFAULT '',
  country_dial_code TEXT        NOT NULL DEFAULT '',
  address           TEXT        NOT NULL DEFAULT '',
  country           TEXT        NOT NULL DEFAULT '',
  city              TEXT        NOT NULL DEFAULT '',
  photo_url         TEXT        NOT NULL DEFAULT '',
  birthday          TEXT        NOT NULL DEFAULT '',  -- stored DD/MM/YYYY
  gender            TEXT        NOT NULL DEFAULT '',
  is_host           BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_to_terms   BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_to_promotions BOOLEAN  NOT NULL DEFAULT FALSE,
  signed_up_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- USER LANGUAGES  (up to 4, ordered by position 0-3)
-- -------------------------
CREATE TABLE public.user_languages (
  id        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  language  TEXT    NOT NULL DEFAULT '',
  position  INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
  UNIQUE (user_id, position)
);

-- -------------------------
-- USER SPORTS INTERESTS  (up to 4, ordered by position 0-3)
-- -------------------------
CREATE TABLE public.user_sports (
  id        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID    NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  sport     TEXT    NOT NULL DEFAULT '',
  position  INTEGER NOT NULL CHECK (position BETWEEN 0 AND 3),
  UNIQUE (user_id, position)
);

-- -------------------------
-- HOST PROFILES
-- One row per host (user with is_host = TRUE).
-- -------------------------
CREATE TABLE public.host_profiles (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  country               TEXT        NOT NULL DEFAULT '',
  city                  TEXT        NOT NULL DEFAULT '',
  pause_hosting         BOOLEAN     NOT NULL DEFAULT FALSE,
  bank_details_complete BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Stripe / payout fields
  stripe_email          TEXT        NOT NULL DEFAULT '',
  account_holder_name   TEXT        NOT NULL DEFAULT '',
  citizen_id_number     TEXT        NOT NULL DEFAULT '',
  tax_number            TEXT        NOT NULL DEFAULT '',
  bank_name             TEXT        NOT NULL DEFAULT '',
  account_number        TEXT        NOT NULL DEFAULT '',
  routing_number        TEXT        NOT NULL DEFAULT '',
  payout_currency       TEXT        NOT NULL DEFAULT 'EUR',
  -- Consents
  agree_terms           BOOLEAN     NOT NULL DEFAULT FALSE,
  agree_promotions      BOOLEAN     NOT NULL DEFAULT FALSE,
  agree_hosting_emails  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- HOST SPORTS  (one row per sport offering per host)
-- -------------------------
CREATE TABLE public.host_sports (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  host_profile_id         UUID        NOT NULL REFERENCES public.host_profiles (id) ON DELETE CASCADE,
  sport                   TEXT        NOT NULL DEFAULT '',
  description             TEXT        NOT NULL DEFAULT '',
  about                   TEXT        NOT NULL DEFAULT '',
  pricing                 NUMERIC     NOT NULL DEFAULT 0,
  pricing_currency        TEXT        NOT NULL DEFAULT 'EUR',
  level                   TEXT        NOT NULL DEFAULT '',
  paused                  BOOLEAN     NOT NULL DEFAULT FALSE,
  equipment_available     BOOLEAN     NOT NULL DEFAULT FALSE,
  equipment_details       TEXT        NOT NULL DEFAULT '',
  availability_days       TEXT[]      NOT NULL DEFAULT '{}',
  availability_start_time TEXT        NOT NULL DEFAULT '09:00',
  availability_end_time   TEXT        NOT NULL DEFAULT '18:00',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- HOST SPORT IMAGES
-- -------------------------
CREATE TABLE public.host_sport_images (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  host_sport_id UUID    NOT NULL REFERENCES public.host_sports (id) ON DELETE CASCADE,
  image_url     TEXT    NOT NULL,
  position      INTEGER NOT NULL,
  UNIQUE (host_sport_id, position)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_languages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_sports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_sport_images ENABLE ROW LEVEL SECURITY;

-- profiles: own row always; host profiles are public
CREATE POLICY "profiles_own_read"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_host_read"  ON public.profiles FOR SELECT USING (is_host = TRUE);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_languages / user_sports: owner full access, public read
CREATE POLICY "languages_owner" ON public.user_languages FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "languages_public" ON public.user_languages FOR SELECT USING (TRUE);
CREATE POLICY "sports_owner"    ON public.user_sports    FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "sports_public"   ON public.user_sports    FOR SELECT USING (TRUE);

-- host_profiles: owner full access, public read
CREATE POLICY "host_profiles_owner"  ON public.host_profiles FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "host_profiles_public" ON public.host_profiles FOR SELECT USING (TRUE);

-- host_sports: owner full access (via host_profiles.user_id), public read
CREATE POLICY "host_sports_owner" ON public.host_sports FOR ALL USING (
  auth.uid() = (
    SELECT user_id FROM public.host_profiles WHERE id = host_profile_id
  )
);
CREATE POLICY "host_sports_public" ON public.host_sports FOR SELECT USING (TRUE);

-- host_sport_images: owner full access, public read
CREATE POLICY "host_sport_images_owner" ON public.host_sport_images FOR ALL USING (
  auth.uid() = (
    SELECT hp.user_id
    FROM public.host_profiles hp
    JOIN public.host_sports hs ON hs.host_profile_id = hp.id
    WHERE hs.id = host_sport_id
  )
);
CREATE POLICY "host_sport_images_public" ON public.host_sport_images FOR SELECT USING (TRUE);

-- ============================================================
-- TRIGGER: auto-create a minimal profile row on every new signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, signed_up_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
