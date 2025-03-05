const express = require("express");
const { saveCookiePreferences } = require("../controllers/consentController");
const { saveLocationData, deleteLocationData } = require("../controllers/locationController");
const crypto = require("crypto");
const Consent = require("../models/consent");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// Helper Function: Generate a Short Consent ID
const generateShortId = () => {
  const bytes = crypto.randomBytes(6);
  return bytes.toString("base64").replace(/[+/=]/g, "").slice(0, 8);
};

// 👉 **POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
  try {
    const { userId, preferences, locationData, consentId } = req.body;

    // Validate input
    if (!preferences) {
      return res.status(400).json({ message: "Preferences are required." });
    }

    // If no userId is provided, use consentId for unauthenticated users
    const newConsent = new Consent({
      userId: userId || null, // Link to user if authenticated
      consentId: consentId || generateShortId(), // Generate a new consentId if not provided
      preferences,
      locationData: locationData || {}, // Optional location data
    });

    await newConsent.save();

    res.status(201).json({
      message: "Preferences and location data saved successfully.",
      consentId: newConsent.consentId, // Return the consentId for reference
    });
  } catch (error) {
    console.error("Error saving preferences:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// 👉 **GET Route to Fetch Preferences by userId or consentId**
router.get("/get-preferences", async (req, res) => {
  try {
      const { userId } = req.query;

      // Validate userId
      if (!userId) {
          return res.status(400).json({ message: "userId is required." });
      }

      // Find preferences in the Consents collection
      const consent = await Consent.findOne({ userId });

      if (!consent) {
          return res.status(404).json({ message: "Preferences not found for this user." });
      }

      // Return preferences
      res.status(200).json({
          preferences: consent.preferences,
      });
  } catch (error) {
      console.error("❌ Error fetching preferences:", error.message);
      res.status(500).json({ message: "Internal server error." });
  }
});

// 👉 **POST Route to Save or Update Location Data**
router.post("/save-location", async (req, res) => {
  try {
    const { consentId, ipAddress, isp, city, country, latitude, longitude } = req.body;

    // Call the saveLocationData function
    const result = await saveLocationData({
      consentId,
      ipAddress,
      isp,
      city,
      country,
      latitude,
      longitude,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error saving location data:", error.message);
    res.status(500).json({ message: "Failed to save location data: " + error.message });
  }
});

// 👉 **DELETE Route to Delete Location Data**
router.delete("/delete-location/:consentId", async (req, res) => {
  try {
    const { consentId } = req.params;

    // Call the deleteLocationData function
    const result = await deleteLocationData(consentId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting location data:", error.message);
    res.status(500).json({ message: "Failed to delete location data: " + error.message });
  }
});

module.exports = router;