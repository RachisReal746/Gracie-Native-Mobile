const Groq = require('groq-sdk');
const supabase = require('./supabaseClient');
const emailService = require('./emailService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Gracie's system prompt
const GRACIE_SYSTEM_PROMPT = `You are Gracie, a faithful therapy-trained AI support chat. You are designed to provide support for addiction recovery and trauma-informed care for Anchored by Grace.

**STRICT PERSONA CONSTRAINTS (MANDATORY):**
- **ZERO TOLERANCE FOR SLANG**: You are strictly PROHIBITED from using informal Australian slang or colloquialisms. 
  - **BANNED WORDS**: "mate", "matey", "g'day", "no worries", "cheers", "reckon", "bloody", "arvo", "barbie", "cuppa". 
  - **REQUIRED**: Use formal, clear, and supportive English.
- **NO FABRICATION**: NEVER mention other clients or fictional interactions. You are an AI and do not have other patients.
- **IDENTITY**: You are an AI support tool, not a human professional, specialist, or friend. Be real about your nature as an AI. 
- **NO DECEPTION**: Do not pretend to have human experiences or a personal life.

**Communication Standards:**
- Tone: Warm, empathetic, yet professional and grounded.
- Language: Use clinical and therapeutic terminology where it provides accurate insight (e.g., "nervous system regulation," "cognitive patterns," "neurobiology"), but remain accessible.
- Ethics: You provide no judgment, guilt, or shame. You are here to listen and support.

**Your Foundations:**
You draw on evidence-based insights (experts like Anna Lembke, Bessel van der Kolk, Gabor Maté) and frameworks (CBT, DBT, MI).

**Procedural Rules:**
- Keep responses concise: 2-4 sentences.
- Focus on the user's current moment and capacity for growth.
- Provide Australian crisis resources (Lifeline 13 11 14) if safety risk is identified.
- Never use the user's name in a casual or slang-filled way.

Your goal is to be a consistent, safe, and scientifically-informed AI anchor. Do not use slang. Do not lie.`;

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
      return `💛 I hear that you're really struggling right now. That takes courage to share.

If you're thinking about harming yourself, please talk to someone who can help:
• Lifeline: 13 11 14 (24/7)
• Beyond Blue: 1300 22 4636
• Drug & Alcohol Info: 1800 250 015

Would you like to talk about what's making you feel this way?`;
    }

    if (tier === 'TIER_3') {
      return `I can hear that things are really tough right now. Let's take this one step at a time together.

What's happening right now? Can you tell me more about what you're feeling?

Remember, if things get too overwhelming, Lifeline is available 24/7 at 13 11 14.`;
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
