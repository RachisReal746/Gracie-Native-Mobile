-- Run this in Supabase > SQL Editor AFTER running supabase_check_ins.sql
-- Creates skill library tables and seeds 20 interventions

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  instructions TEXT,           -- Exact wording Gracie uses to introduce this skill
  target       TEXT[],         -- urge, anxiety, shame, anger, insomnia, loneliness
  duration     TEXT,           -- 30s, 2m, 10m
  context      TEXT[],         -- public, private, low_energy, high_agitation
  modality     TEXT,           -- breath, cognitive, somatic, behavioural, spiritual, intuitive
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks before/after score each time a user tries a skill
CREATE TABLE IF NOT EXISTS skill_outcomes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL,
  skill_id     UUID REFERENCES skills(id),
  session_id   TEXT,
  before_score INTEGER CHECK (before_score BETWEEN 0 AND 10),
  after_score  INTEGER CHECK (after_score BETWEEN 0 AND 10),
  delta        INTEGER,        -- before - after (positive = urge dropped)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Computed per-user skill effectiveness rankings
CREATE TABLE IF NOT EXISTS user_skill_rankings (
  user_id      TEXT NOT NULL,
  skill_id     UUID REFERENCES skills(id),
  use_count    INTEGER DEFAULT 0,
  avg_delta    NUMERIC(4,2) DEFAULT 0,
  last_used    TIMESTAMPTZ,
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_outcomes_user ON skill_outcomes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_rankings_user ON user_skill_rankings (user_id, avg_delta DESC);

ALTER TABLE skill_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own skill outcomes"
  ON skill_outcomes FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users read own skill rankings"
  ON user_skill_rankings FOR SELECT USING (auth.uid()::text = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA — 20 interventions
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO skills (name, description, instructions, target, duration, context, modality) VALUES

-- ── BREATH ──────────────────────────────────────────────────────────────────
(
  'Box Breathing',
  'Slow, equal-count breathing to calm the nervous system fast.',
  'Want to try a 30-second reset? Breathe in for 4 counts, hold for 4, out for 4, hold for 4. Just one round. Tell me what you notice after.',
  ARRAY['urge','anxiety','anger'],
  '30s',
  ARRAY['public','private','high_agitation'],
  'breath'
),
(
  '4-7-8 Breathing',
  'Extended exhale activates the parasympathetic nervous system.',
  'Want to try something quick? In for 4, hold for 7, out for 8. Just one breath. It sounds weird but it works. Let me know how that lands.',
  ARRAY['anxiety','insomnia','urge'],
  '30s',
  ARRAY['private','low_energy'],
  'breath'
),
(
  'Physiological Sigh',
  'Double inhale through the nose followed by long exhale — fastest known way to reduce acute stress.',
  'Here''s the fastest reset I know: two quick sniffs in through the nose (top up your lungs), then one long slow exhale out. Just once. Try it now if you want.',
  ARRAY['anxiety','urge','anger'],
  '30s',
  ARRAY['public','private','high_agitation'],
  'breath'
),

-- ── SOMATIC ─────────────────────────────────────────────────────────────────
(
  '5-4-3-2-1 Grounding',
  'Sensory anchoring that interrupts thought spirals and brings attention to the present moment.',
  'Want to try something grounding? Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Takes about 2 minutes. Want to walk through it?',
  ARRAY['anxiety','urge','shame'],
  '2m',
  ARRAY['public','private','high_agitation','low_energy'],
  'somatic'
),
(
  'Urge Surfing',
  'Observe the urge as a wave — it rises, peaks, and passes. You don''t fight it, you ride it.',
  'Urges peak and pass on their own — they last about 20–30 minutes maximum. Instead of fighting it, try watching it like a wave. Where do you feel it in your body right now? Let''s track it together.',
  ARRAY['urge'],
  '10m',
  ARRAY['private','low_energy'],
  'somatic'
),
(
  'Body Signal Literacy',
  'Tune into physical sensations to identify what the body is signalling before the thinking mind takes over.',
  'Before we go further — where do you feel this in your body right now? Chest, throat, stomach, somewhere else? Is it tight, buzzing, heavy, hot? Just notice. No need to fix it yet.',
  ARRAY['urge','anxiety','anger','shame'],
  '30s',
  ARRAY['public','private','low_energy','high_agitation'],
  'intuitive'
),
(
  'Cold Water Reset',
  'Cold water on wrists/face activates the dive reflex, dropping heart rate within seconds.',
  'One quick thing that can interrupt an urge fast: cold water on your wrists or face — 30 seconds. It triggers your body''s calm response almost immediately. Worth trying if you''re somewhere you can do it.',
  ARRAY['urge','anger'],
  '30s',
  ARRAY['private'],
  'somatic'
),
(
  'Progressive Muscle Relaxation',
  'Systematically tense and release muscle groups to release stored physical tension.',
  'When the body''s holding tension, this helps: tense each muscle group for 5 seconds, then release. Start with your feet and work up. Takes about 10 minutes. Best lying down if you can.',
  ARRAY['anxiety','insomnia','anger'],
  '10m',
  ARRAY['private','low_energy'],
  'somatic'
),

-- ── COGNITIVE ───────────────────────────────────────────────────────────────
(
  'Signal vs Story',
  'Separate the raw physical sensation from the narrative the mind layers on top.',
  'You said "' || chr(39) || 'wired' || chr(39) || '" — let''s separate two things. What''s the actual sensation in your body right now (buzzing, tight, restless)? And what''s the story your brain is adding on top of that? Just name both. No need to fix either yet.',
  ARRAY['anxiety','shame','urge'],
  '30s',
  ARRAY['public','private','low_energy'],
  'intuitive'
),
(
  'Values Alignment Check',
  'A one-question anchor that reconnects decision-making to identity and long-term goals.',
  'One question: which option matches the version of you that you''re building? Not the easy option — the aligned one. You don''t have to answer out loud, just sit with it for a second.',
  ARRAY['urge','shame'],
  '30s',
  ARRAY['public','private','low_energy','high_agitation'],
  'intuitive'
),
(
  'Urge Wave Forecast',
  'Predict when urges are most likely to hit and plan a specific response in advance.',
  'Based on your patterns, let''s forecast the next wave. When do you think it''ll be strongest today? What''s usually happening around that time? If we can name it in advance, we can plan one small thing to have ready.',
  ARRAY['urge'],
  '2m',
  ARRAY['private','low_energy'],
  'cognitive'
),
(
  'Trigger Rehearsal',
  'Write a specific if/then script for a known high-risk trigger so the response is pre-loaded.',
  'Want to rehearse this one? If [trigger] happens, I will [specific action] instead. Saying it out loud or writing it down makes it 3x more likely you''ll actually do it in the moment. Want to write one now?',
  ARRAY['urge','anxiety'],
  '10m',
  ARRAY['private','low_energy'],
  'cognitive'
),
(
  'Post-Event Review',
  'A brief review after a close call or slip — identifies earliest warning signs for next time.',
  'Looking back at what just happened — what was the earliest warning sign you noticed? The very first moment something shifted? Not to judge it, just to map it so you can catch it sooner next time.',
  ARRAY['urge','shame'],
  '2m',
  ARRAY['private','low_energy'],
  'intuitive'
),
(
  'Micro-Choice',
  'Break paralysis by identifying the single smallest possible next action in the next 5 minutes.',
  'Not the whole solution — just the next 5 minutes. What''s the smallest right move available to you right now? One thing. It doesn''t have to fix anything.',
  ARRAY['urge','anxiety','shame'],
  '30s',
  ARRAY['public','private','low_energy','high_agitation'],
  'intuitive'
),

-- ── BEHAVIOURAL ─────────────────────────────────────────────────────────────
(
  '10-Minute Delay',
  'Commit to waiting 10 minutes before acting on an urge. Most urges significantly reduce in that window.',
  'The urge is real. And it will peak and drop — usually within 10–20 minutes. Can you give it 10 minutes? Set a timer if it helps. You don''t have to decide anything right now, just delay the decision.',
  ARRAY['urge'],
  '10m',
  ARRAY['public','private','low_energy','high_agitation'],
  'behavioural'
),
(
  'Future-Self Message',
  'Record or write a message to yourself for the next high-risk moment — advice from your calmer self.',
  'Want to try something different? Record a voice note or write a few sentences to yourself — from right now, to the next time things feel this hard. What would you want to hear? I''ll remind you of it.',
  ARRAY['urge','shame','loneliness'],
  '2m',
  ARRAY['private','low_energy'],
  'behavioural'
),
(
  'Pattern Challenge',
  'A tiny behavioural experiment to test whether a belief or habit is actually true.',
  'Here''s one to try: pick one small thing you usually do in this situation and do the opposite — just once, as an experiment. Notice what actually happens vs what you predicted. Want to design one?',
  ARRAY['urge','anxiety','shame'],
  '10m',
  ARRAY['private','low_energy'],
  'behavioural'
),
(
  'Reach Out',
  'Contact one safe person — a text, call, or showing up. Loneliness and urges amplify each other.',
  'Is there one person — even just for a text — you could reach out to right now? It doesn''t have to be deep. Sometimes just knowing someone knows you''re having a hard moment is enough.',
  ARRAY['loneliness','urge'],
  '2m',
  ARRAY['public','private','low_energy'],
  'behavioural'
),

-- ── SPIRITUAL ───────────────────────────────────────────────────────────────
(
  'Centering Prayer',
  'A brief moment of stillness — grounding in something bigger than the urge.',
  'If faith is part of your grounding — even 30 seconds of stillness, handing this moment over, can shift something. No words needed. Just a breath and an intention.',
  ARRAY['anxiety','loneliness','shame'],
  '30s',
  ARRAY['public','private','low_energy'],
  'spiritual'
),
(
  'Gratitude Anchor',
  'Name three specific things — not generic, but real and present — to interrupt a shame or low-mood spiral.',
  'Not the big vague stuff — three specific things from the last 24 hours. Even small. This isn''t toxic positivity, it''s just giving your brain something concrete to hold.',
  ARRAY['shame','loneliness','anxiety'],
  '2m',
  ARRAY['public','private','low_energy'],
  'spiritual'
);
