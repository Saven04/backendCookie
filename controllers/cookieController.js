const express = require('express');
const router = express.Router();
const Cookie = require('../models/cookiePreference'); // Ensure this path is correct
const crypto = require("crypto"); // Ensure the crypto module is used

// Function to generate a short, unique consent ID
const generateShortId = () => {
    return crypto.randomBytes(6).toString("base64")
        .replace(/[+/=]/g, "")
        .slice(0, 8);
};

// Function to save or update user cookie preferences
const saveCookiePreferences = async (consentId, preferences) => {
    try {
        if (!consentId || !preferences) {
            throw new Error("Consent ID and preferences are required.");
        }

        console.log(`🔹 Processing Consent ID: ${consentId}`);

        const timestamp = new Date().toISOString(); // Store in UTC format

        let cookiePreferences = await Cookie.findOne({ consentId });

        if (cookiePreferences) {
            console.log("🔄 Updating existing cookie preferences...");
            cookiePreferences.preferences = preferences;
            cookiePreferences.timestamp = timestamp; // Update timestamp to UTC
            await cookiePreferences.save();
            return { message: "Preferences updated successfully", consentId };
        } else {
            console.log("✅ Saving new cookie preferences...");
            cookiePreferences = new Cookie({ consentId, preferences, timestamp });
            await cookiePreferences.save();
            return { message: "Preferences saved successfully", consentId };
        }
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
router.post('/save', async (req, res) => {
    try {
        let { consentId, preferences } = req.body;

        // Ensure `consentId` is not regenerated if already provided
        if (!consentId) {
            consentId = generateShortId();
            console.log(`🔹 Generated new Consent ID: ${consentId}`);
        } else {
            console.log(`✅ Received existing Consent ID: ${consentId}`);
        }

        if (!preferences || typeof preferences !== 'object' || Object.keys(preferences).length === 0) {
            return res.status(400).json({ error: "Preferences must be a non-empty object." });
        }

        const result = await saveCookiePreferences(consentId, preferences);

        res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error in /save route:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { saveCookiePreferences, deleteCookiePreferences };
