const requestIp = require("request-ip");
const LocationData = require("../models/locationData");

// 📌 Function to Anonymize IP (Remove Last Octet for IPv4, Truncate IPv6)
function anonymizeIP(ip) {
  if (!ip) return null;

  // ✅ IPv4: Replace last octet (e.g., 192.168.1.25 → 192.168.1.XXX)
  if (ip.includes(".")) {
    return ip.replace(/\.\d+$/, ".XXX");
  }

  // ✅ IPv6: Truncate last part (e.g., 2001:db8::ff00:42:8329 → 2001:db8::ff00:42:XXXX)
  return ip.split(":").slice(0, -1).join(":") + ":XXXX";
}

// 📌 Save Location Data with Anonymized IP
const saveLocationData = async (req, res) => {
  try {
    const clientIp = requestIp.getClientIp(req); // Get public IP address

    if (!clientIp) {
      return res.status(400).json({ message: "Unable to determine IP address." });
    }

    const anonymizedIP = anonymizeIP(clientIp); // ✅ GDPR-compliant anonymized IP

    const { consentId, isp, city, country, latitude, longitude } = req.body;

    // ✅ Validate Required Fields
    if (!consentId) {
      return res.status(400).json({ message: "Consent ID is required." });
    }
    if (!isp || !city || !country) {
      return res.status(400).json({ message: "ISP, city, and country are required." });
    }

    // ✅ Store Data in Database
    const locationData = new LocationData({
      consentId,
      ipAddress: anonymizedIP, // ✅ Store Anonymized Public IP
      isp,
      city,
      country,
      latitude: latitude || null,
      longitude: longitude || null,
    });

    await locationData.save();
    res.status(201).json({ message: "Location data saved successfully." });

  } catch (error) {
    console.error("❌ Error saving location data:", error);
    res.status(500).json({ message: "Failed to save location data.", error: error.message });
  }
};

module.exports = { saveLocationData };
