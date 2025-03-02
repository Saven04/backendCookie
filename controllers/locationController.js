const Location = require("../models/locationData");
const { getNextSequence } = require("../utils/counterHelper"); // Import counter helper

// Function to save or update location data
const saveLocationData = async ({ consentId, ipAddress, isp, city, country }) => {
  try {
    if (!consentId) {
      // Generate a new consentId if not provided
      consentId = await getNextSequence("consentId");
    }

    if (!ipAddress || !isp || !city || !country) {
      throw new Error("Missing required fields: ipAddress, isp, city, and country are mandatory.");
    }

    console.log(`🔹 Processing Location Data for Consent ID: ${consentId}`);

    // Use findOneAndUpdate with upsert to avoid separate queries
    const updatedLocation = await Location.findOneAndUpdate(
      { consentId },
      { ipAddress, isp, city, country },
      { upsert: true, new: true }
    );

    console.log(updatedLocation ? "✅ Location data saved/updated successfully." : "✅ New location data saved.");
    return { message: "Location data saved successfully.", consentId };
  } catch (error) {
    console.error("❌ Error saving location data:", error.message);
    throw new Error("Failed to save location data: " + error.message);
  }
};

module.exports = { saveLocationData };
