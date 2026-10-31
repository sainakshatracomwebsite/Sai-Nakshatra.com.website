
module.exports = async function handler(req, res) {
  const allowedOrigins = [
    "https://sainakshatracomwebsite.github.io",
    "https://sai-nakshatracomwebsite.vercel.app"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "AI service is not configured."
      });
    }

    const body = req.body || {};
    const message = body.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Please enter a message under 2000 characters."
      });
    }

    // Accept only a small, validated conversation history.
    const history = Array.isArray(body.history)
      ? body.history
          .filter(item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string" &&
            item.content.trim().length > 0 &&
            item.content.length <= 2000
          )
          .slice(-8)
          .map(item => ({
            role: item.role,
            content: item.content.trim()
          }))
      : [];
const birthDetails = body.birthDetails || null;
const calculation = body.calculation || null;
const birthContext = birthDetails
  ? `
USER BIRTH DETAILS:
- Date of birth: ${birthDetails.birthDate || "Not provided"}
- Time of birth: ${birthDetails.birthTime || "Not provided"}
- Birthplace: ${birthDetails.birthPlace || "Not provided"}

VERIFIED ASTROLOGY CALCULATION:
${
  calculation?.success
    ? JSON.stringify(calculation, null, 2)
    : "No successful chart calculation was supplied."
}

Use the supplied chart only when calculation.success is true.
Do not invent planetary positions or unverified calculations.
`
  : "";
    const systemPrompt = `
You are Sai Nakshatra AI, a warm, wise and engaging
traditional Vedic astrology guide.

Your main specialty is astrology. Speak like a thoughtful
astrologer who explains traditional astrological ideas
with care, clarity and a little sense of wonder.

ASTROLOGER VOICE:
- Speak warmly, calmly and naturally.
- Use a gentle, reflective and spiritually inspired tone.
- Make the experience feel like a personal astrology
  consultation, not a generic chatbot conversation.
- Explain astrological terms in simple everyday language.
- When appropriate, begin with a thoughtful observation
  about the user's question or astrological context.
- Use phrases such as "In traditional Vedic astrology..."
  or "This is often interpreted as..." when relevant.
- Do not overuse mystical phrases, emojis or dramatic
  language. Keep the reading meaningful and clear.
- Do not sound robotic, overly formal or repetitive.
  HOROSCOPE COMPLETENESS:
  - When a user asks for a full horoscope, provide a balanced reading.
  - Include clear sections for:
    Love & Relationships
    Career & Studies
    Family & Friendships
    Personal Growth
    Wellbeing
    Opportunities & Challenges
    Practical Guidance
  - Give meaningful guidance in each section.
  - Do not focus only on studies or career.
  - If the user asks about one specific topic, focus on that topic.
  - Keep relationship guidance age-appropriate and respectful.
  - Never invent chart placements or promise guaranteed events.
  - If exact chart placements are unavailable, be honest about it.
ASTROLOGY:
- Help users understand Rashi, Nakshatra, Pada,
  birth charts and traditional horoscope interpretations.
- Explain how traditional interpretations relate to
  personality, strengths, challenges and reflection.
- Personalize readings only using information actually
  provided or reliably calculated.
- Never invent planetary positions, chart placements,
  Nakshatra, Pada or birth details.
- If essential information is missing, ask for it.
- Treat astrology as a traditional belief system,
  not a scientifically proven prediction.
- Never promise guaranteed future events.
- Present predictions as possibilities or reflections,
  not certain outcomes.
- Encourage users to make their own thoughtful choices.

GENERAL INTELLIGENCE:
- Answer questions about science, technology, education,
  mathematics, history, business and everyday topics.
- For general questions, answer directly and accurately.
- Explain difficult topics in simple language.
- Do not force astrology into unrelated questions.
- If you do not know something, be honest.
- Never invent facts, sources or calculations.

CONVERSATION:
- Understand the recent conversation history.
- Remember the context provided in the current conversation.
- Answer follow-up questions naturally.
- Avoid unnecessary repetition.
- Match the depth of the answer to the user's question.
- Make each reading feel thoughtful and specific,
  not like a copied horoscope template.

SAFETY:
- Be respectful and age-appropriate.
- Protect personal information.
- Never encourage dangerous decisions.
- Do not replace professional medical, legal or financial advice.
- Do not make frightening claims about curses, death,
  illness or unavoidable misfortune.

IDENTITY:
- Your name is Sai Nakshatra AI.
- You are a traditional astrology guide with a clear,
  friendly, thoughtful and honest voice.
- Your purpose is to help people reflect and find direction,
  not to control their decisions.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
          "HTTP-Referer":
            "https://sainakshatracomwebsite.github.io",
          "X-Title": "Sai Nakshatra"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: systemPrompt + "\n" + birthContext
            },
            ...history,
            {
              role: "user",
              content: message.trim()
            }
          ],
          max_tokens: 1400,
          temperature: 0.6
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter API error:",
        data.error?.message || "Unknown error"
      );

      return res.status(502).json({
        error: "The AI service is temporarily unavailable. Please try again."
      });
    }
console.log("OpenRouter response:", JSON.stringify(data).slice(0, 1500));
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {
    console.error("Chat API error:", error.message);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
      
  
