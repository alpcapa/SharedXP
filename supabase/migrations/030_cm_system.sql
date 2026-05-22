-- Community Manager system: applications, profiles, referrals, commissions

-- ── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE cm_applications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'interview', 'accepted', 'declined')),
  city              TEXT        NOT NULL DEFAULT '',
  country           TEXT        NOT NULL DEFAULT '',
  sports_background TEXT        NOT NULL DEFAULT '',
  motivation        TEXT        NOT NULL DEFAULT '',
  contact_times     TEXT        NOT NULL DEFAULT '',
  admin_notes       TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cm_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT        NOT NULL UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'paused', 'revoked')),
  city        TEXT        NOT NULL DEFAULT '',
  country     TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per new user who signed up using a CM's invite code.
-- referred_user_id is UNIQUE: a user can only be attributed to one CM.
CREATE TABLE cm_referrals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cm_id            UUID        NOT NULL REFERENCES cm_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  signed_up_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commission accrues only on completed bookings by referred users (5 % of GMV).
CREATE TABLE cm_commissions (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cm_id              UUID          NOT NULL REFERENCES cm_profiles(id) ON DELETE CASCADE,
  booking_request_id UUID          NOT NULL UNIQUE REFERENCES booking_requests(id) ON DELETE CASCADE,
  gmv                NUMERIC(12,2) NOT NULL,
  commission_amount  NUMERIC(12,2) NOT NULL,
  currency           TEXT          NOT NULL DEFAULT 'EUR',
  status             TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'paid')),
  approved_at        TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── updated_at trigger for cm_applications ─────────────────────────────────

CREATE OR REPLACE FUNCTION cm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cm_applications_updated_at
  BEFORE UPDATE ON cm_applications
  FOR EACH ROW EXECUTE FUNCTION cm_set_updated_at();

-- ── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE cm_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_referrals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_commissions  ENABLE ROW LEVEL SECURITY;

-- cm_applications
CREATE POLICY "cm_app_owner_select" ON cm_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cm_app_owner_insert" ON cm_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cm_app_admin_all" ON cm_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- cm_profiles: owner reads own row; everyone can read active codes (for invite validation)
CREATE POLICY "cm_profile_owner_select" ON cm_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cm_profile_active_select" ON cm_profiles
  FOR SELECT USING (status = 'active');

CREATE POLICY "cm_profile_admin_all" ON cm_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- cm_referrals: CM reads referrals they generated; referred user reads own row
CREATE POLICY "cm_referral_cm_select" ON cm_referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cm_profiles WHERE id = cm_referrals.cm_id AND user_id = auth.uid())
  );

CREATE POLICY "cm_referral_user_select" ON cm_referrals
  FOR SELECT USING (auth.uid() = referred_user_id);

CREATE POLICY "cm_referral_user_insert" ON cm_referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_user_id);

CREATE POLICY "cm_referral_admin_all" ON cm_referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- cm_commissions: CM reads own commissions
CREATE POLICY "cm_commission_cm_select" ON cm_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cm_profiles WHERE id = cm_commissions.cm_id AND user_id = auth.uid())
  );

CREATE POLICY "cm_commission_admin_all" ON cm_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
