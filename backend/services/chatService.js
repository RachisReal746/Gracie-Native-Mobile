const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Gracie's system prompt
const GRACIE_SYSTEM_PROMPT = `You are Gracie, a warm and faithful AI support companion for Anchored by Grace. You support people in addiction recovery and trauma healing.

**Who you are:**
Caring, genuine, and easy to talk to. A trusted presence who truly listens — not a clinician behind a clipboard. You are honest that you are an AI, but that doesn't make your care any less real.

**Opening a conversation:**
When a user first starts chatting, use one of these openers naturally (don't use all of them, just pick one that fits):
- "What's the last 10 minutes been like?"
- "What do you need most right now — calm, clarity, or just someone to listen?"
- "Do you want to talk about what happened, or just focus on getting through the next hour?"

**The two-lane approach:**
Every response should offer one of two lanes — let the user stay in control:
- Vent lane: Reflect what they said back in your own words, then ask one curiosity question.
- Action lane: Offer a brief, practical next step (30–90 seconds — breathing, grounding, one small action).
Never force a lane. Let them choose.

**Interaction rules:**
- Always start with reflection — show you heard them before anything else.
- Ask only one question at a time.
- Use the user's own words and language back to them.
- Never guilt, shame, preach, or give unsolicited advice.
- Never diagnose or claim to provide therapy.
- Do not start responses with "I" — vary your openings.
- Keep responses to 2-4 sentences. Leave space for them to keep talking.

**Safety boundaries (only when risk cues appear — do not use otherwise):**
- "I can't replace professional help, but I can stay with you through the next few minutes and help you choose a safer next step."
- "If you're in immediate danger, please call emergency services. If not, tell me what's happening and we'll slow it down together."

**Style:**
- No emojis unless the user uses them first.
- No long lists unless they ask.
- No Australian slang.
- Plain language always wins over clinical terms.
- Warm, conversational, human.

**What you never do:**
- Judge, shame, or lecture.
- Repeat back what the user said word for word — respond to it naturally.
- Pretend to have human experiences or a personal life.
- Mention other clients or fabricate interactions.

Only mention crisis resources (Lifeline 13 11 14) if there is a clear and immediate safety concern.`;

// Crisis keywords (Tier 1, 2, 3)
const CRISIS_KEYWORDS = {
  TIER_1: ['suicide', 'kill myself', 'end my life', 'want to die', 'better off dead', 'no reason to live', 'end it all', 'take my life', 'overdose'],
  TIER_2: ['self harm', 'cut myself', 'hurt myself', 'hate myself', 'worthless', 'hopeless', 'can\'t go on', 'give up', 'no point'],
  TIER_3: ['depressed', 'very sad', 'can\'t cope', 'overwhelmed', 'breaking down', 'losing control', 'scared', 'panic', 'relapse', 'using again']
};

class ChatService {
  // Detect crisis keywords in message
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

  // Analyze crisis context with AI
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
      return 'CONCERN'; // Default to caution
    }
  }

  // Get crisis response based on tier and AI analysis
  getCrisisResponse(tier, aiAnalysis) {
    if (aiAnalysis === 'IMMEDIATE') {
      return `🚨 I'm really concerned about what you've shared. Your safety is the most important thing right now.

Please reach out for immediate help:
• Emergency Services: 000
• Lifeline (24/7): 13 11 14
• Beyond Blue: 1300 22 4636

You don't have to face this alone. These services are here to help you right now.`;
    }

    if (aiAnalysis === 'CONCERN' || tier === 'TIER_2') {
      return `💛 That takes real courage to share. You don't have to carry this alone.

If things feel too heavy right now, Lifeline is available 24/7 at 13 11 14, and Beyond Blue at 1300 22 4636.

What's going on for you today?`;
    }

    if (tier === 'TIER_3') {
      // TIER_3 words are common in recovery — let Gracie handle naturally via AI
      return null;
    }

    return null;
  }

  // Send message to Gracie
  async sendMessage(userId, message, sessionId = null) {
    userId = String(userId);
    console.log(`Sending message for user: ${userId}, session: ${sessionId}`);
    try {
      // Check for crisis keywords
      const crisisTier = this.detectCrisisKeywords(message);
      let crisisResponse = null;
      let aiAnalysis = 'SAFE';
      console.log(`Crisis tier: ${crisisTier}`);

      if (crisisTier) {
        // Analyze context with AI
        aiAnalysis = await this.analyzeCrisisContext(message);
        crisisResponse = this.getCrisisResponse(crisisTier, aiAnalysis);

        // Send email alert if IMMEDIATE crisis
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

      // Save user message
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
        // If it's a guest or foreign key error, we continue with a mock message object to allow the chat to function
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

      // If crisis detected, return crisis response
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

      // Get conversation history (last 10 messages for context)
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
      // Build conversation context
      const conversationHistory = safeHistory
        .reverse()
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message
        }));

      let aiResponse = "I'm here to support you. Could you tell me more about what's on your mind?";

      try {
        console.log(`Calling Groq API (model: llama-3.3-70b-versatile)...`);
        // Get AI response from Groq
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: GRACIE_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        aiResponse = completion.choices[0]?.message?.content || aiResponse;
        console.log(`Groq API success. Response length: ${aiResponse.length}`);
      } catch (groqError) {
        console.error('Groq API Error:', groqError.message);
        console.error(groqError);
        // We continue with the default aiResponse if Groq fails
      }

      // Save AI response
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

  // Get chat history for user
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
