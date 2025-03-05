const Consent = require("../models/consent");

// Save Preferences and Location Data
exports.savePreferences = async (req, res) => {
  try {
    const { userId, preferences, locationData } = req.body;

    // Validate input
    if (!userId || !preferences) {
      return res.status(400).json({ message: "User ID and preferences are required." });
    }

    // Save preferences and location data
    const newConsent = new Consent({
      userId,
      preferences,
      locationData: locationData || {}, // Optional location data
    });

    await newConsent.save();

    res.status(201).json({ message: "Preferences and location data saved successfully." });
  } catch (error) {
    console.error("Error saving preferences:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Fetch Preferences and Location Data
exports.getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Fetch preferences and location data
    const consent = await Consent.findOne({ userId });
    if (!consent) {
      return res.status(404).json({ message: "Preferences not found for this user." });
    }

    res.status(200).json({
      preferences: consent.preferences,
      locationData: consent.locationData,
      createdAt: consent.createdAt,
      updatedAt: consent.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};