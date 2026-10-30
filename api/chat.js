
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
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "AI service is not configured."
      });
    }

    const message = req.body && req.body.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Please enter a message under 2000 characters."
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "gpt-5.5",
          instructions:
            "You are the Sai Nakshatra guidance assistant. " +
            "Be respectful, supportive, clear and age-appropriate. " +
            "Astrology is a traditional belief system, not a scientifically " +
            "proven way to predict the future. Never present predictions " +
            "as guaranteed facts. Encourage thoughtful personal decisions.",
          input: message.trim(),
          max_output_tokens: 400
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data.error?.message);
      return res.status(502).json({
        error: "The AI service could not complete your request."
      });
    }

    return res.status(200).json({
      reply: data.output_text || "I couldn't generate a reply. Please try again."
    });

  } catch (error) {
    console.error("Chat API error:", error.message);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
  
