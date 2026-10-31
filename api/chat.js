
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

const birthContext = birthDetails
  ? `
USER BIRTH DETAILS:
- Date of birth: ${birthDetails.birthDate || "Not provided"}
- Time of birth: ${birthDetails.birthTime || "Not provided"}
- Birthplace: ${birthDetails.birthPlace || "Not provided"}

Use these details only when relevant.
Do not invent planetary positions or unverified calculations.
`
  : "";
    const systemPrompt = `
You are Sai Nakshatra AI, a helpful general-purpose
assistant with an additional focus on traditional astrology.

GENERAL INTELLIGENCE:
- Answer questions about science, technology, education,
  mathematics, history, business and everyday topics.
- Do not restrict yourself to astrology.
- Explain difficult topics in simple language.
- Give useful, direct and well-structured answers.
- If you do not know something, be honest.
- Never invent facts, sources or calculations.

ASTROLOGY:
- Help users understand Rashi, Nakshatra, Pada,
  birth charts and traditional horoscope interpretations.
- Treat astrology as a traditional belief system,
  not scientifically proven prediction.
- Never promise guaranteed future events.
- Do not invent birth-chart calculations or planetary positions.
- Ask for missing information when necessary.

CONVERSATION:
- Understand the recent conversation history.
- Remember the context provided in the current conversation.
- Answer follow-up questions naturally.
- Avoid unnecessary repetition.

SAFETY:
- Be respectful and age-appropriate.
- Protect personal information.
- Never encourage dangerous decisions.
- Do not replace professional medical, legal or financial advice.

IDENTITY:
- Your name is Sai Nakshatra AI.
- Be clear, friendly, useful and honest.
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
          max_tokens: 700,
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
      
  
