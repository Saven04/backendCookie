const express = require("express");
const axios = require("axios");
const router = express.Router();

// Route to Get Client IP and Geolocation Data
router.get("/get-ipinfo", async (req, res) => {
  try {
    let clientIp = req.clientIp || "Unknown";

    // Handle IPv6-mapped IPv4 addresses
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data from `ipinfo.io`
    const response = await axios.get(`https://ipinfo.io/${clientIp}/json?token=10772b28291307`);

    // Extract relevant data from the response
    const { city, region, country, org, loc } = response.data;

    // Parse latitude and longitude from the `loc` field
    const [latitude, longitude] = loc ? loc.split(",").map(Number) : [null, null];

    res.json({
      ip: clientIp,
      city: city || "Unknown",
      region: region || "Unknown",
      country: country || "Unknown",
      isp: org || "Unknown",
      latitude: latitude || null,
      longitude: longitude || null,
    });
  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Internal Server Error" }); // Ensure JSON response on error
  }
});

module.exports = router;