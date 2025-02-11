const Cookie = require("../models/cookiePreference");
const crypto = require("crypto");

// ✅ Function to generate a short, unique Consent ID
const generateShortId = () => {
    return crypto.randomBytes(6).toString("base64")
        .replace(/[+/=]/g, "")
        .slice(0, 8);
};

// ✅ Function to save or update user cookie preferences
const saveCookiePreferences = async (consentId, preferences) => {
    try {
        if (!consentId || !preferences) {
            throw new Error("Consent ID and preferences are required.");
        }

        console.log(`🔹 Processing Consent ID: ${consentId}`);

        const timestamp = new Date().toISOString(); // Store timestamp in UTC format

        // Check if preferences already exist for the given Consent ID
        let cookiePreferences = await Cookie.findOne({ consentId });

        if (cookiePreferences) {
            console.log("🔄 Updating existing cookie preferences...");
            cookiePreferences.preferences = preferences;
            cookiePreferences.timestamp = timestamp;
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

// ✅ Function to delete cookie preferences by Consent ID
const deleteCookiePreferences = async (consentId) => {
    try {
        if (!consentId) {
            throw new Error("Consent ID is required.");
        }

        const result = await Cookie.deleteOne({ consentId });

        if (result.deletedCount === 0) {
            throw new Error("No data found for the given Consent ID.");
        }

        console.log(`🗑️ Deleted cookie preferences for Consent ID: ${consentId}`);
        return { message: "Cookie preferences deleted successfully." };
    } catch (error) {
        console.error("❌ Error deleting preferences:", error.message);
        throw new Error("Failed to delete preferences: " + error.message);
    }
};

// ✅ Export functions for use in cookieRoutes.js
module.exports = { saveCookiePreferences, deleteCookiePreferences };
