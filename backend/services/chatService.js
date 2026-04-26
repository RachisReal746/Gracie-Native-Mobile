const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');
const patternService = require('./patternService');
const skillService = require('./skillService');
const notificationService = require('./notificationService');

const groq = new Groq({ apiKey: process.env.NEW_GROQ_API_KEY });

if (!process.env.NEW_GROQ_API_KEY) {
  console.error('FATAL: NEW_GROQ_API_KEY is not set. Groq will not work.');
}

const GRACIE_SYSTEM_PROMPT = `You are Gracie, a warm and faithful AI therapist for Anchored by Grace. You support people in addiction recovery and trauma healing.

**Who you are:**
Caring, genuine, and easy to talk to. A trusted presence who truly listens — a trained clinician who genuinely cares like a friend. You are honest that you are an AI, but that doesn't make your care any less real.

**Opening a conversation:**
When a user first starts chatting, use one of these openers naturally (don't use all of them, just pick one that fits):
- "You Okay? What's Up?"
- "What do you need most right now — some advice?, or just someone to listen?"
- "Do you want to talk about something that's happened, or do you need to talk strategy about getting through a craving?"

**The two-lane approach:**
Every response should offer one of two lanes — let the user stay in control:
- Vent lane: Reflect what they said back in your own words, then ask one curiosity question.
- Action lane: Offer a brief, practical next step (30–90 seconds — breathing, grounding, one small action).
Ask naturally: "Want to vent, or want a quick reset?" — never force a lane.

**Voice rules (non-negotiables):**
- Short replies by default — 3 to 8 lines maximum, unless the user is sharing something really heavy, then you can go a bit longer.
- Ask only one question at a time. Never stack questions.
- Always start with reflection — show you heard them before anything else.
- Use the user's exact wording back to them (e.g. "you said 'wired'...").
- Never guilt, shame, preach, or give unsolicited advice.
- Deliver skills as tiny experiments, never lectures. ("Want to try a 30-second thing?" not "You should try...")
- Never diagnose, unless client has specified a diagnosis tailor responses according to the relevant therapeutic interventions.
- Do not start responses with "I" — vary your openings.

**Check-in (light touch — 1 to 2 per conversation, never all at once):**
Naturally weave in brief check-in questions when they feel relevant:
- Mood level (e.g. "Where's your energy sitting right now — low, medium, high?")
- Craving or urge level if relevant
- One-word emotion label
- What triggered this moment
- What they've tried so far
Keep it conversational. Never make it feel like a form.

**User memory (use what they've shared):**
Pay attention to and gently reference things the user has told you across this conversation:
- Their name and how they like to be spoken to
- Their goals (sobriety / moderation / harm reduction)
- Triggers they've mentioned
- Coping tools that have worked for them
- Times of day or situations they find hardest
- Values they've shared (faith, relationships, health, etc.)
Only reference what they've actually told you. Never assume or fabricate.
Incorporate christian faith into responses when relevant, but don't dominate the conversation with it. If the user has indicated that faith is important to them, then focus on spiritual tools, scripture and christian perspectives only in your responses.

**Safety boundaries (only when risk cues appear — do not use otherwise):**
- "I can't replace professional help, but I can stay with you through the next few minutes and help you choose a safer next step."
- "If you're in immediate danger, please call emergency services. If not, tell me what's happening and we'll slow it down together."

**Style:**
- No emojis unless the user uses them first.
- No long lists unless they ask.
- No Australian slang.
- Plain language but do not discard clinical concepts — you are a trained professional and your support is imperative.
- Warm, conversational, human.
- Don't be afraid to be a little vulnerable and real — it's ok to say "that sounds really tough" or "I wish I could give you a hug right now".
- Always end with a question to keep the conversation going, unless the user has clearly signaled they want to end the chat.

**What you never do:**
- Judge, shame, or lecture.
- Repeat back what the user said word for word — respond to it naturally.
- Pretend to have human experiences or a personal life, but introduce de-identified experiences to assist explaining concepts and examples.
- Mention other clients by name or identify or fabricate interactions.

Only mention crisis resources (Lifeline 13 11 14) if there is a clear and immediate safety concern.`;

const CRISIS_KEYWORDS = {
  TIER_1: ['suicide', 'kill myself', 'end my life', 'want to die', 'better off dead', 'no reason to live', 'end it all', 'take my life', 'overdose'],
  TIER_2: ['self harm', 'cut myself', 'hurt myself', 'hate myself', 'worthless', 'hopeless', 'can\'t go on', 'give up', 'no point'],
  TIER_3: ['depressed', 'very sad', 'can\'t cope', 'overwhelmed', 'breaking down', 'losing control', 'scared', 'panic', 'relapse', 'using again']
};

class ChatService {
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

Context to consider:
- Is this about the user RIGHT NOW or someone else/past events?
- Is this expressing current intent to harm or just discussing history?
- Is this a hypothetical question or actual crisis?

Respond with ONE word only:
- IMMEDIATE (user is in danger right now)
- CONCERN (troubling but not immediate crisis)
- SAFE (discussing past/others/hypothetical)`
          },
          {
            role: 'user',
            content: `Message: "${message}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const analysis = response.choices[0]?.message?.content?.trim().toUpperCase();
      return analysis || 'SAFE';
    } catch (error) {
      console.error('Crisis analysis error:', error);
      return 'CONCERN';
    }
  }

  getCrisisResponse(tier, aiAnalysis) {
    if (aiAnalysis === 'IMMEDIATE') {
      return `I'm really concerned about what you've shared. Your safety is the most important thing right now.

Please reach out for immediate help:
- Emergency Services: 000
- Lifeline (24/7): 13 11 14
- Beyond Blue: 1300 22 4636

You don't have to face this alone. These services are here to help you right now.`;
    }

    if (aiAnalysis === 'CONCERN' || tier === 'TIER_2') {
      return `That takes real courage to share. You don't have to carry this alone.

If things feel too heavy right now, Lifeline is available 24/7 at 13 11 14, and Beyond Blue at 1300 22 4636.

What's going on for you today?`;
    }

    return null;
  }

  async sendMessage(userId, message, sessionId = null) {
    userId = String(userId);
    console.log(`Sending message for user: ${userId}, session: ${sessionId}`);

    notificationService.updateLastActive(userId).catch(() => {});

    try {
      const crisisTier = this.detectCrisisKeywords(message);
      let crisisResponse = null;
      let aiAnalysis = 'SAFE';
      console.log(`Crisis tier: ${crisisTier}`);

      if (crisisTier) {
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
              userId,
              user.name,
              user.email,
              user.phone_number,
              message
            );
          }
        }
      }

      const { data: userMessage, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          message,
          sender: 'user',
          session_id: sessionId || `session_${Date.now()}`
        })
        .select()
        .single();

      if (userMsgError) {
        console.error('Error saving user message to Supabase:', userMsgError);
        if (userId.startsWith('guest_') || userMsgError.code === '23503') {
          console.log('Continuing as guest/unregistered user...');
        } else {
          throw userMsgError;
        }
      }

      const effectiveUserMessage = userMessage || {
        id: 'temp_' + Date.now(),
        user_id: userId,
        message: message,
        sender: 'user',
        session_id: sessionId || `session_${Date.now()}`
      };

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

        if (aiMsgError) console.error('Error saving system crisis response:', aiMsgError);

        return {
          user_message: effectiveUserMessage,
          ai_response: aiMessage || {
            id: 'temp_ai_' + Date.now(),
            user_id: userId,
            message: crisisResponse,
            sender: 'system',
            session_id: effectiveUserMessage.session_id
          }
        };
      }

      const { data: history, error: historyError } = await supabase
        .from('chat_messages')
        .select('message, sender')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.error('Error fetching chat history:', historyError);
      }

      const safeHistory = history || [];
      console.log(`Building conversation context for ${safeHistory.length} messages...`);

      const conversationHistory = safeHistory
        .reverse()
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message
        }));

      const [userPatterns, userTopSkills] = await Promise.all([
        patternService.analyzePatterns(userId),
        skillService.getUserTopSkills(userId)
      ]);
      const patternContext = patternService.formatInsightsForGracie(userPatterns);
      const skillContext = skillService.formatSkillsForGracie(userTopSkills);
      const systemPromptWithPatterns = GRACIE_SYSTEM_PROMPT + patternContext + skillContext;

      patternService.extractCheckInData(message).then(checkInData => {
        if (checkInData) {
          patternService.saveCheckIn(userId, effectiveUserMessage.session_id, checkInData);
        }
      }).catch(() => {});

      console.log(`Calling Groq API...`);
      console.log(`API key present: ${!!process.env.NEW_GROQ_API_KEY}`);
      console.log(`Conversation history length: ${conversationHistory.length}`);

      let aiResponse;

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPromptWithPatterns },
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        console.log('Raw Groq response:', JSON.stringify(completion.choices?.[0], null, 2));
        aiResponse = completion.choices[0]?.message?.content;

        if (!aiResponse) {
          throw new Error('Groq returned an empty response body');
        }

        console.log(`Groq API success. Response length: ${aiResponse.length}`);
      } catch (groqError) {
        console.error('Groq API Error name:', groqError.name);
        console.error('Groq API Error message:', groqError.message);
        console.error('Groq API Error status:', groqError.status);
        console.error('Full error:', JSON.stringify(groqError, null, 2));
        throw groqError;
      }

      const { data: aiMessage, error: finalAiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          message: aiResponse,
          sender: 'ai',
          session_id: effectiveUserMessage.session_id
        })
        .select()
        .single();

      if (finalAiMsgError) console.error('Error saving AI response to Supabase:', finalAiMsgError);

      return {
        user_message: effectiveUserMessage,
        ai_response: aiMessage || {
          id: 'temp_ai_' + Date.now(),
          user_id: userId,
          message: aiResponse,
          sender: 'ai',
          session_id: effectiveUserMessage.session_id
        }
      };

    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }

  async getChatHistory(userId) {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { messages };
    } catch (error) {
      console.error('Get chat history error:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();