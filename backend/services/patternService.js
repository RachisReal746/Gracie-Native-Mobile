const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');

const groq = new Groq({ apiKey: process.env.NEW_GROQ_API_KEY });

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class PatternService {

  // Use Groq to extract structured check-in data from a user message
  async extractCheckInData(message) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Extract check-in data from this message if present. Return ONLY valid JSON with these fields (use null if not mentioned or unclear):
{
  "mood_score": null,
  "urge_score": null,
  "emotion_label": null,
  "trigger_type": null,
  "environment": null,
  "social_context": null,
  "body_state": null,
  "action_taken": null,
  "result": null
}

Rules:
- mood_score: integer 0–10 (only if user describes mood numerically or clearly, e.g. "feeling like a 3", "mood is low" = 3)
- urge_score: integer 0–10 (only if user mentions cravings/urges with any intensity cue)
- emotion_label: one or two words max (e.g. "anxious", "numb", "angry", "flat")
- trigger_type: one of [conflict, payday, scrolling, work, boredom, social, loneliness, stress, physical_pain, other] — only if clearly implied
- environment: one of [home, work, car, out] — only if mentioned
- social_context: one of [alone, with_people] — only if mentioned
- body_state: one of [tired, hungry, anxious, withdrawal, ok] — only if clearly mentioned
- action_taken: one of [skill_used, reached_out, resisted, used] — only if user describes what they did
- result: one of [better, same, worse] — only if user describes outcome

Return null for any field not clearly present. Return ONLY the JSON object, no explanation.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 150
      });

      const text = response.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(text);

      // Only return if at least one field has real data
      const hasData = Object.values(parsed).some(v => v !== null);
      return hasData ? parsed : null;
    } catch {
      return null; // Extraction is best-effort
    }
  }

  // Save a check-in data point to Supabase
  async saveCheckIn(userId, sessionId, data) {
    if (!data) return;
    try {
      const now = new Date();
      await supabase.from('check_ins').insert({
        user_id: userId,
        session_id: sessionId,
        mood_score: data.mood_score ?? null,
        urge_score: data.urge_score ?? null,
        emotion_label: data.emotion_label ?? null,
        trigger_type: data.trigger_type ?? null,
        environment: data.environment ?? null,
        social_context: data.social_context ?? null,
        body_state: data.body_state ?? null,
        action_taken: data.action_taken ?? null,
        result: data.result ?? null,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay()
      });
    } catch (error) {
      console.error('Error saving check-in:', error.message);
    }
  }

  // Analyse stored check-in data and return detected patterns
  async analyzePatterns(userId) {
    try {
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !checkIns || checkIns.length < 5) return null;

      const patterns = {};

      // ── Time-based: peak urge hour ───────────────────────────────────────
      const byHour = {};
      checkIns.forEach(c => {
        if (c.urge_score !== null && c.hour_of_day !== null) {
          if (!byHour[c.hour_of_day]) byHour[c.hour_of_day] = [];
          byHour[c.hour_of_day].push(c.urge_score);
        }
      });

      let peakHour = null, peakAvgUrge = 0;
      Object.entries(byHour).forEach(([hour, scores]) => {
        if (scores.length >= 2) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg > peakAvgUrge) { peakAvgUrge = avg; peakHour = parseInt(hour); }
        }
      });
      if (peakHour !== null && peakAvgUrge >= 5) {
        patterns.peak_urge_hour = peakHour;
        patterns.peak_urge_avg = Math.round(peakAvgUrge * 10) / 10;
      }

      // ── Context-based: alone vs with people ─────────────────────────────
      const aloneUrges = checkIns
        .filter(c => c.social_context === 'alone' && c.urge_score !== null)
        .map(c => c.urge_score);
      const withUrges = checkIns
        .filter(c => c.social_context === 'with_people' && c.urge_score !== null)
        .map(c => c.urge_score);

      if (aloneUrges.length >= 3 && withUrges.length >= 3) {
        const aloneAvg = aloneUrges.reduce((a, b) => a + b, 0) / aloneUrges.length;
        const withAvg = withUrges.reduce((a, b) => a + b, 0) / withUrges.length;
        if (aloneAvg > withAvg + 2) {
          patterns.higher_urge_when_alone = true;
          patterns.alone_urge_avg = Math.round(aloneAvg * 10) / 10;
        }
      }

      // ── Top triggers ─────────────────────────────────────────────────────
      const triggerCounts = {};
      checkIns.forEach(c => {
        if (c.trigger_type) triggerCounts[c.trigger_type] = (triggerCounts[c.trigger_type] || 0) + 1;
      });
      const topTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([, count]) => count >= 2)
        .map(([type]) => type);
      if (topTriggers.length > 0) patterns.top_triggers = topTriggers;

      // ── Low mood clusters by day ─────────────────────────────────────────
      const byDay = {};
      checkIns.forEach(c => {
        if (c.mood_score !== null && c.day_of_week !== null) {
          if (!byDay[c.day_of_week]) byDay[c.day_of_week] = [];
          byDay[c.day_of_week].push(c.mood_score);
        }
      });

      let lowestDay = null, lowestAvgMood = 10;
      Object.entries(byDay).forEach(([day, scores]) => {
        if (scores.length >= 2) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg < lowestAvgMood) { lowestAvgMood = avg; lowestDay = parseInt(day); }
        }
      });
      if (lowestDay !== null && lowestAvgMood <= 4) {
        patterns.lowest_mood_day = DAY_NAMES[lowestDay];
        patterns.lowest_mood_avg = Math.round(lowestAvgMood * 10) / 10;
      }

      // ── Skills effectiveness ─────────────────────────────────────────────
      const skillsThatHelped = checkIns.filter(
        c => c.action_taken === 'skill_used' && c.result === 'better'
      ).length;
      if (skillsThatHelped >= 2) {
        patterns.skill_success_count = skillsThatHelped;
      }

      // ── HALT body state before high urge ─────────────────────────────────
      const haltStates = ['tired', 'hungry', 'anxious'];
      const haltBeforeHighUrge = checkIns.filter(
        c => haltStates.includes(c.body_state) && (c.urge_score ?? 0) >= 6
      ).length;
      if (haltBeforeHighUrge >= 3) {
        patterns.halt_triggers_urge = true;
        patterns.halt_count = haltBeforeHighUrge;
      }

      return Object.keys(patterns).length > 0 ? patterns : null;
    } catch (error) {
      console.error('Pattern analysis error:', error.message);
      return null;
    }
  }

  // Format detected patterns as context text for Gracie's system prompt
  formatInsightsForGracie(patterns) {
    if (!patterns) return '';

    const lines = [];

    if (patterns.peak_urge_hour !== null && patterns.peak_urge_hour !== undefined) {
      const h = patterns.peak_urge_hour;
      const timeStr = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      lines.push(`Urges are strongest around ${timeStr} (avg ${patterns.peak_urge_avg}/10)`);
    }

    if (patterns.higher_urge_when_alone) {
      lines.push(`Urges are higher when alone (avg ${patterns.alone_urge_avg}/10 vs lower with others)`);
    }

    if (patterns.top_triggers?.length > 0) {
      lines.push(`Most common triggers: ${patterns.top_triggers.join(', ')}`);
    }

    if (patterns.lowest_mood_day) {
      lines.push(`Mood tends to drop on ${patterns.lowest_mood_day}s (avg ${patterns.lowest_mood_avg}/10)`);
    }

    if (patterns.skill_success_count) {
      lines.push(`Skills have measurably helped ${patterns.skill_success_count} times`);
    }

    if (patterns.halt_triggers_urge) {
      lines.push(`HALT states (tired/hungry/anxious) appear before ${patterns.halt_count} high-urge moments`);
    }

    if (lines.length === 0) return '';

    return `\n\n**Patterns detected for this user (use gently — say "may", always pair with one action offer):**\n${lines.map(l => `- ${l}`).join('\n')}`;
  }

  // Full summary for the dashboard (raw + formatted)
  async getUserInsights(userId) {
    const patterns = await this.analyzePatterns(userId);
    return {
      patterns,
      formatted: this.formatInsightsForGracie(patterns)
    };
  }
}

module.exports = new PatternService();
