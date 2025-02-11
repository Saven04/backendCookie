const requestIp = require("request-ip");
const LocationData = require("../models/LocationModel");

// 📌 Function to Anonymize IP (Remove Last Octet)
function anonymizeIP(ip) {
  if (!ip) return null;
  
  // IPv4: Replace last octet (e.g., 192.168.1.25 → 192.168.1.XXX)
  if (ip.includes(".")) {
    return ip.replace(/\d+$/, "XXX");
  }
  
  // IPv6: Truncate the address (e.g., 2001:db8::ff00:42:8329 → 2001:db8::ff00:42:XXXX)
  return ip.split(":").slice(0, -1).join(":") + ":XXXX";
}

// 📌 Save Location Data with Anonymized IP
const saveLocationData = async (req, res) => {
  try {
    const clientIp = requestIp.getClientIp(req); // Get user's IP

    if (!clientIp) {
      return res.status(400).json({ message: "Unable to determine IP address." });
    }

    const anonymizedIP = anonymizeIP(clientIp);

    const { consentId, isp, city, country, latitude, longitude } = req.body;

    if (!consentId || !isp || !city || !country) {
      return res.status(400).json({ message: "Consent ID, ISP, city, and country are required." });
    }

    // Store in Database
    const locationData = new LocationData({
      consentId,
      ipAddress: anonymizedIP, // ✅ GDPR-compliant anonymized IP
      isp,
      city,
      country,
      latitude,
      longitude,
    });

    await locationData.save();
    res.status(200).json({ message: "Location data saved successfully." });

  } catch (error) {
    console.error("❌ Error saving location data:", error);
    res.status(500).json({ message: "Failed to save location data.", error: error.message });
  }
};

module.exports = { saveLocationData };
