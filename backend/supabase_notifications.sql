-- Run this in Supabase > SQL Editor (3rd table file, after check_ins and skills)

CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id                    TEXT PRIMARY KEY,
  push_token                 TEXT,
  notifications_enabled      BOOLEAN DEFAULT true,
  inactivity_nudge_enabled   BOOLEAN DEFAULT true,
  risk_window_nudge_enabled  BOOLEAN DEFAULT true,

  -- User-defined risk windows: [{ "day": 5, "hour": 18, "label": "Friday evenings" }]
  -- day: 0–6 (0=Sunday), or null for every day. hour: 0–23.
  risk_windows               JSONB DEFAULT '[]',

  -- Snooze: if set and in future, skip all nudges until this time
  snooze_until               TIMESTAMPTZ,

  -- Tracks when user last sent a chat message (for 24h inactivity check)
  last_active                TIMESTAMPTZ DEFAULT NOW(),

  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_last_active ON user_notification_settings (last_active)
  WHERE notifications_enabled = true AND inactivity_nudge_enabled = true;

ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification settings"
  ON user_notification_settings FOR SELECT
  USING (auth.uid()::text = user_id);
