const axios = require('axios');
const cron = require('node-cron');
const supabase = require('./supabaseClient');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Nudge messages (short — push notifications must be concise)
const INACTIVITY_NUDGES = [
  { title: 'Quick check-in', body: "How's today been: heavy, okay, or good?" },
  { title: 'Just checking in', body: "No pressure — how are you sitting right now?" },
  { title: 'Hey', body: "It's been a day. How's the energy today?" }
];

const RISK_WINDOW_NUDGES = [
  { title: 'Heads up', body: "This time has been tough before. Want a 60-second reset?" },
  { title: 'Just a nudge', body: "A hard window is coming up. Want to check in with Gracie?" },
  { title: 'One question', body: "What's your urge level right now, 0–10?" }
];

class NotificationService {

  // ── Send one push notification via Expo ───────────────────────────────────
  async send(pushToken, { title, body, data = {}, categoryIdentifier = null }) {
    if (!pushToken) return;
    try {
      const payload = { to: pushToken, sound: 'default', title, body, data };
      if (categoryIdentifier) payload.categoryIdentifier = categoryIdentifier;
      await axios.post(EXPO_PUSH_URL, payload, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
      });
    } catch (err) {
      console.error('Push notification send error:', err.message);
    }
  }

  // ── Save / update push token for a user ───────────────────────────────────
  async registerToken(userId, pushToken) {
    await supabase.from('user_notification_settings').upsert({
      user_id: userId,
      push_token: pushToken,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // ── Update last_active timestamp (called on each chat message) ────────────
  async updateLastActive(userId) {
    await supabase.from('user_notification_settings').upsert({
      user_id: userId,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // ── Update settings (risk windows, enable/disable) ────────────────────────
  async updateSettings(userId, settings) {
    const allowed = [
      'notifications_enabled',
      'inactivity_nudge_enabled',
      'risk_window_nudge_enabled',
      'risk_windows'
    ];
    const safe = {};
    for (const key of allowed) {
      if (settings[key] !== undefined) safe[key] = settings[key];
    }
    safe.updated_at = new Date().toISOString();
    await supabase.from('user_notification_settings')
      .upsert({ user_id: userId, ...safe }, { onConflict: 'user_id' });
  }

  // ── Snooze all nudges for N hours ─────────────────────────────────────────
  async snooze(userId, hours = 1) {
    const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    await supabase.from('user_notification_settings')
      .upsert({ user_id: userId, snooze_until: snoozeUntil, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' });
  }

  // ── Disable a specific nudge type ─────────────────────────────────────────
  async disableNudgeType(userId, type) {
    const field = type === 'risk_window' ? 'risk_window_nudge_enabled' : 'inactivity_nudge_enabled';
    await supabase.from('user_notification_settings')
      .upsert({ user_id: userId, [field]: false, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' });
  }

  // ── Check users inactive for 24h+ and send nudge ─────────────────────────
  async checkInactiveUsers() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: users } = await supabase
      .from('user_notification_settings')
      .select('user_id, push_token')
      .eq('notifications_enabled', true)
      .eq('inactivity_nudge_enabled', true)
      .lt('last_active', cutoff)
      .or(`snooze_until.is.null,snooze_until.lt.${now}`);

    if (!users?.length) return;

    for (const u of users) {
      if (!u.push_token) continue;
      const nudge = INACTIVITY_NUDGES[Math.floor(Math.random() * INACTIVITY_NUDGES.length)];
      await this.send(u.push_token, {
        ...nudge,
        data: { type: 'DAILY_CHECKIN' },
        categoryIdentifier: 'DAILY_CHECKIN'
      });
    }

    console.log(`Inactivity nudges sent: ${users.filter(u => u.push_token).length}`);
  }

  // ── Check risk windows and send nudge ─────────────────────────────────────
  async checkRiskWindows() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();       // 0=Sunday
    const currentMinute = now.getMinutes();
    const nowIso = now.toISOString();

    // Only fire once per hour window (minute 0–4)
    if (currentMinute > 4) return;

    const { data: users } = await supabase
      .from('user_notification_settings')
      .select('user_id, push_token, risk_windows')
      .eq('notifications_enabled', true)
      .eq('risk_window_nudge_enabled', true)
      .or(`snooze_until.is.null,snooze_until.lt.${nowIso}`);

    if (!users?.length) return;

    for (const u of users) {
      if (!u.push_token) continue;
      const windows = u.risk_windows || [];

      const matched = windows.some(w => {
        if (w.hour !== currentHour) return false;
        if (w.day !== null && w.day !== undefined && w.day !== currentDay) return false;
        return true;
      });

      if (!matched) {
        // Also check pattern engine: peak_urge_hour from check_ins
        const patternsMatch = await this._checkPatternRiskHour(u.user_id, currentHour);
        if (!patternsMatch) continue;
      }

      const nudge = RISK_WINDOW_NUDGES[Math.floor(Math.random() * RISK_WINDOW_NUDGES.length)];
      await this.send(u.push_token, {
        ...nudge,
        data: { type: 'RISK_WINDOW' },
        categoryIdentifier: 'RISK_WINDOW'
      });
    }
  }

  // Check if the pattern engine has identified this hour as a risk window
  async _checkPatternRiskHour(userId, currentHour) {
    try {
      const { data } = await supabase
        .from('check_ins')
        .select('urge_score, hour_of_day')
        .eq('user_id', userId)
        .eq('hour_of_day', currentHour)
        .not('urge_score', 'is', null);

      if (!data || data.length < 3) return false;

      const avg = data.reduce((sum, c) => sum + c.urge_score, 0) / data.length;
      return avg >= 6; // Pattern risk threshold
    } catch {
      return false;
    }
  }

  // ── Start scheduled cron jobs ─────────────────────────────────────────────
  startCronJobs() {
    // Check inactive users every hour at :05
    cron.schedule('5 * * * *', () => {
      console.log('[Cron] Checking inactive users...');
      this.checkInactiveUsers().catch(err =>
        console.error('[Cron] Inactivity check error:', err.message)
      );
    });

    // Check risk windows every 15 minutes
    cron.schedule('0,15,30,45 * * * *', () => {
      this.checkRiskWindows().catch(err =>
        console.error('[Cron] Risk window check error:', err.message)
      );
    });

    console.log('✅ Notification cron jobs started');
  }
}

module.exports = new NotificationService();
