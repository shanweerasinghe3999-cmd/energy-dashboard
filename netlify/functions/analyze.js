exports.handler = async (event) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { avgPower, peakHour, currentPower, bill, trend, anomaly } = JSON.parse(event.body);

    const prompt = `You are an energy analysis assistant for a Sri Lankan household smart energy monitoring system. Based on this real sensor data:
- Current power usage: ${currentPower}W
- Recent average power: ${avgPower}W
- Peak usage hour: ${peakHour}
- Estimated monthly bill: LKR ${bill}
- Usage trend: ${trend}% ${trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable"}
- Anomaly detected: ${anomaly ? "Yes, unusual spike" : "No, normal usage"}

Give a short, practical energy-saving recommendation in 2-3 sentences, in plain English, addressed directly to the homeowner. Be specific and actionable, not generic.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Gemini API error" })
      };
    }

    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || "No insight generated.";

    return {
      statusCode: 200,
      body: JSON.stringify({ insight })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};