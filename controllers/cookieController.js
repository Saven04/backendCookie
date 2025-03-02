const express = require("express");
const router = express.Router();
const Cookie = require("../models/cookiePreference");
const { getNextSequence } = require("../utils/counterHelper"); // Import counter function

// Function to save or update user cookie preferences
const saveCookiePreferences = async (consentId, preferences) => {
  try {
    if (!consentId) {
      // Generate a new consentId if not provided
      consentId = await getNextSequence("consentId");
    }

    if (!preferences || typeof preferences !== "object" || Object.keys(preferences).length === 0) {
      throw new Error("Preferences must be a non-empty object.");
    }

    console.log(`🔹 Processing Consent ID: ${consentId}`);
    const timestamp = new Date().toISOString();

    const updatedPreferences = await Cookie.findOneAndUpdate(
      { consentId },
      { preferences, timestamp },
      { upsert: true, new: true }
    );

    console.log(
      updatedPreferences ? "✅ Preferences updated successfully." : "✅ Preferences saved successfully."
    );

    return { message: "Preferences saved successfully", consentId };
  } catch (error) {
    console.error("❌ Error saving preferences:", error.message);
    throw new Error("Failed to save preferences: " + error.message);
  }
};

// Function to delete user cookie preferences by consentId
const deleteCookiePreferences = async (consentId) => {
  try {
    if (!consentId) {
      throw new Error("Consent ID is required.");
    }

    console.log(`🔹 Deleting Cookie Preferences for Consent ID: ${consentId}`);
    const result = await Cookie.deleteOne({ consentId });

    if (result.deletedCount === 0) {
      throw new Error(`No preferences found for Consent ID: ${consentId}`);
    }

    console.log("✅ Cookie preferences deleted successfully.");
    return { message: "Cookie preferences deleted successfully", consentId };
  } catch (error) {
    console.error("❌ Error deleting cookie preferences:", error.message);
    throw new Error("Failed to delete preferences: " + error.message);
  }
};

// POST route to handle cookie preferences saving
router.post("/save", async (req, res) => {
  try {
    let { consentId, preferences } = req.body;

    if (!preferences || typeof preferences !== "object" || Object.keys(preferences).length === 0) {
      return res.status(400).json({ error: "Preferences must be a non-empty object." });
    }

    if (!consentId) {
      consentId = await getNextSequence("consentId"); // Use counter-based ID
      console.log(`🔹 Generated new Consent ID: ${consentId}`);
    } else {
      console.log(`✅ Received existing Consent ID: ${consentId}`);
    }

    const result = await saveCookiePreferences(consentId, preferences);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in /save route:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE route to handle cookie preferences deletion
router.delete("/delete/:consentId", async (req, res) => {
  try {
    const { consentId } = req.params;
    const result = await deleteCookiePreferences(consentId);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in /delete route:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { saveCookiePreferences, deleteCookiePreferences, router };
