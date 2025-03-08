// routes/cookiePrefs.js
const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/cookie-prefs - Retrieve user's cookie preferences
router.get("/", authMiddleware, async (req, res) => {
    const user = req.user;

    if (!user || !user._id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    try {
        // Find preferences by user's consentId (assumes consentId is passed or tied to user)
        const consentId = req.cookies.consentId || req.headers["consent-id"]; // Adjust based on how you send it
        if (!consentId) {
            return res.status(400).json({ message: "Consent ID not provided" });
        }

        const prefs = await CookiePreferences.findOne({ consentId, deletedAt: null });
        if (!prefs) {
            return res.status(404).json({ 
                message: "No cookie preferences found",
                preferences: {
                    strictlyNecessary: true,
                    performance: false,
                    functional: false,
                    advertising: false,
                    socialMedia: false
                }
            });
        }

        res.status(200).json(prefs);
    } catch (error) {
        console.error("Error fetching cookie preferences:", {
            message: error.message,
            stack: error.stack,
            userId: user._id
        });
        res.status(500).json({ message: "Server error fetching preferences" });
    }
});

// POST /api/cookie-prefs - Save or update cookie preferences
router.post("/", authMiddleware, async (req, res) => {
    const user = req.user;
    const { consentId, preferences } = req.body;

    if (!user || !user._id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    if (!consentId) {
        return res.status(400).json({ message: "Consent ID is required" });
    }

    if (!preferences || typeof preferences !== "object") {
        return res.status(400).json({ message: "Preferences object is required" });
    }

    // Ensure strictlyNecessary is always true
    const validatedPrefs = {
        strictlyNecessary: true,
        performance: !!preferences.performance,
        functional: !!preferences.functional,
        advertising: !!preferences.advertising,
        socialMedia: !!preferences.socialMedia
    };

    try {
        let prefs = await CookiePreferences.findOne({ consentId, deletedAt: null });

        if (prefs) {
            // Update existing preferences
            prefs.preferences = validatedPrefs;
            prefs.updatedAt = new Date(); // Optional: track updates
            await prefs.save();
            console.log(`Updated cookie preferences for consentId: ${consentId}`);
        } else {
            // Create new preferences
            prefs = new CookiePreferences({
                consentId,
                preferences: validatedPrefs,
                createdAt: new Date(),
                deletedAt: null
            });
            await prefs.save();
            console.log(`Created new cookie preferences for consentId: ${consentId}`);
        }

        res.status(200).json({ consentId: prefs.consentId, message: "Preferences saved successfully" });
    } catch (error) {
        console.error("Error saving cookie preferences:", {
            message: error.message,
            stack: error.stack,
            consentId,
            userId: user._id
        });
        res.status(500).json({ message: "Server error saving preferences" });
    }
});

module.exports = router;