-- ============================================================
-- NutriTrack Schema — Safe to run multiple times
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'coach')),
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  meal TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 100,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS macro_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL DEFAULT 2000,
  protein INTEGER NOT NULL DEFAULT 150,
  carbs INTEGER NOT NULL DEFAULT 200,
  fat INTEGER NOT NULL DEFAULT 65,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_record invites%ROWTYPE;
  user_role TEXT;
BEGIN
  -- Safely get role from metadata, default to 'client'
  user_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    'client'
  );
  -- Ensure role is valid
  IF user_role NOT IN ('client', 'coach') THEN
    user_role := 'client';
  END IF;

  -- Create profile (wrapped in exception handler so signup never fails)
  BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
      user_role
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed: %', SQLERRM;
    RETURN NEW;
  END;

  -- Handle invite token
  BEGIN
    IF NEW.raw_user_meta_data->>'invite_token' IS NOT NULL
       AND NEW.raw_user_meta_data->>'invite_token' != '' THEN

      SELECT * INTO invite_record
      FROM invites
      WHERE token = NEW.raw_user_meta_data->>'invite_token'
        AND used = false;

      IF FOUND THEN
        UPDATE profiles SET coach_id = invite_record.coach_id WHERE id = NEW.id;
        UPDATE invites SET used = true, used_by = NEW.id WHERE id = invite_record.id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: invite link failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_targets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches view their clients" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches manage own invites" ON invites;
DROP POLICY IF EXISTS "Anyone can read invites" ON invites;
DROP POLICY IF EXISTS "Users manage own food logs" ON food_logs;
DROP POLICY IF EXISTS "Coaches view client food logs" ON food_logs;
DROP POLICY IF EXISTS "Users manage own weight logs" ON weight_logs;
DROP POLICY IF EXISTS "Coaches view client weight logs" ON weight_logs;
DROP POLICY IF EXISTS "Users manage own exercise logs" ON exercise_logs;
DROP POLICY IF EXISTS "Coaches view client exercise logs" ON exercise_logs;
DROP POLICY IF EXISTS "Coaches manage their notes" ON coach_notes;
DROP POLICY IF EXISTS "Clients view their notes" ON coach_notes;
DROP POLICY IF EXISTS "Coaches manage client targets" ON macro_targets;
DROP POLICY IF EXISTS "Clients view their targets" ON macro_targets;

-- Profiles
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Coaches view their clients" ON profiles FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Invites
CREATE POLICY "Coaches manage own invites" ON invites FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Anyone can read invites" ON invites FOR SELECT USING (true);

-- Food logs
CREATE POLICY "Users manage own food logs" ON food_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coaches view client food logs" ON food_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = food_logs.user_id AND coach_id = auth.uid())
);

-- Weight logs
CREATE POLICY "Users manage own weight logs" ON weight_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coaches view client weight logs" ON weight_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = weight_logs.user_id AND coach_id = auth.uid())
);

-- Exercise logs
CREATE POLICY "Users manage own exercise logs" ON exercise_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coaches view client exercise logs" ON exercise_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = exercise_logs.user_id AND coach_id = auth.uid())
);

-- Coach notes
CREATE POLICY "Coaches manage their notes" ON coach_notes FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Clients view their notes" ON coach_notes FOR SELECT USING (client_id = auth.uid());

-- Macro targets
CREATE POLICY "Coaches manage client targets" ON macro_targets FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Clients view their targets" ON macro_targets FOR SELECT USING (client_id = auth.uid());

-- ============================================================
-- Backfill: create profiles for any existing auth users
-- ============================================================
INSERT INTO profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'client')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
