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




router.post('/update-cookie-prefs', PrefController.updateCookiePreferences);

module.exports = router;
