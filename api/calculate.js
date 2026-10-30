
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST to submit birth details."
    });
  }

  try {
    const apiKey = process.env.NAVAMSHA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Navamsha API key is not configured."
      });
    }

    const { birthDate, birthTime, birthPlace } = req.body || {};

    if (!birthDate || !birthTime || !birthPlace) {
      return res.status(400).json({
        success: false,
        error: "Please provide date, time and birthplace."
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      !/^\d{2}:\d{2}$/.test(birthTime)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid birth date or time format."
      });
    }

    const [year, month, date] = birthDate.split("-").map(Number);
    const [hours, minutes] = birthTime.split(":").map(Number);

    const checkDate = new Date(Date.UTC(year, month - 1, date));

    if (
      checkDate.getUTCFullYear() !== year ||
      checkDate.getUTCMonth() !== month - 1 ||
      checkDate.getUTCDate() !== date ||
      hours > 23 ||
      minutes > 59
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid birth date and time."
      });
    }

    // Find the birthplace coordinates and timezone.
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(birthPlace.trim()) +
      "&count=1&language=en&format=json";

    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    const place = geoData.results?.[0];

    if (!place) {
      return res.status(400).json({
        success: false,
        error: "Birthplace could not be found. Please try a more specific place."
      });
    }

    const timezone = place.timezone;

    // Get the timezone offset for the actual birth date.
    const birthMoment = new Date(
      Date.UTC(year, month - 1, date, hours, minutes)
    );

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset"
    }).formatToParts(birthMoment);

    const offsetText =
      parts.find(part => part.type === "timeZoneName")?.value || "GMT";

    const offsetMatch = offsetText.match(
      /GMT([+-])(\d{2}):(\d{2})/
    );

    let timezoneOffset = 0;

    if (offsetMatch) {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      timezoneOffset =
        sign *
        (Number(offsetMatch[2]) + Number(offsetMatch[3]) / 60);
    }

    // Request the Vedic birth chart from Navamsha.
    const astrologyResponse = await fetch(
      "https://api.navamsha.in/api/v1/kundali/basic",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify({
          year,
          month,
          date,
          hours,
          minutes,
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: timezoneOffset
        })
      }
    );

    const astrologyData = await astrologyResponse.json();

    if (!astrologyResponse.ok || !astrologyData.output) {
      console.error("Navamsha API error:", astrologyData);

      return res.status(502).json({
        success: false,
        error: "The astrology calculation service could not complete the request."
      });
    }

    const moon = astrologyData.output.planets?.Moon;

    return res.status(200).json({
      success: true,
      rashi: moon?.zodiac_sign_name || null,
      nakshatra: moon?.nakshatra_name || null,
      pada: moon?.nakshatra_pada || null,
      ascendant: astrologyData.output.ascendant || null,
      chart: astrologyData.output
    });

  } catch (error) {
    console.error("Calculation API error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Something went wrong during calculation."
    });
  }
};
