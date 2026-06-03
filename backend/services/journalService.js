const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');

const groq = new Groq({ apiKey: process.env.NEW_GROQ_API_KEY });

// Journal insight prompt
const JOURNAL_INSIGHT_PROMPT = `You are Gracie, an AI therapist analyzing a recovery journal entry using Australian CBT practices.

Analyze the entry and provide:
1. Key emotional themes
2. Potential triggers identified
3. Coping strategies used (if any)
4. One actionable insight or encouragement

Keep response to 2-3 sentences, warm and supportive tone.`;

class JournalService {
  // Create journal entry with AI insight
  async createEntry(userId, content, mood) {
    try {
      // Generate AI insight
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: JOURNAL_INSIGHT_PROMPT },
          { role: 'user', content: `Journal entry (mood ${mood}/5): "${content}"` }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const aiInsight = completion.choices[0]?.message?.content ||
        'Thank you for sharing. Journaling is a powerful tool for self-awareness.';

      // Save journal entry
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content,
          mood,
          ai_insight: aiInsight
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving journal entry to Supabase:', error);
        // If it's a guest or invalid UUID format error (22P02), we continue with a mock object
        if (userId.startsWith('guest_') || error.code === '22P02' || error.code === '23503') {
          console.log('Continuing as guest/unregistered user for journal...');
          return {
            id: 'temp_' + Date.now(),
            user_id: userId,
            content,
            mood,
            ai_insight: aiInsight,
            created_at: new Date().toISOString()
          };
        }
        throw error;
      }

      // Update user progress journal count (optional, error won't fail the save)
      const { error: rpcError } = await supabase.rpc('increment_journal_count', { user_uuid: userId });
      if (rpcError) {
        console.warn('RPC increment_journal_count failed or missing:', rpcError.message);
      }

      return entry;
    } catch (error) {
      console.error('Create journal entry error:', error);
      throw error;
    }
  }

  // Get journal entries for user
  async getEntries(userId) {
    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching journal entries from Supabase:', error);
        // If it's a guest or invalid UUID format error (22P02), return empty entries
        if (userId.startsWith('guest_') || error.code === '22P02' || error.code === '23503') {
          console.log('Returning empty entries for guest/invalid user...');
          return { entries: [] };
        }
        throw error;
      }

      return { entries };
    } catch (error) {
      console.error('Get journal entries error:', error);
      throw error;
    }
  }
}

module.exports = new JournalService();
