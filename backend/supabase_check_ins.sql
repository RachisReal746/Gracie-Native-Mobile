-- Run this in Supabase > SQL Editor to create the check_ins table
-- This powers Gracie's pattern detection engine

CREATE TABLE IF NOT EXISTS check_ins (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL,
  session_id      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Check-in data (all optional — captured from natural conversation)
  mood_score      INTEGER CHECK (mood_score BETWEEN 0 AND 10),
  urge_score      INTEGER CHECK (urge_score BETWEEN 0 AND 10),
  emotion_label   TEXT,
  trigger_type    TEXT CHECK (trigger_type IN ('conflict','payday','scrolling','work','boredom','social','loneliness','stress','physical_pain','other')),
  environment     TEXT CHECK (environment IN ('home','work','car','out')),
  social_context  TEXT CHECK (social_context IN ('alone','with_people')),
  body_state      TEXT CHECK (body_state IN ('tired','hungry','anxious','withdrawal','ok')),
  action_taken    TEXT CHECK (action_taken IN ('skill_used','reached_out','resisted','used')),
  result          TEXT CHECK (result IN ('better','same','worse')),

  -- Pre-computed time fields for fast pattern queries
  hour_of_day     INTEGER CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week     INTEGER CHECK (day_of_week BETWEEN 0 AND 6)   -- 0=Sunday
);

-- Index for fast per-user pattern queries
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins (user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_created ON check_ins (user_id, created_at DESC);

-- RLS: users can only read their own check-ins (service role bypasses this)
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own check-ins"
  ON check_ins FOR SELECT
  USING (auth.uid()::text = user_id);
