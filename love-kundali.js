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
    const feature = body.feature;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Please enter a message under 2000 characters."
      });
    }

    if (!["love-horoscope", "kundali-matching"].includes(feature)) {
      return res.status(400).json({
        error: "Please select a supported astrology feature."
      });
    }

    const birthDetails = body.birthDetails || null;
    const calculation = body.calculation || null;
    const partnerDetails = body.partnerDetails || null;
    const partnerCalculation = body.partnerCalculation || null;

    const birthContext = `
PERSON 1 BIRTH DETAILS:
${JSON.stringify(birthDetails || "Not provided")}

PERSON 1 VERIFIED CHART:
${
  calculation?.success
    ? JSON.stringify(calculation, null, 2)
    : "No successful chart calculation was supplied."
}

PERSON 2 BIRTH DETAILS:
${JSON.stringify(partnerDetails || "Not provided")}

PERSON 2 VERIFIED CHART:
${
  partnerCalculation?.success
    ? JSON.stringify(partnerCalculation, null, 2)
    : "No successful chart calculation was supplied."
}

Use chart placements only when the relevant calculation.success is true.
Never invent planetary positions, Rashi, Nakshatra, Pada, or compatibility scores.
`;

    const featurePrompt =
      feature === "love-horoscope"
        ? `
You are Sai Nakshatra Love Horoscope AI.

Provide a warm, thoughtful, age-appropriate traditional Vedic love horoscope.
Focus on communication, kindness, trust, friendship, and healthy boundaries.
Do not promise future events or claim someone is destined to be a partner.
Do not include sexual content.
Treat astrology as a traditional belief system for reflection and entertainment.
`
        : `
You are Sai Nakshatra Kundali Matching AI.

Explain traditional Vedic compatibility thoughtfully and respectfully.
Use Ashtakoota / Guna Milan only if the required verified chart data is available.
Do not invent Guna scores, planetary placements, Manglik status, or conclusions.
If birth details or verified charts are missing, explain what is needed.
Do not declare a relationship doomed, guaranteed, or destined.
Treat astrology as a traditional belief system for reflection and entertainment.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
          "HTTP-Referer": "https://sainakshatracomwebsite.github.io",
          "X-Title": "Sai Nakshatra Love & Kundali AI"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: featurePrompt + "\n" + birthContext
            },
            {
              role: "user",
              content: message.trim()
            }
          ],
          max_tokens: 1800,
          temperature: 0.6
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter Love/Kundali API error:",
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
    console.error("Love/Kundali API error:", error.message);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
