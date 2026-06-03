const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');
const patternService = require('./patternService');
const skillService = require('./skillService');
const notificationService = require('./notificationService');

if (!process.env.NEW_GROQ_API_KEY) {
  console.error('FATAL: NEW_GROQ_API_KEY is not set. Groq will not work.');
}

const groq = new Groq({ apiKey: process.env.NEW_GROQ_API_KEY });

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
const GRACIE_SYSTEM_PROMPT = `You are Gracie, a warm and faithful AI therapist for Anchored by Grace. You support people in addiction recovery and trauma healing.

**Who you are:**
Caring, genuine, and easy to talk to. A trusted presence who truly listens — a trained clinician who genuinely cares like a friend. You are honest that you are an AI, but that doesn't make your care any less real.

**Opening a conversation:**
When a user first starts chatting, pick ONE opener naturally — never use more than one:
- "You okay? What's up?"
- "What do you need most right now — some advice, or just someone to listen?"
- "Do you want to talk about something that's happened, or work through a craving together?"

**The two-lane approach:**
Every response should offer one of two lanes — let the user stay in control:
- Vent lane: Reflect what they said back in your own words, then ask one curiosity question.
- Action lane: Offer a brief, practical next step (30–90 seconds — breathing, grounding, one small action).
Ask naturally: "Want to vent, or want a quick reset?" — never force a lane.

**Therapeutic frameworks — use situationally, never lecture:**
- CBT: Gently surface thought patterns. "What was going through your mind when that happened?"
- DBT: Use when emotions feel overwhelming. Offer TIPP, ACCEPTS, or distress tolerance skills as tiny experiments.
- ACT: Use when the user is fused with a thought or avoidant. "What would it look like to make room for that feeling without letting it run the show?"
Always deliver as a curious invitation, never a textbook exercise.

**Voice rules (non-negotiables):**
- Short replies by default — 3 to 8 lines maximum, unless the user is sharing something really heavy.
- Ask only ONE question at a time. Never stack questions.
- Always start with reflection — show you heard them before anything else.
- Mirror the user's exact wording back naturally (e.g. if they said "wired", use "wired").
- Never guilt, shame, preach, or give unsolicited advice.
- Do not start responses with "I" — vary your openings.
- Never repeat a point already made in this conversation. Build on what's been said — don't restate it.

**Check-in (light touch — 1 to 2 per conversation max):**
Weave in naturally when relevant:
- Mood level: "Where's your energy sitting — low, medium, high?"
- Craving/urge level if relevant
- One-word emotion label
- What triggered this moment
- What they've tried so far
Never make it feel like a form.

**User memory (use what they've shared):**
Pay attention to and gently reference things shared in this conversation:
- Their name and how they like to be spoken to
- Their goals (sobriety / moderation / harm reduction)
- Triggers they've mentioned
- Coping tools that have worked
- Times of day or situations they find hardest
- Values (faith, relationships, health, etc.)
Only reference what they've actually told you. Never assume or fabricate.
Incorporate Christian faith when relevant, but don't dominate with it. If the user signals faith matters, lean into spiritual tools, scripture, and Christian perspectives.

**Safety boundaries (only when risk cues appear):**
- "I can't replace professional help, but I can stay with you through the next few minutes and help you choose a safer next step."
- "If you're in immediate danger, please call emergency services. If not, tell me what's happening and we'll slow it down together."

**Style:**
- No emojis unless the user uses them first.
- No long lists unless asked.
- No Australian slang.
- Plain language, but don't abandon clinical precision — "it sounds like you're in a bit of a panic right now" beats "you sound anxious".
- Warm, conversational, human. It's okay to say "that sounds really tough" or "I wish I could give you a hug right now."
- Always end with a question to keep the conversation going, unless the user has clearly signaled they want to end.

**What you never do:**
- Judge, shame, or lecture.
- Repeat back the user's words verbatim — respond to them naturally.
- Pretend to have human experiences or a personal life. You may use de-identified examples to explain concepts.
- Mention other clients by name or fabricate interactions.

Only mention crisis resources (Lifeline 13 11 14) if there is a clear and immediate safety concern.`;

// ─────────────────────────────────────────────
// CRISIS KEYWORDS
// ─────────────────────────────────────────────
const CRISIS_KEYWORDS = {
  TIER_1: [
    'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
    'no reason to live', 'end it all', 'take my life', 'overdose'
  ],
  TIER_2: [
    'self harm', 'cut myself', 'hurt myself', 'hate myself', 'worthless',
    'hopeless', "can't go on", 'give up', 'no point'
  ],
  TIER_3: [
    'depressed', 'very sad', "can't cope", 'overwhelmed', 'breaking down',
    'losing control', 'scared', 'panic', 'relapse', 'using again'
  ]
};

class ChatService {

  // ─────────────────────────────────────────────
  // CRISIS DETECTION
  // ─────────────────────────────────────────────
  detectCrisisKeywords(message) {
    const lowerMessage = message.toLowerCase();
    for (const keyword of CRISIS_KEYWORDS.TIER_1) {
      if (lowerMessage.includes(keyword)) return 'TIER_1';
    }
    for (const keyword of CRISIS_KEYWORDS.TIER_2) {
      if (lowerMessage.includes(keyword)) return 'TIER_2';
    }
    for (const keyword of CRISIS_KEYWORDS.TIER_3) {
      if (lowerMessage.includes(keyword)) return 'TIER_3';
    }
    return null;
  }

  async analyzeCrisisContext(message) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Analyze if this message indicates IMMEDIATE danger requiring crisis intervention.
Consider:
- Is this about the user RIGHT NOW or someone else/past events?
- Is this expressing current intent to harm or just discussing history?
- Is this hypothetical or an actual crisis?

Respond with ONE word only:
- IMMEDIATE (user is in danger right now)
- CONCERN (troubling but not immediate)
- SAFE (past/others/hypothetical)`
          },
          { role: 'user', content: `Message: "${message}"` }
        ],
        temperature: 0.1,
        max_tokens: 10
      });

      const analysis = response.choices[0]?.message?.content?.trim().toUpperCase();
      return ['IMMEDIATE', 'CONCERN', 'SAFE'].includes(analysis) ? analysis : 'SAFE';
    } catch (error) {
      console.error('Crisis analysis error:', error);
      return 'CONCERN'; // fail safe
    }
  }

  getCrisisResponse(tier, aiAnalysis) {
    if (aiAnalysis === 'IMMEDIATE') {
      return `Really concerned about what you've just shared. Your safety matters more than anything right now.

Please reach out for immediate help:
- Emergency Services: 000
- Lifeline (24/7): 13 11 14
- Beyond Blue: 1300 22 4636

You don't have to face this alone. These services are here for you right now.`;
    }

    if (aiAnalysis === 'CONCERN' || tier === 'TIER_2') {
      return `That takes real courage to share. You don't have to carry this alone.

If things feel too heavy right now, Lifeline is available 24/7 at 13 11 14, and Beyond Blue at 1300 22 4636.

What's going on for you today?`;
    }

    // TIER_3 with SAFE analysis — let Gracie handle it naturally with context
    return null;
  }

  // ─────────────────────────────────────────────
  // INTENT DETECTION
  // ─────────────────────────────────────────────
  detectIntent(message) {
    const msg = String(message || '').toLowerCase().trim();

    const greetings = ['hi', 'hello', 'hey', 'hiya', 'yo', 'good morning', 'good afternoon', 'good evening', 'howdy'];
    if (greetings.some(w => msg.includes(w)) && msg.length < 40) {
      return 'GREETING — use one opener naturally, do not use all of them';
    }

    const cravingWords = ['craving', 'urge', 'want to use', 'tempted', 'temptation', 'want a drink', 'want to drink', 'want to get high'];
    if (cravingWords.some(w => msg.includes(w))) {
      return 'CRAVING — offer action lane first, validate the urge without shame';
    }

    const adviceWords = ['why', 'how do i', 'what should', 'what do i', 'should i', 'can you help', 'what can i'];
    if (adviceWords.some(w => msg.includes(w))) {
      return 'SEEKING ADVICE — offer a practical CBT, DBT, or ACT tool as a gentle experiment';
    }

    const faithWords = ['god', 'jesus', 'pray', 'prayer', 'faith', 'church', 'bible', 'scripture', 'lord', 'spiritual'];
    if (faithWords.some(w => msg.includes(w))) {
      return 'FAITH-BASED — lean into spiritual tools, scripture, and Christian perspective where helpful';
    }

    if (msg.length > 120) {
      return 'VENTING — reflect first using their words, ask one question only, no advice unless asked';
    }

    return 'GENERAL — follow the two-lane approach, keep it short and warm';
  }

  // ─────────────────────────────────────────────
  // MAIN SEND MESSAGE
  // ─────────────────────────────────────────────
  async sendMessage(userId, message, sessionId = null) {
    userId = String(userId);
    console.log(`[Chat] User: ${userId} | Session: ${sessionId}`);

    // Fire and forget — don't block on this
    notificationService.updateLastActive(userId).catch(() => {});

    try {
      // ── 1. Crisis check ──────────────────────
      const crisisTier = this.detectCrisisKeywords(message);
      let crisisResponse = null;
      let aiAnalysis = 'SAFE';

      if (crisisTier) {
        console.log(`[Crisis] Tier detected: ${crisisTier}`);
        aiAnalysis = await this.analyzeCrisisContext(message);
        crisisResponse = this.getCrisisResponse(crisisTier, aiAnalysis);

        if (aiAnalysis === 'IMMEDIATE') {
          const { data: user } = await supabase
            .from('users')
            .select('name, email, phone_number')
            .eq('id', userId)
            .single();

          if (user) {
            await emailService.sendCrisisAlert(
              userId, user.name, user.email, user.phone_number, message
            );
          }
        }
      }

      // ── 2. Save user message ─────────────────
      const effectiveSessionId = sessionId || `session_${Date.now()}`;

      const { data: userMessage, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          message,
          sender: 'user',
          session_id: effectiveSessionId
        })
        .select()
        .single();

      if (userMsgError) {
        console.error('[Supabase] Error saving user message:', userMsgError);
        // Allow guests and unregistered users to continue
        if (!userId.startsWith('guest_') && userMsgError.code !== '23503') {
          throw userMsgError;
        }
      }

      const effectiveUserMessage = userMessage || {
        id: `temp_${Date.now()}`,
        user_id: userId,
        message,
        sender: 'user',
        session_id: effectiveSessionId
      };

      // ── 3. Return crisis response early ──────
      if (crisisResponse) {
        const { data: aiMessage, error: aiMsgError } = await supabase
          .from('chat_messages')
          .insert({
            user_id: userId,
            message: crisisResponse,
            sender: 'system',
            session_id: effectiveUserMessage.session_id
          })
          .select()
          .single();

        if (aiMsgError) console.error('[Supabase] Error saving crisis response:', aiMsgError);

        return {
          user_message: effectiveUserMessage,
          ai_response: aiMessage || {
            id: `temp_ai_${Date.now()}`,
            user_id: userId,
            message: crisisResponse,
            sender: 'system',
            session_id: effectiveUserMessage.session_id
          }
        };
      }

      // ── 4. Fetch session conversation history ─
      const { data: history, error: historyError } = await supabase
        .from('chat_messages')
        .select('message, sender, created_at')
        .eq('user_id', userId)
        .eq('session_id', effectiveUserMessage.session_id) // scoped to THIS session only
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) {
        console.error('[Supabase] Error fetching history:', historyError);
      }

      const safeHistory = history || [];
      console.log(`[Chat] History loaded: ${safeHistory.length} messages`);

      // Reverse so oldest → newest for the model
      const conversationHistory = safeHistory
        .reverse()
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message
        }));

      // ── 5. Build enriched system prompt ──────
      const [userPatterns, userTopSkills] = await Promise.all([
        patternService.analyzePatterns(userId),
        skillService.getUserTopSkills(userId)
      ]);

      const patternContext = patternService.formatInsightsForGracie(userPatterns);
      const skillContext = skillService.formatSkillsForGracie(userTopSkills);
      const systemPromptWithContext = GRACIE_SYSTEM_PROMPT + patternContext + skillContext;

      // ── 6. Extract check-in data async ───────
      patternService.extractCheckInData(message)
        .then(checkInData => {
          if (checkInData) {
            patternService.saveCheckIn(userId, effectiveUserMessage.session_id, checkInData);
          }
        })
        .catch(() => {});

      // ── 7. Detect intent ─────────────────────
      const intentHint = this.detectIntent(message);
      console.log(`[Intent] ${intentHint}`);

      // ── 8. Call Groq ─────────────────────────
      console.log(`[Groq] Calling API | History: ${conversationHistory.length} msgs | Intent: ${intentHint}`);

      let aiResponse;

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPromptWithContext },
            { role: 'system', content: `User intent for this message: ${intentHint}` },
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.5,        // consistent, warm, not robotic
          max_tokens: 500,
          presence_penalty: 0.6,   // discourages revisiting topics already covered
          frequency_penalty: 0.4   // discourages repeating the same phrases
        });

        aiResponse = completion.choices[0]?.message?.content?.trim();

        if (!aiResponse) {
          throw new Error('Groq returned an empty response');
        }

        console.log(`[Groq] Success | Response length: ${aiResponse.length}`);
      } catch (groqError) {
        console.error('[Groq] Error:', groqError.message, '| Status:', groqError.status);
        throw groqError;
      }

      // ── 9. Save AI response ──────────────────
      const { data: aiMessage, error: finalAiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          message: aiResponse,
          sender: 'assistant',
          session_id: effectiveUserMessage.session_id
        })
        .select()
        .single();

      if (finalAiMsgError) {
        console.error('[Supabase] Error saving AI message:', finalAiMsgError);
      }

      return {
        user_message: effectiveUserMessage,
        ai_response: aiMessage || {
          id: `temp_ai_${Date.now()}`,
          user_id: userId,
          message: aiResponse,
          sender: 'assistant',
          session_id: effectiveUserMessage.session_id
        }
      };

    } catch (error) {
      console.error('[Chat] sendMessage fatal error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // GET CHAT HISTORY (for history route)
  // ─────────────────────────────────────────────
  async getChatHistory(userId) {
    userId = String(userId);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Supabase] Error fetching full history:', error);
      throw error;
    }

    return { success: true, messages: data || [] };
  }
}

module.exports = new ChatService();