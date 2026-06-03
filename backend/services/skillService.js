const supabase = require('./supabaseClient');

class SkillService {

  // ── Record skill outcome (before/after urge score) ────────────────────────
  async recordOutcome(userId, skillId, sessionId, beforeScore, afterScore) {
    const delta = beforeScore - afterScore; // positive = urge went down = good

    await supabase.from('skill_outcomes').insert({
      user_id: userId,
      skill_id: skillId,
      session_id: sessionId,
      before_score: beforeScore,
      after_score: afterScore,
      delta
    });

    // Upsert into user rankings (rolling average)
    const { data: existing } = await supabase
      .from('user_skill_rankings')
      .select('use_count, avg_delta')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();

    if (existing) {
      const newCount = existing.use_count + 1;
      const newAvg = ((Number(existing.avg_delta) * existing.use_count) + delta) / newCount;
      await supabase
        .from('user_skill_rankings')
        .update({ use_count: newCount, avg_delta: newAvg, last_used: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('skill_id', skillId);
    } else {
      await supabase.from('user_skill_rankings').insert({
        user_id: userId,
        skill_id: skillId,
        use_count: 1,
        avg_delta: delta,
        last_used: new Date().toISOString()
      });
    }
  }

  // ── 70 / 20 / 10 skill rotation ───────────────────────────────────────────
  // Returns { proven, adjacent, fresh } — Gracie picks from each bucket
  async getRotation(userId, opts = {}) {
    const { target = null, context = null, limit = 5 } = opts;

    // User's proven rankings (used 2+ times, sorted by effectiveness)
    const { data: rankings } = await supabase
      .from('user_skill_rankings')
      .select('skill_id, avg_delta, use_count, last_used')
      .eq('user_id', userId)
      .gte('use_count', 2)
      .order('avg_delta', { ascending: false })
      .limit(30);

    const rankedIds = (rankings || []).map(r => r.skill_id);
    const allUsedIds = await this._allUsedSkillIds(userId);

    // Fetch full skill library
    let query = supabase.from('skills').select('*').eq('is_active', true);
    if (target) query = query.contains('target', [target]);
    if (context) query = query.contains('context', [context]);
    const { data: allSkills } = await query;
    if (!allSkills) return { proven: [], adjacent: [], fresh: [] };

    const proven = allSkills
      .filter(s => rankedIds.includes(s.id))
      .sort((a, b) => {
        const ra = rankings.find(r => r.skill_id === a.id);
        const rb = rankings.find(r => r.skill_id === b.id);
        return Number(rb?.avg_delta ?? 0) - Number(ra?.avg_delta ?? 0);
      })
      .slice(0, Math.round(limit * 0.7));

    const adjacent = allSkills
      .filter(s => allUsedIds.includes(s.id) && !rankedIds.includes(s.id))
      .slice(0, Math.round(limit * 0.2));

    const fresh = allSkills
      .filter(s => !allUsedIds.includes(s.id))
      .slice(0, Math.round(limit * 0.1) || 1);

    return { proven, adjacent, fresh };
  }

  // ── Get user's top skills for Gracie context ──────────────────────────────
  async getUserTopSkills(userId) {
    const { data: rankings } = await supabase
      .from('user_skill_rankings')
      .select('skill_id, avg_delta, use_count')
      .eq('user_id', userId)
      .gte('use_count', 2)
      .order('avg_delta', { ascending: false })
      .limit(5);

    if (!rankings?.length) return null;

    const { data: skills } = await supabase
      .from('skills')
      .select('id, name')
      .in('id', rankings.map(r => r.skill_id));

    if (!skills) return null;

    return rankings.map(r => {
      const skill = skills.find(s => s.id === r.skill_id);
      return {
        id: r.skill_id,
        name: skill?.name,
        avg_delta: Number(r.avg_delta),
        use_count: r.use_count
      };
    }).filter(s => s.name);
  }

  // ── Suggest one skill to try (picks from proven bucket first) ────────────
  async suggestSkill(userId, target = null) {
    const rotation = await this.getRotation(userId, { target, limit: 5 });

    // 70% chance: proven, 20%: adjacent, 10%: fresh
    const rand = Math.random();
    let pool;
    if (rand < 0.7 && rotation.proven.length) pool = rotation.proven;
    else if (rand < 0.9 && rotation.adjacent.length) pool = rotation.adjacent;
    else pool = rotation.fresh.length ? rotation.fresh : rotation.proven;

    if (!pool?.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Format top skills for Gracie's system prompt ─────────────────────────
  formatSkillsForGracie(topSkills) {
    if (!topSkills?.length) return '';

    const lines = topSkills.map(s => {
      const delta = Math.round(s.avg_delta * 10) / 10;
      return `- ${s.name} (used ${s.use_count}x, avg urge drop: ${delta} points)`;
    });

    return `\n\n**Skills that have worked best for this user — lead with these when relevant:**\n${lines.join('\n')}\nAfter suggesting a proven skill, always offer: "Or want to try something new?" That keeps things fresh.`;
  }

  // ── Internal: all skill IDs ever used by user ────────────────────────────
  async _allUsedSkillIds(userId) {
    const { data } = await supabase
      .from('user_skill_rankings')
      .select('skill_id')
      .eq('user_id', userId);
    return (data || []).map(r => r.skill_id);
  }
}

module.exports = new SkillService();
