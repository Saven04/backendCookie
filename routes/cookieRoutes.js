const express = require("express");
const { saveCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData } = require("../controllers/locationController");
const PrefController = require('../controllers/PreferenceController');
const crypto = require("crypto");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// Generate a short consent ID (only if necessary)
const generateShortId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(6);
    return bytes.toString("base64")
                .replace(/[+/=]/g, "") 
                .slice(0, 8);
};

// 👉 **Updated POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
    try {
        console.log("Received request body:", req.body);

        let { consentId, preferences } = req.body;

        // If consentId is not provided, generate a new one
        if (!consentId) {
            consentId = generateShortId();
        }

        // Validate preferences
        if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
            return res.status(400).json({ message: "Invalid or missing preferences object." });
        }

        // Ensure required keys are present
        const requiredKeys = ["strictlyNecessary", "performance", "functional", "advertising", "socialMedia"];
        for (const key of requiredKeys) {
            if (!(key in preferences)) {
                return res.status(400).json({ message: `Missing required key: ${key}` });
            }
        }

        // Save to database
        await saveCookiePreferences(consentId, preferences);

        // ✅ **Return the same `consentId` to be used for location data**
        res.status(200).json({ 
            message: "Cookie preferences saved successfully.",
            consentId
        });

    } catch (error) {
        console.error("Error saving cookie preferences:", error);
        res.status(500).json({
            message: "Failed to save cookie preferences.",
            error: error.message || "Unknown error",
        });
    }
});

// 👉 **Updated POST Route to Save Location Data**
router.post("/location", async (req, res) => {
    try {
        let { consentId, ipAddress, country, region, purpose, consentStatus } = req.body;

        // Validate required fields
        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }
        if (!ipAddress || !country || !purpose || !consentStatus) {
            return res.status(400).json({ message: "IP address, country, purpose, and consent status are required." });
        }

        // Validate data types
        if ([consentId, ipAddress, country, purpose, consentStatus].some(field => typeof field !== "string")) {
            return res.status(400).json({ message: "Consent ID, IP address, country, purpose, and consent status must be strings." });
        }
        if (region && typeof region !== "string") {
            return res.status(400).json({ message: "Region must be a string if provided." });
        }

        // Validate IP address format
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ipAddress)) {
            return res.status(400).json({ message: "Invalid IP address format." });
        }

        // Validate purpose and consentStatus against schema enums
        const validPurposes = ["gdpr-jurisdiction", "consent-logging", "security"];
        if (!validPurposes.includes(purpose)) {
            return res.status(400).json({ message: "Invalid purpose. Must be one of: " + validPurposes.join(", ") });
        }
        const validConsentStatuses = ["accepted", "rejected", "not-applicable"];
        if (!validConsentStatuses.includes(consentStatus)) {
            return res.status(400).json({ message: "Invalid consent status. Must be one of: " + validConsentStatuses.join(", ") });
        }

        // Save location data to MongoDB
        const locationData = new Location({
            consentId,
            ipAddress, // Will be anonymized by schema setter if enabled
            country,
            region: region || null, // Optional field
            purpose,
            consentStatus
        });
        await locationData.save();

        res.status(200).json({ message: "Location data saved successfully for GDPR compliance." });
    } catch (error) {
        console.error("Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});

router.post('/update-cookie-prefs', PrefController.updateCookiePreferences);

module.exports = router;
