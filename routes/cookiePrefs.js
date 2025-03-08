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
        // Retrieve consentId from cookies (primary source per your flow)
        const consentId = req.cookies.consentId || req.body.consentId || req.query.consentId;
        if (!consentId) {
            return res.status(400).json({ message: "Consent ID not provided" });
        }

        // Find preferences tied to user._id and consentId
        const prefs = await CookiePreferences.findOne({ 
            userId: user._id, 
            consentId, 
            deletedAt: null 
        });

        if (!prefs) {
            return res.status(404).json({ 
                message: "No cookie preferences found for this user and consent ID",
                preferences: {
                    strictlyNecessary: true,
                    performance: false,
                    functional: false,
                    advertising: false,
                    socialMedia: false
                }
            });
        }

        res.status(200).json({
            consentId: prefs.consentId,
            preferences: prefs.preferences,
            message: "Preferences retrieved successfully"
        });
    } catch (error) {
        console.error("Error fetching cookie preferences:", {
            message: error.message,
            stack: error.stack,
            userId: user._id,
            consentId: req.cookies.consentId || req.body.consentId || req.query.consentId
        });
        res.status(500).json({ message: "Server error fetching preferences" });
    }
});

// POST /api/cookie-prefs - Update existing cookie preferences
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

    const validatedPrefs = {
        strictlyNecessary: true, // Always true
        performance: !!preferences.performance,
        functional: !!preferences.functional,
        advertising: !!preferences.advertising,
        socialMedia: !!preferences.socialMedia
    };

    try {
        // Find existing preferences by user._id and consentId
        const prefs = await CookiePreferences.findOne({ 
            userId: user._id, 
            consentId, 
            deletedAt: null 
        });

        if (!prefs) {
            return res.status(404).json({ 
                message: "Consent ID not found for this user. Cannot update non-existent preferences." 
            });
        }

        // Update existing preferences
        prefs.preferences = validatedPrefs;
        prefs.updatedAt = new Date();
        await prefs.save();

        res.status(200).json({ 
            consentId: prefs.consentId, 
            preferences: prefs.preferences,
            message: "Preferences updated successfully" 
        });
    } catch (error) {
        console.error("Error updating cookie preferences:", {
            message: error.message,
            stack: error.stack,
            userId: user._id,
            consentId
        });
        res.status(500).json({ message: "Server error updating preferences" });
    }
});

module.exports = router;